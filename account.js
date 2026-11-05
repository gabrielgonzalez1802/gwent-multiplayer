const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const mysql = require("mysql2/promise");

const { DB, mysqlOptions } = require("./db-config");
const { LOGIN_TTL_MS, LOGIN_TTL_MIN } = require("./server-config");

const FACTIONS = ["realms", "nilfgaard", "monsters", "scoiatael", "skellige"];

const cardText = fs.readFileSync(path.join(__dirname, "cards.js"), "utf8");
const cards = vm.runInNewContext(cardText + "\ncard_dict;", { JSON: JSON });
const cardByFile = {};
cards.forEach((card, index) => {
  cardByFile[card.filename] = { card: card, index: index };
});

const packPool = [];
cards.forEach((card) => {
  const copies = Number(card.count) || 0;
  if (copies > 0) {
    for (let i = 0; i < copies; i++) packPool.push(card.filename);
  } else if (card.row === "leader") packPool.push(card.filename);
});

function isHero(card) {
  return String(card.ability || "").split(" ").indexOf("hero") !== -1;
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = list[i];
    list[i] = list[j];
    list[j] = swap;
  }
  return list;
}

function weakPool(faction) {
  const units = cards.filter((card) => {
    if (card.row === "leader") return false;
    if (card.deck === "special" || card.deck === "weather") return false;
    if (isHero(card)) return false;
    if (!(Number(card.count) > 0)) return false;
    return card.deck === faction || card.deck === "neutral";
  });
  const factionUnits = units
    .filter((card) => card.deck === faction)
    .sort((a, b) => Number(a.strength) - Number(b.strength) || a.filename.localeCompare(b.filename));
  const neutralUnits = units
    .filter((card) => card.deck === "neutral")
    .sort((a, b) => Number(a.strength) - Number(b.strength) || a.filename.localeCompare(b.filename));
  const ordered = factionUnits.concat(neutralUnits);
  const bands = [];
  let band = [];
  let strength = null;
  ordered.forEach((card) => {
    const value = Number(card.strength);
    if (strength !== null && value !== strength) {
      bands.push(band);
      band = [];
    }
    strength = value;
    band.push(card);
  });
  if (band.length) bands.push(band);
  const pool = [];
  let copies = 0;
  let cap = null;
  for (let i = 0; i < bands.length; i++) {
    const value = Number(bands[i][0].strength);
    if (cap !== null && value > cap + 1) break;
    pool.push.apply(pool, bands[i]);
    copies += bands[i].reduce((sum, card) => sum + Number(card.count), 0);
    if (copies >= 22 && cap === null) cap = value;
  }
  if (copies < 22) throw new Error("starter corto " + faction);
  return pool;
}

function starterCards(faction) {
  const owned = {};
  function add(filename, n) {
    owned[filename] = (owned[filename] || 0) + n;
  }
  const leaders = cards.filter((card) => card.deck === faction && card.row === "leader");
  if (!leaders.length) throw new Error("starter sin lider " + faction);
  add(leaders[Math.floor(Math.random() * leaders.length)].filename, 1);
  const bag = [];
  weakPool(faction).forEach((card) => {
    for (let n = 0; n < Number(card.count); n++) bag.push(card.filename);
  });
  shuffle(bag);
  for (let i = 0; i < 22; i++) add(bag[i], 1);
  return owned;
}

function checkStarters() {
  const seen = {};
  cards.forEach((card) => {
    if (!card.filename || seen[card.filename]) throw new Error("filename repetido " + card.filename);
    seen[card.filename] = true;
  });
  if (!packPool.length) throw new Error("sobre vacio");
  FACTIONS.forEach((faction) => {
    const seen = {};
    let varied = false;
    let first = "";
    for (let roll = 0; roll < 24; roll++) {
      const owned = starterCards(faction);
      let units = 0;
      let leaders = 0;
      let heroes = 0;
      Object.keys(owned).forEach((filename) => {
        const card = cardByFile[filename].card;
        if (card.row === "leader") leaders += owned[filename];
        else units += owned[filename];
        if (isHero(card)) heroes += owned[filename];
        if (card.deck === "special" || card.deck === "weather") heroes = 99;
      });
      const key = JSON.stringify(owned);
      if (!first) first = key;
      else if (key !== first) varied = true;
      if (leaders !== 1 || units !== 22 || heroes !== 0) throw new Error("mazo inicial " + faction);
      seen[key] = true;
    }
    if (!varied || Object.keys(seen).length < 2) throw new Error("mazo inicial fijo " + faction);
  });
}

checkStarters();

let pool = null;
const cpuMatches = new Map();
const rateHits = new Map();

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.trim()) return fwd.split(",")[0].trim().slice(0, 64);
  return String((req.socket && req.socket.remoteAddress) || "").slice(0, 64);
}

