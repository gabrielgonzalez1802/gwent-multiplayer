const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const account = require("./account");
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
let disconnectedPlayers = {}; // { [playerId]: { code, timeoutId } }

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

wss.on("connection", (ws) => {
  ws.on("message", async (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      return;
    }
    try {
    if ((await account.onSocket(ws, data, sessions)) === "done") return;

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
          console.log(
            `# Player ${ws.playerId} reconnected to Session ${d.code}`,
          );
        }
      }

      return;
    }

    if (data.type === "createSession") {
      const sessionCode = generateCode();
      sessions[sessionCode] = {
        players: [ws],
        code: sessionCode,
        playersReady: 0,
        custom: !!data.custom,
        rules: cleanRules(data.rules),
      };
      account.touch(sessions[sessionCode]);
      ws.sessionCode = sessionCode;
      ws.send(JSON.stringify({ type: "sessionCreated", code: sessionCode }));
      console.log(`# Player ${ws.playerId} created Session ${sessionCode}`);

      ws.send(JSON.stringify({ type: "sessionJoined", code: sessionCode }));
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
      const sessionCode = data.code;
      if (!sessions[sessionCode]) return;

      console.log(`# Player ${ws.playerId} cancelled Session ${sessionCode}`);
      await account.forfeit(sessions[sessionCode], ws.playerId);
      // clear any pending reconnect timers for that session
      Object.keys(disconnectedPlayers).forEach((pid) => {
        if (disconnectedPlayers[pid].code === sessionCode) {
          clearTimeout(disconnectedPlayers[pid].timeoutId);
          delete disconnectedPlayers[pid];
        }
      });

      delete sessions[sessionCode];
      return;
    }

    if (data.type === "leaveSession") {
      const sessionCode = data.code;
      if (!sessions[sessionCode]) return;

      console.log(`# Player ${ws.playerId} left Session ${sessionCode}`);
      await account.forfeit(sessions[sessionCode], ws.playerId);
      sessions[sessionCode].players = sessions[sessionCode].players.filter(
        (player) => player !== ws,
      );
      return;
    }

    if (data.type === "joinSession") {
      const sessionCode = String(data.code || "").trim().toUpperCase();
      if (sessions[sessionCode] && sessions[sessionCode].players.length === 1) {
        const host = sessions[sessionCode].players[0];
        if (!account.sameSide(host, ws)) {
          ws.send(JSON.stringify({ type: "sessionMismatch", role: "join" }));
          console.log(`# Player ${ws.playerId} blocked from Session ${sessionCode}: cuenta distinta`);
          return;
        }
        sessions[sessionCode].players.push(ws);
        ws.sessionCode = sessionCode;
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
        account.matchBegan(session);
        if (!sessions[ws.sessionCode]?.firstPlayer) {
          const firstPlayer =
            session.players[Math.floor(Math.random() * session.players.length)]
              .playerId;
          sessions[ws.sessionCode].firstPlayer = firstPlayer;
        }
        console.log("firstPlayer = ", sessions[ws.sessionCode].firstPlayer);

        session.players.forEach((player) => {
          player.send(
            JSON.stringify({
              type: "coinToss",
              player: sessions[ws.sessionCode].firstPlayer,
            }),
          );
        });
      }
      return;
    }

    if (data.type === "finished_redraw") {
      if (ws.sessionCode && sessions[ws.sessionCode]) {
        const session = sessions[ws.sessionCode];
        session.playersReady += 1;

        console.log(
          `# Players ready in session ${ws.sessionCode}: ${session.playersReady}`,
        );

        if (session.playersReady === 2) {
          session.players.forEach((player) => {
            player.send(JSON.stringify({ type: "start" }));
          });
          session.playersReady = 0;
        }
      }
      return;
    }

    if (data.type === "play" || data.type === "useLeader") account.notePlay(ws, sessions);
    if (data.type === "ready" && !(await account.allowReady(ws, data, sessions))) return;

    // Relay messages to the other player in the same session
    if (ws.sessionCode) {
      const sessionPlayers = sessions[ws.sessionCode]?.players || [];
      sessionPlayers.forEach((player) => {
        if (player !== ws && player.readyState === WebSocket.OPEN) {
          player.send(JSON.stringify(data));
        }
      });
    }
    } catch (err) {
      console.log("message: " + err.message);
    }
  });

  ws.on("close", () => {
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
          const other = sess.players.find((p) => p.playerId !== loserId);
          if (other && other.readyState === WebSocket.OPEN) {
            other.send(JSON.stringify({ type: "sessionDeleted" }));
          }
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
          }),
        );
        otherPlayer.send(JSON.stringify({ type: "sessionUnready" }));
      }

      console.log(
        `# Player ${ws.playerId} disconnected from Session ${ws.sessionCode}. Waiting for reconnection...`,
      );
    }

    players = players.filter((player) => player !== ws);
  });
});

console.log("Waiting for the port...");
