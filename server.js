const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const account = require("./account");
const { MAX_SESSIONS, LOBBY_IDLE_MS } = require("./server-config");
const WS_HOST = "0.0.0.0";
const WS_PORT = process.env.PORT || 8080;
const root = __dirname;
const fileTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

const httpServer = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/api/wire") {
    handleWire(req, res);
    return;
  }
  if (urlPath.startsWith("/api/")) {
    account.handleHttp(req, res, urlPath);
    return;
  }
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(root, urlPath));
  if (file !== root && !file.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("no");
      return;
    }
    res.writeHead(200, {
      "Content-Type": fileTypes[path.extname(file)] || "application/octet-stream",
    });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server: httpServer });

let sessions = {};
let players = [];
let httpLinks = {};
let disconnectedPlayers = {}; // { [playerId]: { code, timeoutId } }
let expiredPlayers = {}; // { [playerId]: timestamp }

const EXPIRED_MS = 10 * 60 * 1000;

function markExpired(session) {
  const now = Date.now();
  Object.keys(expiredPlayers).forEach((id) => {
    if (now - expiredPlayers[id] > EXPIRED_MS) delete expiredPlayers[id];
  });
  if (!session) return;
  session.players.forEach((player) => {
    if (player.playerId) expiredPlayers[player.playerId] = now;
  });
}

function takeExpired(playerId) {
  if (!playerId || !expiredPlayers[playerId]) return false;
  delete expiredPlayers[playerId];
  return true;
}

(function () {
  expiredPlayers.__t = Date.now();
  if (!takeExpired("__t") || takeExpired("__t")) throw new Error("sesion vencida");
})();

// Helper function to generate a random character sequence
function cleanRules(raw) {
  const out = {
    minUnits: 22,
    maxUnits: null,
    maxDeck: null,
    maxSpecial: 10,
    maxHeroes: null,
    maxSpies: null,
    maxStrength: null,
    maxWeather: null,
  };
  if (!raw || typeof raw !== "object") return out;
  Object.keys(out).forEach((key) => {
    if (raw[key] == null) return;
    const n = Math.floor(Number(raw[key]));
    if (Number.isFinite(n) && n >= 0 && n <= 400) out[key] = n;
  });
  return out;
}
(function () {
  const sample = cleanRules({ minUnits: 10, maxHeroes: 1, maxWeather: 0, junk: 9 });
  if (sample.minUnits !== 10 || sample.maxHeroes !== 1 || sample.maxWeather !== 0 || sample.maxSpecial !== 10)
    throw new Error("reglas");
})();

function pushRules(session, except) {
  if (!session || !session.rules) return;
  const msg = JSON.stringify({ type: "sessionRules", custom: !!session.custom, rules: session.rules });
  session.players.forEach((player) => {
    if (player !== except && player.readyState === 1) player.send(msg);
  });
}

const TURN_MS = 60000;

function touchLobby(session) {
  if (session) session.idleAt = Date.now();
}

function clearDisconnectTimers(code) {
  Object.keys(disconnectedPlayers).forEach((pid) => {
    if (disconnectedPlayers[pid].code !== code) return;
    clearTimeout(disconnectedPlayers[pid].timeoutId);
    delete disconnectedPlayers[pid];
  });
}

// Cierra la sala, avisa a los demas y libera el cupo.
async function closeSession(code, except, reason) {
  const session = sessions[code];
  if (!session) return;
  clearMatchTimers(session);
  clearDisconnectTimers(code);
  const msg = JSON.stringify({
    type: reason === "expired" ? "sessionExpired" : "sessionDeleted",
  });
  session.players.forEach((player) => {
    if (player !== except && player.readyState === 1) player.send(msg);
    player.sessionCode = null;
  });
  if (except) except.sessionCode = null;
  delete sessions[code];
  console.log("# Session " + code + " closed" + (reason ? ": " + reason : ""));
}

async function leaveCurrentRoom(ws, reason) {
  const code = ws.sessionCode;
  if (!code || !sessions[code]) {
    ws.sessionCode = null;
    return;
  }
  const session = sessions[code];
  const host = session.players[0] === ws;
  if (host || session.players.length <= 1) {
    try {
      await account.forfeit(session, ws.playerId);
    } catch (err) {}
    await closeSession(code, ws, reason || "left");
    return;
  }
  try {
    await account.forfeit(session, ws.playerId);
  } catch (err) {}
  session.players = session.players.filter((player) => player !== ws);
  ws.sessionCode = null;
  touchLobby(session);
  const other = session.players[0];
  if (other && other.readyState === 1) {
    other.send(JSON.stringify({ type: "sessionUnready" }));
    if (session.matchLive) other.send(JSON.stringify({ type: "sessionDeleted" }));
  }
  if (!session.players.length) await closeSession(code, null, "empty");
  else if (session.matchLive) await closeSession(code, null, "match-left");
}