// ponytail: anti-bot en memoria. Si el proceso se reinicia, se vacia. Un Redis aguantaria varios nodos.
function tooMany(key, limit, windowMs) {
  const now = Date.now();
  let row = rateHits.get(key);
  if (!row || now - row.t > windowMs) {
    rateHits.set(key, { n: 1, t: now });
    return false;
  }
  row.n += 1;
  return row.n > limit;
}

setInterval(function () {
  const now = Date.now();
  rateHits.forEach(function (row, key) {
    if (now - row.t > 3600000) rateHits.delete(key);
  });
}, 300000).unref();

function randomFilename() {
  return packPool[Math.floor(Math.random() * packPool.length)];
}

function cardRarity(card) {
  if (card.row === "leader") return "leader";
  if (isHero(card)) return "hero";
  if (card.deck === "special" || card.deck === "weather") return "special";
  const str = Number(card.strength) || 0;
  if (str >= 10) return "high";
  if (str >= 7) return "mid";
  return "low";
}

// Probabilidades del sobre (suma 100). Gana/pierde/empate usan las mismas rarezas.
const WIN_RARITY = {
  low: 48,
  mid: 24,
  special: 14,
  high: 8,
  hero: 5,
  leader: 1,
};

const rarityPools = {
  low: [],
  mid: [],
  special: [],
  high: [],
  hero: [],
  leader: [],
};

cards.forEach((card) => {
  const copies = Number(card.count) || 0;
  const n = copies > 0 ? copies : card.row === "leader" ? 1 : 0;
  if (!n) return;
  const rarity = cardRarity(card);
  if (!rarityPools[rarity]) return;
  for (let i = 0; i < n; i++) rarityPools[rarity].push(card.filename);
});

Object.keys(rarityPools).forEach((key) => {
  if (!rarityPools[key].length) throw new Error("rareza vacia " + key);
});

function pickFrom(bag) {
  return bag[Math.floor(Math.random() * bag.length)];
}

function pickWinCard() {
  let total = 0;
  const keys = Object.keys(WIN_RARITY);
  for (let i = 0; i < keys.length; i++) {
    if (rarityPools[keys[i]].length) total += WIN_RARITY[keys[i]];
  }
  if (!total) return randomFilename();
  let roll = Math.random() * total;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!rarityPools[key].length) continue;
    roll -= WIN_RARITY[key];
    if (roll < 0) return pickFrom(rarityPools[key]);
  }
  return pickFrom(rarityPools.low);
}

function rewardFilename() {
  // Gana, pierde y empate usan las mismas rarezas; solo cambia cuantas cartas da el sobre.
  return pickWinCard();
}

// Cartas por sobre al ganar: 1..5 con peso.
const CARDS_PER_PACK_WEIGHTS = [
  [1, 8],
  [2, 22],
  [3, 35],
  [4, 23],
  [5, 12],
];

// Al perder/empatar el sobre (si toca) solo trae 1..2 cartas.
const CARDS_ON_LOSE_WEIGHTS = [
  [1, 70],
  [2, 30],
];

// Sobres al ganar: 1..3 con peso. Pierde/empate: 0 o 1.
const PACKS_ON_WIN_WEIGHTS = [
  [1, 55],
  [2, 30],
  [3, 15],
];

function pickWeightedCount(weights) {
  let total = 0;
  for (let i = 0; i < weights.length; i++) total += weights[i][1];
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i][1];
    if (roll < 0) return weights[i][0];
  }
  return weights[weights.length - 1][0];
}

function cardsPerPack(result) {
  if (result === "lose" || result === "draw") return pickWeightedCount(CARDS_ON_LOSE_WEIGHTS);
  return pickWeightedCount(CARDS_PER_PACK_WEIGHTS);
}

function cpuRewardCount(result) {
  if (result === "win") return pickWeightedCount(PACKS_ON_WIN_WEIGHTS);
  if (result === "lose" || result === "draw") return Math.random() < 0.5 ? 1 : 0;
  return 0;
}

function checkCpuReward() {
  const seenRarity = {};
  for (let i = 0; i < 80; i++) {
    const win = cpuRewardCount("win");
    const lose = cpuRewardCount("lose");
    const winCards = cardsPerPack("win");
    const loseCards = cardsPerPack("lose");
    if (win < 1 || win > 3) throw new Error("cpu premio gana");
    if (lose !== 0 && lose !== 1) throw new Error("cpu premio pierde");
    if (winCards < 1 || winCards > 5) throw new Error("cartas por sobre");
    if (loseCards < 1 || loseCards > 2) throw new Error("cartas pierde");
  }
  for (let i = 0; i < 400; i++) {
    const card = cardByFile[rewardFilename()].card;
    seenRarity[cardRarity(card)] = (seenRarity[cardRarity(card)] || 0) + 1;
  }
  if (!seenRarity.low || !seenRarity.mid || !seenRarity.special) throw new Error("premio rareza");
  if ((seenRarity.hero || 0) + (seenRarity.leader || 0) > seenRarity.low) throw new Error("premio raro");
  if ((seenRarity.leader || 0) > 40) throw new Error("premio lider");
}

