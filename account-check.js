const http = require("http");
const WebSocket = require("ws");
const mysql = require("mysql2/promise");

const port = Number(process.argv[2] || 5532);
const base = "http://127.0.0.1:" + port;
const stamp = String(Date.now()).slice(-8);

function post(path, body, token) {
  const data = JSON.stringify(body || {});
  return new Promise((resolve, reject) => {
    const req = http.request(
      base + path,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
          "X-Token": token || "",
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(raw || "{}") }));
      },
    );
    req.on("error", reject);
    req.end(data);
  });
}

function openSocket() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket("ws://127.0.0.1:" + port);
    ws.inbox = [];
    ws.on("message", (raw) => ws.inbox.push(JSON.parse(raw)));
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

function waitFor(ws, pred) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("sin mensaje")), 4000);
    (function peek() {
      const index = ws.inbox.findIndex(pred);
      if (index >= 0) {
        clearTimeout(timer);
        resolve(ws.inbox.splice(index, 1)[0]);
        return;
      }
      setTimeout(peek, 20);
    })();
  });
}

function unitFile(owned) {
  return Object.keys(owned).find((filename) => !/foltest|emhyr|eredin|francesca|crach|bran/.test(filename));
}

async function main() {
  const a = await post("/api/register", { name: "ga" + stamp, password: "test1234", faction: "realms" });
  const b = await post("/api/register", { name: "gb" + stamp, password: "test1234", faction: "nilfgaard" });
  if (a.status !== 200 || b.status !== 200) throw new Error("registro " + a.status + " " + b.status);
  const cardA = unitFile(a.body.owned);
  const cardB = unitFile(b.body.owned);
  const sa = await openSocket();
  const sb = await openSocket();
  sa.send(JSON.stringify({ type: "connect" }));
  sb.send(JSON.stringify({ type: "connect" }));
  await waitFor(sa, (m) => m.type === "welcome");
  await waitFor(sb, (m) => m.type === "welcome");
  sa.send(JSON.stringify({ type: "auth", token: a.body.token }));
  sb.send(JSON.stringify({ type: "auth", token: b.body.token }));
  await waitFor(sa, (m) => m.type === "authOk");
  await waitFor(sb, (m) => m.type === "authOk");
  sa.send(JSON.stringify({ type: "createSession" }));
  const created = await waitFor(sa, (m) => m.type === "sessionCreated");
  sb.send(JSON.stringify({ type: "joinSession", code: created.code }));
  await waitFor(sa, (m) => m.type === "sessionReady");
  sa.send(JSON.stringify({ type: "betSet", cards: [cardA] }));
  sb.send(JSON.stringify({ type: "betSet", cards: [cardB] }));
  await waitFor(sa, (m) => m.type === "betState" && (m.players[0].cards.length + m.players[1].cards.length) === 2);
  sa.send(JSON.stringify({ type: "betOk" }));
  sb.send(JSON.stringify({ type: "betOk" }));
  const locked = await waitFor(sa, (m) => m.type === "betState" && m.locked);
  if (!locked.locked) throw new Error("apuesta abierta");
  sa.send(JSON.stringify({ type: "gameStart" }));
  sa.send(JSON.stringify({ type: "play" }));
  sb.send(JSON.stringify({ type: "pass" }));
  sa.send(JSON.stringify({ type: "matchResult", rounds: [{ me: 10, op: 0 }, { me: 8, op: 1 }] }));
  sb.send(JSON.stringify({ type: "matchResult", rounds: [{ me: 0, op: 10 }, { me: 1, op: 8 }] }));
  const rewardA = await waitFor(sa, (m) => m.type === "rewards");
  const rewardB = await waitFor(sb, (m) => m.type === "rewards");
  if (!rewardA.pack || rewardB.pack) throw new Error("sobre mal repartido");
  if (rewardA.note !== "won" || rewardA.cards[0] !== cardB) throw new Error("no gano la carta");
  if ((rewardA.owned[cardB] || 0) < 1) throw new Error("la carta no entro");
  if (rewardB.owned[cardB]) throw new Error("el perdedor conservo la carta");
  if ((rewardA.owned[cardA] || 0) < 1) throw new Error("el ganador perdio su carta");
  const opened = await post("/api/pack/open", {}, a.body.token);
  if (opened.status !== 200 || !opened.body.filename) throw new Error("sobre cerrado");
  const started = await post("/api/cpu/start", { me: "realms", op: "monsters" }, a.body.token);
  if (started.status !== 200 || !started.body.id) throw new Error("cpu sin id");
  const bare = await post("/api/cpu", { result: "win" }, a.body.token);
  if (bare.status === 200) throw new Error("cpu creyo la palabra");
  const paid = await post("/api/cpu", {
    id: started.body.id,
    rounds: [{ me: 10, op: 0 }, { me: 9, op: 1 }],
  }, a.body.token);
  if (paid.status !== 200 || !paid.body.pack) throw new Error("cpu sin sobre");
  const again = await post("/api/cpu", {
    id: started.body.id,
    rounds: [{ me: 10, op: 0 }, { me: 9, op: 1 }],
  }, a.body.token);
  if (again.status === 200) throw new Error("cpu cobro dos veces");
  sa.close();
  sb.close();
  const db = await mysql.createConnection({ host: "localhost", user: "root", password: "", database: "gwent" });
  await db.query("DELETE packs FROM packs JOIN users ON users.id=packs.user_id WHERE users.name IN (?,?)", ["ga" + stamp, "gb" + stamp]);
  await db.query("DELETE owned FROM owned JOIN users ON users.id=owned.user_id WHERE users.name IN (?,?)", ["ga" + stamp, "gb" + stamp]);
  await db.query("DELETE login_tokens FROM login_tokens JOIN users ON users.id=login_tokens.user_id WHERE users.name IN (?,?)", ["ga" + stamp, "gb" + stamp]);
  await db.query("DELETE FROM users WHERE name IN (?,?)", ["ga" + stamp, "gb" + stamp]);
  await db.end();
  console.log("account check ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