async function kickDuplicateUser(ws) {
  if (!ws || !ws.userId) return;
  const codes = Object.keys(sessions);
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    const session = sessions[code];
    if (!session) continue;
    const twins = session.players.filter(function (player) {
      return player !== ws && player.userId === ws.userId;
    });
    if (!twins.length) continue;
    const wasLive = !!session.matchLive;
    for (let t = 0; t < twins.length; t++) {
      const other = twins[t];
      try {
        await account.forfeit(session, other.playerId);
      } catch (err) {}
      if (other.readyState === 1) {
        other.send(JSON.stringify({ type: "sessionDeleted" }));
      }
      other.sessionCode = null;
    }
    session.players = session.players.filter(function (player) {
      return player === ws || player.userId !== ws.userId;
    });
    if (!session.players.length) {
      clearMatchTimers(session);
      clearDisconnectTimers(code);
      delete sessions[code];
      console.log("# Session " + code + " closed: login duplicado");
    } else if (wasLive) {
      await closeSession(code, ws.sessionCode === code ? ws : null, "login-dup");
    } else if (ws.sessionCode === code) {
      touchLobby(session);
    } else if (session.players.length === 1 && session.players[0].readyState === 1) {
      session.players[0].send(JSON.stringify({ type: "sessionUnready" }));
      touchLobby(session);
    }
  }
  if (ws.sessionCode && sessions[ws.sessionCode]) return;
  ws.sessionCode = null;
}

function pruneIdleLobbies() {
  const now = Date.now();
  Object.keys(sessions).forEach((code) => {
    const session = sessions[code];
    if (!session || session.matchLive) return;
    const idleAt = session.idleAt || now;
    if (now - idleAt < LOBBY_IDLE_MS) return;
    closeSession(code, null, "expired");
  });
}

function clearMatchTimers(session) {
  if (!session) return;
  if (session.turnTimer) clearTimeout(session.turnTimer);
  if (session.redrawTimer) clearTimeout(session.redrawTimer);
  session.turnTimer = null;
  session.redrawTimer = null;
}

setInterval(pruneIdleLobbies, 60000).unref();

function markRedraw(session, playerId) {
  if (!session.redrawDone) session.redrawDone = {};
  if (session.redrawDone[playerId]) return false;
  session.redrawDone[playerId] = true;
  return true;
}

(function () {
  const sample = {};
  if (!markRedraw(sample, "a") || markRedraw(sample, "a") || !markRedraw(sample, "b")) throw new Error("redraw");
})();

function sendStart(session) {
  if (!session || session.started) return;
  session.started = true;
  if (session.redrawTimer) clearTimeout(session.redrawTimer);
  session.redrawTimer = null;
  session.players.forEach((player) => {
    if (player.readyState === 1) player.send(JSON.stringify({ type: "start" }));
  });
}

function forceRedraw(session) {
  if (!session || session.started) return;
  session.redrawTimer = null;
  session.players.forEach((player) => {
    if (!markRedraw(session, player.playerId)) return;
    if (player.readyState === 1) player.send(JSON.stringify({ type: "redrawTimeout" }));
  });
  if (Object.keys(session.redrawDone).length >= 2) sendStart(session);
}

function beginTurn(session, playerId) {
  if (!session || !playerId) return;
  if (session.turnTimer) clearTimeout(session.turnTimer);
  session.turnPlayer = playerId;
  session.turnTimer = setTimeout(() => {
    if (!sessions[session.code] || session.turnPlayer !== playerId) return;
    session.turnPlayer = null;
    session.turnTimer = null;
    const msg = JSON.stringify({ type: "forcedPass", player: playerId });
    session.players.forEach((player) => {
      if (player.readyState === 1) player.send(msg);
    });
  }, TURN_MS);
}

function armRedraw(session) {
  if (!session || session.redrawTimer || session.started) return;
  session.redrawTimer = setTimeout(() => {
    if (!sessions[session.code]) return;
    forceRedraw(session);
  }, TURN_MS);
}