checkCpuReward();

async function grantCpuCards(userId, result) {
  const packs = cpuRewardCount(result);
  if (!packs) return { pack: false, n: 0 };
  for (let i = 0; i < packs; i++) {
    const cards = cardsPerPack(result);
    await pool.query("INSERT INTO packs (user_id, opened, n, kind) VALUES (?,0,?,?)", [
      userId,
      cards,
      "full",
    ]);
  }
  return { pack: true, n: packs };
}

function hashPass(password, salt) {
  const useSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, useSalt, 32).toString("hex");
  return { salt: useSalt, hash: hash };
}

function validName(name) {
  return typeof name === "string" && /^[a-zA-Z0-9_]{3,16}$/.test(name);
}

function validPass(password) {
  return typeof password === "string" && password.length >= 4 && password.length <= 64;
}

async function init() {
  const boot = await mysql.createConnection(mysqlOptions(false));
  try {
    try {
      await boot.query(
        "CREATE DATABASE IF NOT EXISTS `" + DB.database + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
      );
    } catch (err) {
      if (!err || (err.errno !== 1044 && err.errno !== 1142)) throw err;
    }
  } finally {
    await boot.end();
  }
  pool = mysql.createPool(Object.assign(mysqlOptions(true), { connectionLimit: 4 }));
  await pool.query(
    "CREATE TABLE IF NOT EXISTS users (" +
      "id INT AUTO_INCREMENT PRIMARY KEY," +
      "name VARCHAR(16) NOT NULL UNIQUE," +
      "pass_hash VARCHAR(64) NOT NULL," +
      "pass_salt VARCHAR(32) NOT NULL," +
      "faction VARCHAR(16) NOT NULL" +
      ") ENGINE=InnoDB",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS login_tokens (" +
      "token VARCHAR(64) PRIMARY KEY," +
      "user_id INT NOT NULL," +
      "seen_at DATETIME NOT NULL," +
      "FOREIGN KEY (user_id) REFERENCES users(id)" +
      ") ENGINE=InnoDB",
  );
  await addTokenColumn("seen_at", "DATETIME NULL");
  await pool.query(
    "UPDATE login_tokens SET seen_at=UTC_TIMESTAMP() WHERE seen_at IS NULL",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS owned (" +
      "user_id INT NOT NULL," +
      "filename VARCHAR(80) NOT NULL," +
      "qty INT NOT NULL," +
      "PRIMARY KEY (user_id, filename)," +
      "FOREIGN KEY (user_id) REFERENCES users(id)" +
      ") ENGINE=InnoDB",
  );
  await pool.query(
    "CREATE TABLE IF NOT EXISTS packs (" +
      "id INT AUTO_INCREMENT PRIMARY KEY," +
      "user_id INT NOT NULL," +
      "opened TINYINT NOT NULL DEFAULT 0," +
      "filename VARCHAR(80) NULL," +
      "n TINYINT NOT NULL DEFAULT 1," +
      "kind VARCHAR(8) NOT NULL DEFAULT 'full'," +
      "FOREIGN KEY (user_id) REFERENCES users(id)" +
      ") ENGINE=InnoDB",
  );
  await addPackColumn("n", "TINYINT NOT NULL DEFAULT 1");
  await addPackColumn("kind", "VARCHAR(8) NOT NULL DEFAULT 'full'");
  console.log("MySQL " + DB.database + " listo");
}

async function addPackColumn(name, def) {
  try {
    await pool.query("ALTER TABLE packs ADD COLUMN " + name + " " + def);
  } catch (err) {
    if (!err || err.code !== "ER_DUP_FIELDNAME") throw err;
  }
}

async function addTokenColumn(name, def) {
  try {
    await pool.query("ALTER TABLE login_tokens ADD COLUMN " + name + " " + def);
  } catch (err) {
    if (!err || err.code !== "ER_DUP_FIELDNAME") throw err;
  }
}

function sweepLoginTokens() {
  if (!pool) return;
  // LOGIN_TTL_MIN ya viene acotado a entero en server-config.
  pool
    .query(
      "DELETE FROM login_tokens WHERE seen_at IS NULL OR seen_at < (UTC_TIMESTAMP() - INTERVAL " +
        LOGIN_TTL_MIN +
        " MINUTE)",
    )
    .catch(function () {});
}

setInterval(sweepLoginTokens, 120000).unref();

function send(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(raw),
  });
  res.end(raw);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 100000) {
        reject(new Error("big"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString() || "{}";
        resolve(JSON.parse(text));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

async function ownedMap(userId) {
  const [rows] = await pool.query("SELECT filename, qty FROM owned WHERE user_id=?", [userId]);
  const map = {};
  rows.forEach((row) => {
    map[row.filename] = row.qty;
  });
  return map;
}

async function packCount(userId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS n FROM packs WHERE user_id=? AND opened=0",
    [userId],
  );
  return rows[0].n;
}

async function publicUser(userId) {
  const [rows] = await pool.query("SELECT id, name, faction FROM users WHERE id=?", [userId]);
  if (!rows.length) return null;
  const user = rows[0];
  user.owned = await ownedMap(userId);
  user.packs = await packCount(userId);
  return user;
}

async function userFromToken(token) {
  if (!token || typeof token !== "string") return null;
  const [rows] = await pool.query(
    "SELECT u.id, u.name, u.faction, t.seen_at FROM login_tokens t JOIN users u ON u.id=t.user_id WHERE t.token=?",
    [token],
  );
  if (!rows.length) return null;
  // DATETIME de MySQL en UTC (UTC_TIMESTAMP). Se interpreta como Z.
  const seenMs = rows[0].seen_at
    ? Date.parse(String(rows[0].seen_at).replace(" ", "T") + "Z")
    : 0;
  if (!Number.isFinite(seenMs) || !seenMs || Date.now() - seenMs > LOGIN_TTL_MS) {
    await pool.query("DELETE FROM login_tokens WHERE token=?", [token]);
    return null;
  }
  await pool.query("UPDATE login_tokens SET seen_at=UTC_TIMESTAMP() WHERE token=?", [token]);
  return { id: rows[0].id, name: rows[0].name, faction: rows[0].faction };
}

// Renueva el login por actividad real (jugadas, chat, etc.). No corta partidas largas.
function bumpLogin(ws) {
  if (!pool || !ws || !ws.userId || !ws.accountToken) return;
  const now = Date.now();
  if (ws._loginBump && now - ws._loginBump < 60000) return;
  ws._loginBump = now;
  pool
    .query("UPDATE login_tokens SET seen_at=UTC_TIMESTAMP() WHERE token=? AND user_id=?", [
      ws.accountToken,
      ws.userId,
    ])
    .catch(function () {});
}

async function giveStarter(conn, userId, faction) {
  const owned = starterCards(faction);
  const files = Object.keys(owned);
  for (let i = 0; i < files.length; i++) {
    await conn.query("INSERT INTO owned (user_id, filename, qty) VALUES (?,?,?)", [
      userId,
      files[i],
      owned[files[i]],
    ]);
  }
}

async function handleHttp(req, res, urlPath) {
  if (!pool) {
    send(res, 503, { error: "db" });
    return;
  }
  try {
    if (req.method === "POST" && urlPath === "/api/register") {
      const ip = clientIp(req);
      if (tooMany("reg:" + ip, 3, 3600000)) {
        send(res, 429, { error: "rate" });
        return;
      }
      const body = await readBody(req);
      if (!validName(body.name) || !validPass(body.password) || FACTIONS.indexOf(body.faction) < 0) {
        send(res, 400, { error: "bad" });
        return;
      }
      // Campo trampa: bots que rellenan todo el formulario.
      if (body.website || body.company || body.hp) {
        send(res, 400, { error: "bad" });
        return;
      }
      const pass = hashPass(body.password);
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [result] = await conn.query(
          "INSERT INTO users (name, pass_hash, pass_salt, faction) VALUES (?,?,?,?)",
          [body.name, pass.hash, pass.salt, body.faction],
        );
        await giveStarter(conn, result.insertId, body.faction);
        const token = crypto.randomBytes(24).toString("hex");
        await conn.query(
          "INSERT INTO login_tokens (token, user_id, seen_at) VALUES (?,?,UTC_TIMESTAMP())",
          [token, result.insertId],
        );
        await conn.commit();
        const user = await publicUser(result.insertId);
        user.token = token;
        send(res, 200, user);
      } catch (err) {
        await conn.rollback();
        if (err && err.code === "ER_DUP_ENTRY") send(res, 409, { error: "taken" });
        else throw err;
      } finally {
        conn.release();
      }
      return;
    }

    if (req.method === "POST" && urlPath === "/api/login") {
      const ip = clientIp(req);
      if (tooMany("login:" + ip, 30, 600000)) {
        send(res, 429, { error: "rate" });
        return;
      }
      const body = await readBody(req);
      const [rows] = await pool.query(
        "SELECT id, pass_hash, pass_salt FROM users WHERE name=?",
        [body.name || ""],
      );
      if (!rows.length) {
        send(res, 401, { error: "bad" });
        return;
      }
      const pass = hashPass(body.password || "", rows[0].pass_salt);
      const known = Buffer.from(rows[0].pass_hash, "hex");
      const got = Buffer.from(pass.hash, "hex");
      if (known.length !== got.length || !crypto.timingSafeEqual(known, got)) {
        if (tooMany("login-bad:" + ip, 8, 600000)) {
          send(res, 429, { error: "rate" });
          return;
        }
        send(res, 401, { error: "bad" });
        return;
      }
      const token = crypto.randomBytes(24).toString("hex");
      await pool.query(
        "INSERT INTO login_tokens (token, user_id, seen_at) VALUES (?,?,UTC_TIMESTAMP())",
        [token, rows[0].id],
      );
      const user = await publicUser(rows[0].id);
      user.token = token;
      send(res, 200, user);
      return;
    }

    if (req.method === "POST" && urlPath === "/api/logout") {
      const token = req.headers["x-token"];
      if (token) await pool.query("DELETE FROM login_tokens WHERE token=?", [token]);
      send(res, 200, {});
      return;
    }

    if (req.method === "GET" && urlPath === "/api/me") {
      const user = await userFromToken(req.headers["x-token"]);
      if (!user) {
        send(res, 401, { error: "auth" });
        return;
      }
      send(res, 200, await publicUser(user.id));
      return;
    }

    if (req.method === "POST" && urlPath === "/api/pack/open") {
      const user = await userFromToken(req.headers["x-token"]);
      if (!user) {
        send(res, 401, { error: "auth" });
        return;
      }
      if (tooMany("pack:" + user.id, 40, 600000) || tooMany("pack-ip:" + clientIp(req), 60, 600000)) {
        send(res, 429, { error: "rate" });
        return;
      }
      const files = await openPack(user.id);
      if (!files) {
        send(res, 404, { error: "empty" });
        return;
      }
      const view = await publicUser(user.id);
      view.filename = files[0];
      view.files = files;
      send(res, 200, view);
      return;
    }

    if (req.method === "POST" && urlPath === "/api/cpu/start") {
      const user = await userFromToken(req.headers["x-token"]);
      if (!user) {
        send(res, 401, { error: "auth" });
        return;
      }
      if (tooMany("cpu-start:" + user.id, 12, 600000)) {
        send(res, 429, { error: "rate" });
        return;
      }
      const body = await readBody(req);
      if (FACTIONS.indexOf(body.me) < 0 || FACTIONS.indexOf(body.op) < 0) {
        send(res, 400, { error: "bad" });
        return;
      }
      const id = crypto.randomBytes(8).toString("hex");
      cpuMatches.set(user.id, { id: id, me: body.me, op: body.op, at: Date.now() });
      send(res, 200, { id: id });
      return;
    }

    if (req.method === "POST" && urlPath === "/api/cpu") {
      const user = await userFromToken(req.headers["x-token"]);
      if (!user) {
        send(res, 401, { error: "auth" });
        return;
      }
      if (tooMany("cpu:" + user.id, 12, 600000)) {
        send(res, 429, { error: "rate" });
        return;
      }
      const body = await readBody(req);
      const match = cpuMatches.get(user.id);
      const rounds = match && match.id === body.id ? cleanRounds(body.rounds) : null;
      const verdict = rounds && verdictFromRounds(rounds, match.me, match.op);
      if (!verdict) {
        send(res, 400, { error: "bad" });
        return;
      }
      // Un premio CPU cada 40s por cuenta: corta el farm de bots sin tocar partidas normales.
      if (tooMany("cpu-prize:" + user.id, 1, 40000)) {
        cpuMatches.delete(user.id);
        send(res, 429, { error: "rate" });
        return;
      }
      cpuMatches.delete(user.id);
      // ponytail: la CPU no se juega aqui. El id cobra una sola vez y el resultado sale de las rondas,
      // pero el unico cliente escribe el marcador. Jugar la partida en el servidor cerraria el hueco.
      const result = verdict === "draw" ? "draw" : verdict === "a" ? "win" : "lose";
      const granted = await grantCpuCards(user.id, result);
      const view = await publicUser(user.id);
      view.pack = granted.pack;
      view.n = granted.n;
      send(res, 200, view);
      return;
    }

    send(res, 404, { error: "no" });
  } catch (err) {
    console.log("api: " + err.message);
    if (!res.headersSent) send(res, 500, { error: "db" });
  }
}

async function openPack(userId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      "SELECT id, n, kind FROM packs WHERE user_id=? AND opened=0 ORDER BY id LIMIT 1 FOR UPDATE",
      [userId],
    );
    if (!rows.length) {
      await conn.rollback();
      return null;
    }
    let n = Number(rows[0].n) || 1;
    if (n < 1) n = 1;
    if (n > 5) n = 5;
    const files = [];
    for (let i = 0; i < n; i++) files.push(rewardFilename("win"));
    await conn.query("UPDATE packs SET opened=1, filename=? WHERE id=?", [files[0], rows[0].id]);
    for (let i = 0; i < files.length; i++) {
      await conn.query(
        "INSERT INTO owned (user_id, filename, qty) VALUES (?,?,1) ON DUPLICATE KEY UPDATE qty=qty+1",
        [userId, files[i]],
      );
    }
    await conn.commit();
    return files;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

function touch(session) {
  if (!session || session.betCards) return;
  session.betCards = {};
  session.betOk = {};
  session.betLocked = false;
  session.played = {};
  session.matchLive = false;
  session.settled = false;
  session.reports = {};
}

function sameSide(a, b) {
  return !!a.userId === !!b.userId;
}

function dropMixed(session) {
  if (!session || session.players.length < 2) return false;
  if (sameSide(session.players[0], session.players[1])) return false;
  const host = session.players[0];
  const joiner = session.players[1];
  session.players = [host];
  joiner.sessionCode = null;
  host.send(JSON.stringify({ type: "sessionMismatch", role: "host" }));
  host.send(JSON.stringify({ type: "sessionUnready" }));
  if (joiner.readyState === 1) joiner.send(JSON.stringify({ type: "sessionMismatch", role: "join" }));
  return true;
}

function bothUsers(session) {
  return !!(
    session &&
    session.players &&
    session.players.length === 2 &&
    session.players.every((player) => player.userId)
  );
}

function stakesMatch(mine, theirs) {
  return mine.length > 0 && mine.length === theirs.length;
}

(function () {
  if (!stakesMatch(["a"], ["b"]) || !stakesMatch(["a", "c"], ["b", "d"])) throw new Error("apuesta pareja");
  if (stakesMatch([], []) || stakesMatch(["a"], []) || stakesMatch(["a"], ["b", "c"])) throw new Error("apuesta pareja");
})();

function sendBet(session) {
  if (!session) return;
  touch(session);
  const players = session.players.map((player) => ({
    playerId: player.playerId,
    name: player.userName || "",
    cards: session.betCards[player.playerId] || [],
    ok: !!session.betOk[player.playerId],
  }));
  const msg = JSON.stringify({
    type: "betState",
    locked: !!session.betLocked,
    live: bothUsers(session),
    players: players,
  });
  session.players.forEach((player) => {
    if (player.readyState === 1) player.send(msg);
  });
}

async function cardsFit(userId, list) {
  const owned = await ownedMap(userId);
  const tally = {};
  for (let i = 0; i < list.length; i++) {
    const filename = list[i];
    if (!cardByFile[filename]) return false;
    tally[filename] = (tally[filename] || 0) + 1;
    if (tally[filename] > (owned[filename] || 0)) return false;
  }
  return true;
}

async function transfer(fromId, toId, files) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < files.length; i++) {
      const [rows] = await conn.query(
        "SELECT qty FROM owned WHERE user_id=? AND filename=? FOR UPDATE",
        [fromId, files[i]],
      );
      if (!rows.length || rows[0].qty < 1) throw new Error("carta ausente");
      await conn.query("UPDATE owned SET qty=qty-1 WHERE user_id=? AND filename=?", [fromId, files[i]]);
      await conn.query("DELETE FROM owned WHERE user_id=? AND filename=? AND qty<=0", [fromId, files[i]]);
      await conn.query(
        "INSERT INTO owned (user_id, filename, qty) VALUES (?,?,1) ON DUPLICATE KEY UPDATE qty=qty+1",
        [toId, files[i]],
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deckOwned(userId, deck) {
  if (!deck || !deck.leader || !deck.leader.filename) return false;
  const owned = await ownedMap(userId);
  if (!(owned[deck.leader.filename] > 0)) return false;
  if (cardByFile[deck.leader.filename].card.row !== "leader") return false;
  const used = {};
  const list = deck.cards || [];
  for (let i = 0; i < list.length; i++) {
    const card = cards[list[i].index];
    const count = Number(list[i].count) || 0;
    if (!card || count < 1 || card.row === "leader") return false;
    used[card.filename] = (used[card.filename] || 0) + count;
  }
  const files = Object.keys(used);
  for (let i = 0; i < files.length; i++) {
    if ((owned[files[i]] || 0) < used[files[i]]) return false;
  }
  return true;
}

// ponytail: el ganador es el que los dos clientes reportan igual. El paso siguiente es contar las jugadas en el servidor.
async function settle(session, kind, winnerId) {
  if (!session || session.settled || !bothUsers(session)) return;
  session.settled = true;
  const notes = {};
  const plain = kind === "dispute" ? "dispute" : kind === "draw" ? "draw" : "none";
  session.players.forEach((player) => {
    notes[player.playerId] = { note: plain, cards: [] };
  });
  if (session.betLocked && winnerId && (kind === "win" || kind === "forfeit")) {
    const winner = session.players.find((player) => player.playerId === winnerId);
    const loser = session.players.find((player) => player.playerId !== winnerId);
    const files = (loser && session.betCards[loser.playerId]) || [];
    try {
      await transfer(loser.userId, winner.userId, files);
      notes[winner.playerId] = { note: kind === "forfeit" ? "forfeit-win" : "won", cards: files };
      notes[loser.playerId] = { note: kind === "forfeit" ? "forfeit-loss" : "lost", cards: files };
    } catch (err) {
      console.log("apuesta: " + err.message);
      session.players.forEach((player) => {
        notes[player.playerId] = { note: "dispute", cards: [] };
      });
    }
  }
  for (let i = 0; i < session.players.length; i++) {
    const player = session.players[i];
    let result = "";
    if (kind === "draw") result = "draw";
    else if ((kind === "win" || kind === "forfeit") && winnerId)
      result = player.playerId === winnerId ? "win" : "lose";
    const granted = result ? await grantCpuCards(player.userId, result) : { pack: false, n: 0 };
    const info = notes[player.playerId];
    if (player.readyState === 1) {
      player.send(
        JSON.stringify({
          type: "rewards",
          note: info.note,
          cards: info.cards,
          pack: granted.pack,
          n: granted.n,
          packs: await packCount(player.userId),
          owned: await ownedMap(player.userId),
        }),
      );
    }
  }
}

async function allowReady(ws, data, sessions) {
  const session = sessions[ws.sessionCode];
  if (!session) return true;
  touch(session);
  if (session.players.length === 2 && !sameSide(session.players[0], session.players[1])) {
    ws.send(JSON.stringify({ type: "readyBlocked", reason: "mix" }));
    return false;
  }
  if (bothUsers(session)) {
    const pending = session.players.some(
      (player) => (session.betCards[player.playerId] || []).length > 0,
    );
    if (pending && !session.betLocked) {
      ws.send(JSON.stringify({ type: "readyBlocked", reason: "bet" }));
      return false;
    }
  }
  if (ws.userId) {
    const ok = await deckOwned(ws.userId, data.deck);
    if (!ok) {
      ws.send(JSON.stringify({ type: "readyBlocked", reason: "deck" }));
      return false;
    }
  }
  if (!session.factions) session.factions = {};
  if (data.deck && typeof data.deck.faction === "string") session.factions[ws.playerId] = data.deck.faction;
  return true;
}

function cleanRounds(raw) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 3) return null;
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const round = raw[i];
    if (!round || typeof round !== "object") return null;
    const me = Math.floor(Number(round.me));
    const op = Math.floor(Number(round.op));
    if (!Number.isFinite(me) || !Number.isFinite(op) || me < 0 || op < 0 || me > 9999 || op > 9999) return null;
    out.push({ me: me, op: op });
  }
  return out;
}