function generateCode(length = 4) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// How long to wait for reconnection before deleting session (ms).
// Match client's reconnect attempts: 5 attempts * 3000ms = 15000ms; give a small buffer.
const RECONNECT_WAIT_MS = 20000;

account.init().catch((err) => console.log("MySQL: " + err.message));

httpServer.listen(WS_PORT, WS_HOST, () => {
  console.log("## Server is up and running ##");
  console.log("http://127.0.0.1:" + WS_PORT);
});

async function onPlayerMessage(ws, message) {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      return;
    }
    try {
    if ((await account.onSocket(ws, data, sessions)) === "done") {
      // Misma cuenta en otro asiento: cierra esa sala y deja esta conexion limpia.
      if (data.type === "auth" && ws.userId) await kickDuplicateUser(ws);
      return;
    }

    if (data.type === "connect") {
      ws.playerId = data?.id ?? generateCode(6);

      // If data.id is provided, check for existing player and replace it
      if (data?.id) {
        const existingIdx = players.findIndex((p) => p.playerId === data.id);
        if (existingIdx !== -1) {
          players[existingIdx] = ws;
        } else {
          players.push(ws);
        }
      } else {
        players.push(ws);
      }

      console.log(`# Player ${ws.playerId} connected`);
      ws.send(JSON.stringify({ type: "welcome", playerId: ws.playerId }));

      // If this player was previously disconnected, restore session
      const d = disconnectedPlayers[ws.playerId];
      if (d) {
        clearTimeout(d.timeoutId);
        delete disconnectedPlayers[ws.playerId];

        const session = sessions[d.code];
        if (session) {
          takeExpired(ws.playerId);
          // replace the old socket placeholder (if present) with this ws
          const idx = session.players.findIndex(
            (p) => p.playerId === ws.playerId,
          );
          if (idx !== -1) {
            session.players[idx] = ws;
          } else {
            // if old socket reference gone, push if there's space
            if (session.players.length < 2) session.players.push(ws);
          }
          ws.sessionCode = d.code;
          session.players.forEach((player) => {
            if (player !== ws && player.readyState === 1) {
              player.send(JSON.stringify({ type: "opponentBack" }));
            }
          });
          console.log(
            `# Player ${ws.playerId} reconnected to Session ${d.code}`,
          );
          const host = session.players[0] === ws;
          ws.send(JSON.stringify({
            type: "sessionRestored",
            code: d.code,
            host: host,
            live: !!session.matchLive,
          }));
          if (session.rules) {
            ws.send(JSON.stringify({
              type: "sessionRules",
              custom: !!session.custom,
              rules: session.rules,
            }));
          }
          account.sendBet(session);
        } else if (takeExpired(ws.playerId)) {
          ws.send(JSON.stringify({ type: "sessionExpired" }));
        } else {
          ws.send(JSON.stringify({ type: "sessionGone" }));
        }
      } else if (takeExpired(ws.playerId)) {
        ws.send(JSON.stringify({ type: "sessionExpired" }));
      } else if (data?.id) {
        if (!takeHttpSeat(ws)) ws.send(JSON.stringify({ type: "sessionGone" }));
      }

      return;
    }

    if (data.type === "createSession") {
      pruneIdleLobbies();
      // Si ya estaba en una sala, la cierra antes de crear otra.
      if (ws.sessionCode) await leaveCurrentRoom(ws, "recreate");
      if (Object.keys(sessions).length >= MAX_SESSIONS) {
        ws.send(JSON.stringify({ type: "sessionFull", max: MAX_SESSIONS }));
        return;
      }
      const sessionCode = generateCode();
      sessions[sessionCode] = {
        players: [ws],
        code: sessionCode,
        playersReady: 0,
        custom: !!data.custom,
        rules: cleanRules(data.rules),
        idleAt: Date.now(),
      };
      account.touch(sessions[sessionCode]);
      ws.sessionCode = sessionCode;
      ws.send(JSON.stringify({ type: "sessionCreated", code: sessionCode }));
      console.log(`# Player ${ws.playerId} created Session ${sessionCode}`);

      ws.send(JSON.stringify({ type: "sessionJoined", code: sessionCode }));
      account.sendBet(sessions[sessionCode]);
      return;
    }

    if (data.type === "setRules") {
      const session = sessions[ws.sessionCode];
      if (!session || session.players[0] !== ws) return;
      session.custom = !!data.custom;
      session.rules = cleanRules(data.rules);
      pushRules(session, ws);
      return;
    }

    if (data.type === "cancelSession") {
      const sessionCode = data.code || ws.sessionCode;
      if (!sessionCode || !sessions[sessionCode]) {
        ws.sessionCode = null;
        return;
      }
      console.log(`# Player ${ws.playerId} cancelled Session ${sessionCode}`);
      try {
        await account.forfeit(sessions[sessionCode], ws.playerId);
      } catch (err) {}
      await closeSession(sessionCode, ws, "cancel");
      return;
    }

    if (data.type === "leaveSession") {
      console.log(`# Player ${ws.playerId} left Session ${data.code || ws.sessionCode}`);
      await leaveCurrentRoom(ws, "leave");
      return;
    }

    if (data.type === "joinSession") {
      if (ws.sessionCode) await leaveCurrentRoom(ws, "rejoin");
      const sessionCode = String(data.code || "").trim().toUpperCase();
      if (sessions[sessionCode] && sessions[sessionCode].players.length === 1) {
        const host = sessions[sessionCode].players[0];
        if (!account.sameSide(host, ws)) {
          ws.send(JSON.stringify({ type: "sessionMismatch", role: "join" }));
          if (host.readyState === 1) host.send(JSON.stringify({ type: "sessionMismatch", role: "host" }));
          console.log(`# Player ${ws.playerId} blocked from Session ${sessionCode}: cuenta distinta`);
          return;
        }
        sessions[sessionCode].players.push(ws);
        ws.sessionCode = sessionCode;
        touchLobby(sessions[sessionCode]);
        ws.send(JSON.stringify({ type: "sessionJoined", code: sessionCode }));
        console.log(`# Player ${ws.playerId} joined Session ${sessionCode}`);

        sessions[sessionCode].players.forEach((player, index) => {
          player.send(
            JSON.stringify({ type: "sessionReady", player: index + 1 }),
          );
        });
        account.touch(sessions[sessionCode]);
        account.sendBet(sessions[sessionCode]);
        pushRules(sessions[sessionCode], host);
      } else {
        ws.send(JSON.stringify({ type: "sessionInvalid" }));
        console.log(
          `# Player ${ws.playerId} attempted to join invalid Session ${sessionCode}`,
        );
      }
      return;
    }

    if (data.type === "gameStart") {
      if (ws.sessionCode && sessions[ws.sessionCode]) {
        const session = sessions[ws.sessionCode];
        touchLobby(session);
        account.matchBegan(session);
        // A rematch reuses the same room. Without this, sendStart stays blocked after the first game.
        clearMatchTimers(session);
        session.started = false;
        session.redrawDone = {};
        session.firstPlayer =
          session.players[Math.floor(Math.random() * session.players.length)]
            .playerId;
        console.log("firstPlayer = ", session.firstPlayer);

        session.players.forEach((player) => {
          player.send(
            JSON.stringify({
              type: "coinToss",
              player: session.firstPlayer,
            }),
          );
        });
      }
      return;
    }

    if (data.type === "redrawClock" && ws.sessionCode && sessions[ws.sessionCode]) {
      armRedraw(sessions[ws.sessionCode]);
      return;
    }

    if (data.type === "clock" && ws.sessionCode && sessions[ws.sessionCode]) {
      const session = sessions[ws.sessionCode];
      const other = session.players.find((player) => player !== ws);
      const who = data.opp && other ? other.playerId : ws.playerId;
      if (who && !(session.turnPlayer === who && session.turnTimer)) beginTurn(session, who);
      return;
    }

    if (data.type === "finished_redraw") {
      if (ws.sessionCode && sessions[ws.sessionCode]) {
        const session = sessions[ws.sessionCode];
        if (markRedraw(session, ws.playerId)) {
          console.log(
            `# Players ready in session ${ws.sessionCode}: ${Object.keys(session.redrawDone).length}`,
          );
        }
        if (Object.keys(session.redrawDone).length >= 2) sendStart(session);
      }
      return;
    }

    if ((data.type === "play" || data.type === "pass") && ws.sessionCode && sessions[ws.sessionCode]) {
      const session = sessions[ws.sessionCode];
      if (session.turnPlayer === ws.playerId) {
        clearTimeout(session.turnTimer);
        session.turnTimer = null;
        session.turnPlayer = null;
      }
    }

    if (data.type === "unReady" && ws.sessionCode && sessions[ws.sessionCode]) {
      sessions[ws.sessionCode].matchLive = false;
      touchLobby(sessions[ws.sessionCode]);
    }
    if (ws.sessionCode && sessions[ws.sessionCode]) touchLobby(sessions[ws.sessionCode]);
    if (data.type === "play" || data.type === "pass" || data.type === "chat" || data.type === "useLeader")
      account.bumpLogin(ws);
    if (data.type === "play" || data.type === "useLeader") account.notePlay(ws, sessions);
    if (data.type === "ready" && !(await account.allowReady(ws, data, sessions))) return;
    if (data.type === "ready") ws.send(JSON.stringify({ type: "readyAck" }));

    // Relay messages to the other player in the same session
    if (ws.sessionCode) {
      const sessionPlayers = sessions[ws.sessionCode]?.players || [];
      sessionPlayers.forEach((player) => {
        // readyState 1 = OPEN for ws and for /api/wire links
        if (player !== ws && player.readyState === 1) {
          player.send(JSON.stringify(data));
        }
      });
    }
    } catch (err) {
      console.log("message: " + err.message);
    }
}