function agreedRounds(left, right) {
  if (!left || !right || left.length !== right.length) return null;
  const out = [];
  for (let i = 0; i < left.length; i++) {
    if (left[i].me !== right[i].op || left[i].op !== right[i].me) return null;
    out.push(left[i]);
  }
  return out;
}

function verdictFromRounds(rounds, factionA, factionB) {
  let healthA = 2;
  let healthB = 2;
  for (let i = 0; i < rounds.length; i++) {
    if (healthA <= 0 || healthB <= 0) return null;
    let dif = rounds[i].me - rounds[i].op;
    if (dif === 0) {
      const nilfA = factionA === "nilfgaard";
      const nilfB = factionB === "nilfgaard";
      if (nilfA !== nilfB) dif = nilfA ? 1 : -1;
    }
    if (dif <= 0) healthA--;
    if (dif >= 0) healthB--;
  }
  if (healthA > 0 && healthB > 0) return null;
  if (healthA <= 0 && healthB <= 0) return "draw";
  return healthB <= 0 ? "a" : "b";
}

(function () {
  const won = verdictFromRounds([{ me: 10, op: 1 }, { me: 4, op: 0 }], "realms", "monsters");
  const tied = verdictFromRounds([{ me: 5, op: 5 }, { me: 5, op: 5 }], "nilfgaard", "realms");
  const drawn = verdictFromRounds([{ me: 3, op: 3 }, { me: 2, op: 2 }], "realms", "realms");
  const short = verdictFromRounds([{ me: 9, op: 0 }], "realms", "realms");
  const same = agreedRounds([{ me: 10, op: 1 }], [{ me: 1, op: 10 }]);
  const clash = agreedRounds([{ me: 10, op: 1 }], [{ me: 0, op: 10 }]);
  if (won !== "a" || tied !== "a" || drawn !== "draw" || short !== null || !same || clash) throw new Error("marcador");
})();

function notePlay(ws, sessions) {
  const session = sessions[ws.sessionCode];
  if (!session || !session.matchLive || !ws.playerId) return;
  touch(session);
  session.played[ws.playerId] = (session.played[ws.playerId] || 0) + 1;
  bumpLogin(ws);
}

function matchBegan(session) {
  if (!session) return;
  touch(session);
  if (session.matchLive) return;
  session.matchLive = true;
}

async function forfeit(session, loserId) {
  if (!session) return;
  touch(session);
  if (session.settled) return;
  if (!session.betLocked) {
    if (session.matchLive) await settle(session, "none", null);
    return;
  }
  const winner = session.players.find((player) => player.playerId !== loserId);
  await settle(session, "forfeit", winner ? winner.playerId : null);
}

async function onSocket(ws, data, sessions) {
  if (!pool) return "relay";
  if (data.type === "auth") {
    const user = await userFromToken(data.token);
    ws.userId = user ? user.id : null;
    ws.userName = user ? user.name : "";
    ws.accountToken = user ? String(data.token || "") : "";
    ws.send(JSON.stringify(user ? { type: "authOk", name: user.name } : { type: "authNo" }));
    if (ws.sessionCode && sessions[ws.sessionCode]) {
      const session = sessions[ws.sessionCode];
      if (!dropMixed(session)) sendBet(session);
    }
    return "done";
  }
  if (ws.userId) bumpLogin(ws);
  if (data.type === "betSet" || data.type === "betOk") {
    const session = sessions[ws.sessionCode];
    if (!session || !ws.userId) return "done";
    touch(session);
    if (!bothUsers(session) || session.betLocked || session.matchLive) return "done";
    if (data.type === "betSet") {
      const list = Array.isArray(data.cards) ? data.cards.map(String).slice(0, 8) : [];
      if (!(await cardsFit(ws.userId, list))) {
        ws.send(JSON.stringify({ type: "betRejected" }));
        return "done";
      }
      session.betCards[ws.playerId] = list;
      session.players.forEach((player) => {
        session.betOk[player.playerId] = false;
      });
      session.betLocked = false;
    } else {
      const mine = session.betCards[ws.playerId] || [];
      const other = session.players.find((player) => player.playerId !== ws.playerId);
      const theirs = (other && session.betCards[other.playerId]) || [];
      if (!stakesMatch(mine, theirs)) {
        ws.send(JSON.stringify({ type: "betRejected", reason: "count", n: theirs.length, cards: theirs }));
        return "done";
      }
      session.betOk[ws.playerId] = true;
      if (session.players.every((player) => session.betOk[player.playerId])) session.betLocked = true;
    }
    sendBet(session);
    return "done";
  }
  if (data.type === "matchResult") {
    const session = sessions[ws.sessionCode];
    if (!session) return "done";
    touch(session);
    if (!session.matchLive || session.settled) return "done";
    const rounds = cleanRounds(data.rounds);
    if (!rounds) return "done";
    session.reports[ws.playerId] = rounds;
    if (session.players.some((player) => !session.reports[player.playerId])) return "done";
    const a = session.players[0];
    const b = session.players[1];
    const agreed = agreedRounds(session.reports[a.playerId], session.reports[b.playerId]);
    const factions = session.factions || {};
    const verdict = agreed && verdictFromRounds(agreed, factions[a.playerId], factions[b.playerId]);
    if (verdict === "draw") await settle(session, "draw", null);
    else if (verdict === "a") await settle(session, "win", a.playerId);
    else if (verdict === "b") await settle(session, "win", b.playerId);
    else await settle(session, "dispute", null);
    return "done";
  }
  return "relay";
}

module.exports = {
  init: init,
  handleHttp: handleHttp,
  onSocket: onSocket,
  allowReady: allowReady,
  notePlay: notePlay,
  bumpLogin: bumpLogin,
  matchBegan: matchBegan,
  forfeit: forfeit,
  sendBet: sendBet,
  touch: touch,
  sameSide: sameSide,
  starterCards: starterCards,
  cpuRewardCount: cpuRewardCount,
};