function onPlayerClose(ws) {
  if (ws._gone) return;
  ws._gone = true;
  if (ws.http) ws.readyState = 3;
  if (!ws.playerId) return;
    console.log(`# Player ${ws.playerId} disconnected`);

    if (ws.sessionCode && sessions[ws.sessionCode]) {
      const session = sessions[ws.sessionCode];
      // mark disconnected and wait for reconnection
      const timeoutId = setTimeout(() => {
        const loserId = ws.playerId;
        const code = ws.sessionCode;
        if (!disconnectedPlayers[loserId] || !sessions[code]) return;
        const sess = sessions[code];
        Promise.resolve(account.forfeit(sess, loserId)).finally(() => {
          if (!sessions[code]) return;
          markExpired(sess);
          const other = sess.players.find((p) => p.playerId !== loserId);
          if (other && other.readyState === WebSocket.OPEN) {
            other.send(JSON.stringify({ type: "sessionDeleted" }));
            takeExpired(other.playerId);
          }
          clearMatchTimers(sess);
          console.log(`# Session ${code} deleted due to no reconnection`);
          Object.keys(disconnectedPlayers).forEach((pid) => {
            if (disconnectedPlayers[pid].code === code) {
              clearTimeout(disconnectedPlayers[pid].timeoutId);
              delete disconnectedPlayers[pid];
            }
          });
          delete sessions[code];
        });
      }, RECONNECT_WAIT_MS);

      disconnectedPlayers[ws.playerId] = { code: ws.sessionCode, timeoutId };

      // Notify the other player
      const otherPlayer = session.players.find((p) => p !== ws);
      if (otherPlayer && otherPlayer.readyState === WebSocket.OPEN) {
        otherPlayer.send(
          JSON.stringify({
            type: "opponentDisconnected",
            playerId: ws.playerId,
            wait: RECONNECT_WAIT_MS,
          }),
        );
        otherPlayer.send(JSON.stringify({ type: "sessionUnready" }));
      }

      console.log(
        `# Player ${ws.playerId} disconnected from Session ${ws.sessionCode}. Waiting for reconnection...`,
      );
    }

    players = players.filter((player) => player !== ws);
}

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    onPlayerMessage(ws, message);
  });
  ws.on("close", () => onPlayerClose(ws));
});

// ponytail: al recargar, el aviso de cierre puede llegar despues del connect nuevo. Si el asiento viejo ya no es un socket vivo, lo toma este.
function takeHttpSeat(ws) {
  const codes = Object.keys(sessions);
  for (let i = 0; i < codes.length; i++) {
    const session = sessions[codes[i]];
    if (!session || !session.players) continue;
    const idx = session.players.findIndex(
      (player) => player && player.playerId === ws.playerId && player !== ws && (player.http || player.readyState !== 1),
    );
    if (idx === -1) continue;
    const old = session.players[idx];
    session.players[idx] = ws;
    ws.sessionCode = codes[i];
    if (old && old !== ws) {
      old.sessionCode = null;
      if (old.http) old.readyState = 3;
    }
    ws.send(JSON.stringify({
      type: "sessionRestored",
      code: codes[i],
      host: session.players[0] === ws,
      live: !!session.matchLive,
    }));
    if (session.rules) {
      ws.send(JSON.stringify({
        type: "sessionRules",
        custom: !!session.custom,
        rules: session.rules,
      }));
    }
    account.sendBet(session);
    return true;
  }
  return false;
}

function takeWire(link) {
  return link.box.splice(0);
}

function makeHttpLink(id) {
  return {
    readyState: 1,
    http: true,
    wireId: id,
    box: [],
    wait: null,
    busy: false,
    seen: Date.now(),
    playerId: null,
    sessionCode: null,
    userId: null,
    send(text) {
      if (this.readyState !== 1) return;
      this.box.push(String(text));
      if (this.wait && !this.busy) this.wait();
    },
  };
}

(function () {
  const link = makeHttpLink("abc12345abc12345");
  let wakes = 0;
  link.busy = true;
  link.wait = () => {
    wakes += 1;
  };
  link.send('{"type":"a"}');
  link.send('{"type":"b"}');
  if (wakes !== 0 || link.box.length !== 2 || link.readyState !== 1) throw new Error("wire");
  link.busy = false;
  link.wait = () => {
    wakes += 1;
    link.wait = null;
    takeWire(link);
  };
  link.send('{"type":"c"}');
  if (wakes !== 1 || link.box.length !== 0) throw new Error("wire");
})();

function writeJson(res, code, body) {
  if (res.writableEnded) return;
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1e6) {
        reject(new Error("grande"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function readWireId(value) {
  const id = String(value || "");
  return /^[a-z0-9]{8,32}$/.test(id) ? id : "";
}

function armHold(link, res) {
  const timer = setTimeout(finish, 15000);
  function finish() {
    if (link.wait !== finish) return;
    link.wait = null;
    clearTimeout(timer);
    link.seen = Date.now();
    try {
      writeJson(res, 200, { events: takeWire(link) });
    } catch (err) {}
  }
  link.wait = finish;
  res.on("close", () => {
    if (link.wait !== finish) return;
    link.wait = null;
    clearTimeout(timer);
  });
}

// ponytail: el hosting compartido tira el header Upgrade, asi que /api/wire lleva el mismo JSON.
// El socket sigue igual cuando el handshake responde 101. Si el aviso de cierre no sale, a los 45s cuenta como desconexion y despues corren los 20s de siempre.
async function handleWire(req, res) {
  try {
    if (req.method === "GET") {
      const id = readWireId(new URLSearchParams(req.url.split("?")[1] || "").get("id"));
      const link = id && httpLinks[id];
      if (!link) {
        writeJson(res, 200, { events: [], gone: true });
        return;
      }
      if (link.readyState !== 1) {
        writeJson(res, 200, { events: [] });
        return;
      }
      link.seen = Date.now();
      if (link.box.length) {
        writeJson(res, 200, { events: takeWire(link) });
        return;
      }
      armHold(link, res);
      return;
    }
    if (req.method !== "POST") {
      writeJson(res, 405, { error: "method" });
      return;
    }
    const body = JSON.parse((await readBody(req)) || "{}");
    const id = readWireId(body.id);
    if (!id) {
      writeJson(res, 400, { error: "id" });
      return;
    }
    if (body.bye) {
      const link = httpLinks[id];
      if (link) {
        delete httpLinks[id];
        onPlayerClose(link);
      }
      writeJson(res, 200, { events: [] });
      return;
    }
    let link = httpLinks[id];
    if (!link || link.readyState !== 1) {
      link = makeHttpLink(id);
      httpLinks[id] = link;
    }
    link.seen = Date.now();
    link.busy = true;
    try {
      if (body.msg && typeof body.msg === "object") await onPlayerMessage(link, JSON.stringify(body.msg));
    } finally {
      link.busy = false;
    }
    writeJson(res, 200, { events: takeWire(link) });
  } catch (err) {
    console.log("wire: " + err.message);
    if (!res.writableEnded) writeJson(res, 500, { error: "wire" });
  }
}

setInterval(() => {
  const now = Date.now();
  Object.keys(httpLinks).forEach((id) => {
    const link = httpLinks[id];
    if (!link || link.wait || link.busy) return;
    if (now - link.seen < 45000) return;
    delete httpLinks[id];
    onPlayerClose(link);
  });
}, 4000);

console.log("Waiting for the port...");
