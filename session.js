var gameMode = "online";
let socket = null;
let activeAddress = null;
let connecting = false;
let reconnectTimer = null;

function netSend(data) {
  if (gameMode === "offline") return;
  if (!socket || socket.readyState !== 1) return;
  socket.send(data);
}

function serverCandidates() {
  const out = [];
  function add(url) {
    if (url && out.indexOf(url) === -1) out.push(url);
  }
  if (location.protocol === "http:" || location.protocol === "https:") {
    add((location.protocol === "https:" ? "wss://" : "ws://") + location.host);
  }
  add("ws://127.0.0.1:8080");
  if (typeof CLIENT_CONFIG === "string" && CLIENT_CONFIG)
    add("wss://" + CLIENT_CONFIG);
  return out;
}

const noServerWarningElement = document.getElementById("no-server");

const btnCreateElem = document.getElementById("create-game");
btnCreateElem.addEventListener("click", () => createGame());
btnCreateElem.classList.add("disabled");
btnCreateElem.classList.add("hidden");

const btnJoinElem = document.getElementById("join-game");
btnJoinElem.addEventListener("click", () => joinGame());
btnJoinElem.classList.add("disabled");
btnJoinElem.classList.add("hidden");

const btnFindQuick = document.getElementById("find-quick");
if (btnFindQuick) {
  btnFindQuick.addEventListener("click", () => findQuick());
  btnFindQuick.classList.add("hidden");
}

const quickStatusElem = document.getElementById("quick-status");
const quickNoteElem = document.getElementById("quick-note");
const quickAliasRow = document.getElementById("quick-alias-row");
const quickAliasInput = document.getElementById("quick-alias");
const quickAliasRoll = document.getElementById("quick-alias-roll");
var seekingQuick = false;
// Alias de la partida rapida actual (servidor). No pisa el localStorage opcional.
var matchAlias = null;
var matchRivalAlias = null;

const QUICK_ALIAS_WORDS = [
  "Lobo",
  "Cuervo",
  "Ciervo",
  "Aguila",
  "Zorro",
  "Oso",
  "Halcon",
  "Dragon",
  "Bruma",
  "Roble",
  "Risco",
  "Tormenta",
  "Ceniza",
  "Escarcha",
  "Sombra",
  "Relampago",
  "Grifo",
  "Sirena",
  "Brujo",
  "Bruja",
  "Bardo",
  "Escudero",
  "Mercader",
  "Viajero",
];

function cleanQuickAlias(raw) {
  return String(raw || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
}

function readQuickAlias() {
  try {
    return cleanQuickAlias(localStorage.getItem("gwent-quick-alias") || "");
  } catch (e) {
    return "";
  }
}

function saveQuickAlias(raw) {
  var name = cleanQuickAlias(raw);
  try {
    if (name) localStorage.setItem("gwent-quick-alias", name);
    else localStorage.removeItem("gwent-quick-alias");
  } catch (e) {}
  return name;
}

function suggestQuickAlias() {
  var word = QUICK_ALIAS_WORDS[Math.floor(Math.random() * QUICK_ALIAS_WORDS.length)];
  var tag = Math.random().toString(36).slice(2, 4).toUpperCase();
  return cleanQuickAlias(word + "_" + tag) || word;
}

function clearMatchAlias() {
  matchAlias = null;
  matchRivalAlias = null;
}

function applyMatchAlias(data) {
  if (!data || !data.quick) return;
  matchAlias = cleanQuickAlias(data.alias) || null;
  matchRivalAlias = cleanQuickAlias(data.rivalAlias) || null;
}

function liveQuickAlias() {
  if (matchAlias) return matchAlias;
  return readQuickAlias();
}

const btnOnlineElem = document.getElementById("online-game");
btnOnlineElem.addEventListener("click", () => ensureOnline());

btnReadyElem = document.getElementById("start-game");
btnReadyElem.classList.add("hidden");

const btnCancelElem = document.getElementById("cancel-game");
btnCancelElem.addEventListener("click", () => cancelSession());
btnCancelElem.classList.add("hidden");

const btnConfirmJoin = document.getElementById("confirm-join");
btnConfirmJoin.classList.add("hidden");

const inputGroup = document.getElementById("join-input");
const inputField = document.getElementById("session-input");
inputField.value = "";
inputField.addEventListener("input", function () {
  var next = inputField.value.toUpperCase();
  if (next === inputField.value) return;
  var pos = inputField.selectionStart;
  inputField.value = next;
  if (pos != null) inputField.setSelectionRange(pos, pos);
});

const sessionIdDiv = document.getElementById("session-id");
sessionIdDiv.addEventListener("click", () => copySessionId());
sessionIdDiv.classList.add("hidden");

inputGroup.classList.add("hidden");

function isQuickClient() {
  return typeof accountProfile === "undefined" || !accountProfile;
}

function syncQuickUi() {
  var guest = isQuickClient();
  if (quickNoteElem) quickNoteElem.classList.toggle("hide", !guest);
  if (quickAliasRow) {
    var showAlias = guest && !createdSessionId && !joinedSessionId;
    quickAliasRow.classList.toggle("hide", !showAlias);
    if (showAlias && quickAliasInput && document.activeElement !== quickAliasInput) {
      quickAliasInput.value = readQuickAlias();
      quickAliasInput.placeholder = t("quick_alias_ph");
      quickAliasInput.title = t("quick_alias_hint");
    }
  }
  var betBtn = document.getElementById("bet-open");
  if (betBtn) betBtn.classList.toggle("hide", guest);
  var onlineBtn = document.querySelector("#online-menu > .menu-drop-btn");
  if (onlineBtn) {
    var key = guest ? "menu_quick" : "menu_online";
    onlineBtn.setAttribute("data-i18n", key);
    onlineBtn.textContent = t(key);
  }
  if (!btnFindQuick) return;
  if (guest && !seekingQuick && !createdSessionId && !joinedSessionId && socket && socket.readyState === 1) {
    btnFindQuick.classList.remove("hidden");
    btnFindQuick.classList.remove("disabled");
  } else {
    btnFindQuick.classList.add("hidden");
  }
  if (quickStatusElem) {
    quickStatusElem.classList.toggle("hidden", !seekingQuick);
    if (seekingQuick) quickStatusElem.textContent = t("quick_waiting");
  }
}

if (quickAliasInput) {
  quickAliasInput.value = readQuickAlias();
  quickAliasInput.addEventListener("input", function () {
    var next = cleanQuickAlias(quickAliasInput.value);
    if (next !== quickAliasInput.value) {
      var pos = quickAliasInput.selectionStart;
      quickAliasInput.value = next;
      if (pos != null) quickAliasInput.setSelectionRange(Math.min(pos, next.length), Math.min(pos, next.length));
    }
    saveQuickAlias(quickAliasInput.value);
  });
  quickAliasInput.addEventListener("change", function () {
    quickAliasInput.value = saveQuickAlias(quickAliasInput.value);
  });
}
if (quickAliasRoll) {
  quickAliasRoll.addEventListener("click", function () {
    var name = suggestQuickAlias();
    if (quickAliasInput) quickAliasInput.value = name;
    saveQuickAlias(name);
  });
}

function setSeekingQuick(on) {
  seekingQuick = !!on;
  if (seekingQuick) {
    btnCreateElem.classList.add("hidden");
    btnJoinElem.classList.add("hidden");
    if (btnFindQuick) btnFindQuick.classList.add("hidden");
    inputGroup.classList.add("hidden");
    btnConfirmJoin.classList.add("hidden");
    btnCancelElem.classList.remove("hidden");
    btnReadyElem.classList.add("hidden");
    sessionIdDiv.classList.add("hidden");
  } else if (!createdSessionId && !joinedSessionId) {
    btnCreateElem.classList.remove("hidden");
    btnJoinElem.classList.remove("hidden");
    btnCancelElem.classList.add("hidden");
  }
  syncQuickUi();
  if (typeof placeAccount === "function") placeAccount();
}

function ensureQuickDeck() {
  if (!isQuickClient()) return;
  if (typeof dm === "undefined" || typeof dm.deckWarning !== "function") return;
  if (!dm.deckWarning()) return;
  if (typeof dm.randomDeck === "function") dm.randomDeck();
}

function showOnlineControls() {
  btnOnlineElem.classList.add("on");
  if (!createdSessionId && !joinedSessionId && !seekingQuick) {
    btnCreateElem.classList.remove("hidden");
    btnJoinElem.classList.remove("hidden");
  }
  ensureQuickDeck();
  syncQuickUi();
  if (typeof placeAccount === "function") placeAccount();
}

function markOnline() {
  noServerWarningElement.classList.add("hidden");
  btnCreateElem.classList.remove("disabled");
  btnJoinElem.classList.remove("disabled");
  showOnlineControls();
}

function showServerDown() {
  noServerWarningElement.classList.remove("hidden");
}

let createWatch = null;

function saveSeat(code, host) {
  try {
    localStorage.setItem("gwent-seat", JSON.stringify({ code: code, host: !!host }));
  } catch (e) {}
}

function clearSeat() {
  try { localStorage.removeItem("gwent-seat"); } catch (e) {}
  try { sessionStorage.removeItem("gwent-match"); } catch (e) {}
  clearMatchAlias();
}

function readSeat() {
  try { return JSON.parse(localStorage.getItem("gwent-seat") || "null"); } catch (e) { return null; }
}

function showSessionCode(code) {
  createdSessionId = code;
  saveSeat(code, true);
  clearTimeout(createWatch);
  noServerWarningElement.classList.add("hidden");
  sessionIdDiv.classList.remove("hidden");
  const label = sessionIdDiv.querySelector(".copy-btn");
  if (label) label.textContent = t("session") + " " + createdSessionId;
  if (typeof syncChat === "function") syncChat();
  if (typeof syncLeaveLobby === "function") syncLeaveLobby();
}

function showRestoredLobby(code, host) {
  if (host) showSessionCode(code);
  else {
    createdSessionId = null;
    joinedSessionId = code;
    saveSeat(code, false);
    if (inputField) inputField.value = code;
    if (typeof syncChat === "function") syncChat();
  }
  btnReadyElem.classList.remove("hidden");
  btnReadyElem.classList.remove("disabled");
  btnCancelElem.classList.remove("hidden");
  btnCreateElem.classList.add("hidden");
  btnJoinElem.classList.add("hidden");
  inputGroup.classList.add("hidden");
  btnConfirmJoin.classList.add("hidden");
  var lobby = document.getElementById("lobby-bar");
  if (lobby) lobby.classList.remove("hide");
  if (typeof syncLeaveLobby === "function") syncLeaveLobby();
}

function enterMatchedLobby(data) {
  setSeekingQuick(false);
  applyMatchAlias(data);
  if (data.host) showSessionCode(data.code);
  else {
    createdSessionId = null;
    joinedSessionId = data.code;
    saveSeat(data.code, false);
  }
  btnReadyElem.classList.remove("hidden");
  btnReadyElem.classList.remove("disabled");
  btnCancelElem.classList.remove("hidden");
  btnCreateElem.classList.add("hidden");
  btnJoinElem.classList.add("hidden");
  if (btnFindQuick) btnFindQuick.classList.add("hidden");
  inputGroup.classList.add("hidden");
  btnConfirmJoin.classList.add("hidden");
  if (typeof syncQuickUi === "function") syncQuickUi();
  if (typeof syncChat === "function") syncChat();
  if (typeof paintSeatRole === "function") paintSeatRole();
  if (typeof syncLeaveLobby === "function") syncLeaveLobby();
}

function handleLobbyMessage(event) {
  let data;
  try {
    data = JSON.parse(event.data);
  } catch (e) {
    return;
  }
  if (data.type === "sessionCreated") showSessionCode(data.code);
  if (data.type === "quickWaiting") setSeekingQuick(true);
  if (data.type === "quickIdle") setSeekingQuick(false);
  if (data.type === "quickDenied") {
    setSeekingQuick(false);
    if (typeof gameAlert === "function") gameAlert(t("quick_denied"));
  }
  if (data.type === "sessionJoined" && data.matched) enterMatchedLobby(data);
  if (data.type === "sessionFull") {
    clearTimeout(createWatch);
    setSeekingQuick(false);
    if (typeof cancelSession === "function") cancelSession();
  }
}

function announce() {
  if (!socket || socket.readyState !== 1) return;
  socket.send(JSON.stringify({ type: "connect", id: playerId }));
  markOnline();
}

function attachSocketListeners() {
  socket.onmessage = (event) => {
    handleLobbyMessage(event);
    if (typeof onSocketMessage === "function") onSocketMessage(event);
  };
  socket.onopen = announce;
  socket.onclose = () => {
    seekingQuick = false;
    if (quickStatusElem) quickStatusElem.classList.add("hidden");
    btnCreateElem.classList.add("disabled");
    btnJoinElem.classList.add("disabled");
    if (btnFindQuick) btnFindQuick.classList.add("disabled");
    showServerDown();
    if (!activeAddress || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      var again = activeAddress === "http" ? openHttp() : openSocket(activeAddress);
      again.then((ok) => {
        if (!ok) showServerDown();
      });
    }, 1500);
  };
  socket.onerror = () => {};
}

function openSocket(address) {
  return new Promise((resolve) => {
    const ws = new WebSocket(address);
    let done = false;
    const timer = setTimeout(() => fail(), 2500);
    function fail() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        ws.close();
      } catch (e) {}
      resolve(false);
    }
    ws.onopen = () => {
      try {
        ws.send(
          JSON.stringify({
            type: "connect",
            id: typeof playerId === "undefined" ? null : playerId,
          }),
        );
      } catch (e) {
        fail();
      }
    };
    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      if (data.type !== "welcome" || done) return;
      done = true;
      clearTimeout(timer);
      if (socket && socket !== ws) {
        socket.onclose = null;
        try {
          socket.close();
        } catch (e) {}
      }
      socket = ws;
      activeAddress = address;
      if (data.playerId) playerId = data.playerId;
      attachSocketListeners();
      markOnline();
      if (typeof afterWelcome === "function") afterWelcome();
      resolve(true);
    };
    ws.onerror = () => fail();
    ws.onclose = () => fail();
  });
}

// NET_MODE en config.js puede ser "ws" o "http". Si no esta, se prueba el socket y, si no entra, esta misma pagina.
async function ensureOnline() {
  if (socket && socket.readyState === 1) {
    showOnlineControls();
    noServerWarningElement.classList.add("hidden");
    return;
  }
  if (connecting) return;
  connecting = true;
  btnOnlineElem.classList.add("disabled");
  noServerWarningElement.classList.add("hidden");
  let ok = false;
  var mode = typeof NET_MODE === "string" ? NET_MODE : "auto";
  var pageHttp = location.protocol === "http:" || location.protocol === "https:";
  if (mode !== "http") {
    for (const address of serverCandidates()) {
      ok = await openSocket(address);
      if (ok) break;
    }
  }
  if (!ok && mode !== "ws" && pageHttp) ok = await openHttp();
  connecting = false;
  btnOnlineElem.classList.remove("disabled");
  if (!ok) showServerDown();
}

var wirePoll = 0;
var pageWireId = "";

function stopWirePoll() {
  wirePoll += 1;
}

function wireId() {
  if (pageWireId && /^[a-z0-9]{8,32}$/.test(pageWireId)) return pageWireId;
  pageWireId = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  return pageWireId;
}

function requestWire(msg) {
  return fetch("/api/wire", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ id: wireId(), msg: msg }),
  }).then(function (res) {
    if (!res.ok) throw new Error("wire");
    return res.json();
  }).then(function (body) {
    return body && body.events ? body.events : [];
  });
}

function makeClientLink() {
  var listeners = [];
  var sock = {
    readyState: 1,
    http: true,
    onmessage: null,
    onopen: null,
    onclose: null,
    onerror: null,
    send: function (data) {
      var msg;
      try {
        msg = JSON.parse(data);
      } catch (e) {
        return;
      }
      requestWire(msg).then(function (events) {
        if (!sock.http || sock.readyState !== 1) return;
        events.forEach(function (text) {
          sock._emit(text);
        });
      }).catch(function () {
        if (sock.readyState !== 1) return;
        sock.readyState = 3;
        stopWirePoll();
        if (sock.onclose) sock.onclose();
      });
    },
    addEventListener: function (type, fn) {
      if (type === "message" && listeners.indexOf(fn) === -1) listeners.push(fn);
    },
    removeEventListener: function (type, fn) {
      var at = listeners.indexOf(fn);
      if (at >= 0) listeners.splice(at, 1);
    },
    close: function () {
      sock.readyState = 3;
      stopWirePoll();
    },
    _emit: function (text) {
      var event = { data: text };
      listeners.slice().forEach(function (fn) {
        fn(event);
      });
      if (sock.onmessage) sock.onmessage(event);
    },
  };
  return sock;
}

function pollWire(token) {
  var misses = 0;
  function again() {
    if (!socket || !socket.http || socket.readyState !== 1 || wirePoll !== token) return;
    fetch("/api/wire?id=" + encodeURIComponent(wireId()), { cache: "no-store" })
      .then(function (res) {
        return res.json();
      })
      .then(function (body) {
        if (!socket || !socket.http || socket.readyState !== 1 || wirePoll !== token) return;
        if (body && body.gone) {
          socket.readyState = 3;
          stopWirePoll();
          if (socket.onclose) socket.onclose();
          return;
        }
        misses = 0;
        (body && body.events ? body.events : []).forEach(function (text) {
          socket._emit(text);
        });
        again();
      })
      .catch(function () {
        if (!socket || !socket.http || wirePoll !== token) return;
        misses += 1;
        if (misses >= 3) {
          socket.readyState = 3;
          stopWirePoll();
          if (socket.onclose) socket.onclose();
          return;
        }
        setTimeout(again, 1000);
      });
  }
  again();
}

function openHttp() {
  return requestWire({
    type: "connect",
    id: typeof playerId === "undefined" ? null : playerId,
  }).then(function (events) {
    var welcome = null;
    var rest = [];
    events.forEach(function (text) {
      var data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return;
      }
      if (!welcome && data.type === "welcome") welcome = data;
      else rest.push(text);
    });
    if (!welcome) return false;
    if (socket) {
      socket.onclose = null;
      try {
        socket.close();
      } catch (e) {}
    }
    socket = makeClientLink();
    activeAddress = "http";
    if (welcome.playerId) playerId = welcome.playerId;
    attachSocketListeners();
    markOnline();
    if (typeof afterWelcome === "function") afterWelcome();
    rest.forEach(function (text) {
      socket._emit(text);
    });
    pollWire(++wirePoll);
    return true;
  }).catch(function () {
    return false;
  });
}

window.addEventListener("pagehide", function () {
  if (!socket || !socket.http || socket.readyState !== 1) return;
  var id = wireId();
  socket.readyState = 3;
  stopWirePoll();
  try {
    navigator.sendBeacon(
      "/api/wire",
      new Blob([JSON.stringify({ id: id, bye: true })], { type: "application/json" }),
    );
  } catch (e) {}
});

var createdSessionId = null;
var joinedSessionId = null;

function createGame() {
  if (!socket || socket.readyState !== 1) {
    showServerDown();
    return;
  }
  ensureQuickDeck();
  setSeekingQuick(false);
  btnReadyElem.classList.add("disabled");
  btnCreateElem.classList.add("hidden");
  btnJoinElem.classList.add("hidden");
  if (btnFindQuick) btnFindQuick.classList.add("hidden");

  btnReadyElem.classList.remove("hidden");
  btnCancelElem.classList.remove("hidden");
  socket.send(JSON.stringify({ type: "createSession", custom: customMode, rules: activeRules() }));
  if (typeof placeAccount === "function") placeAccount();
  clearTimeout(createWatch);
  createWatch = setTimeout(() => {
    if (!createdSessionId) showServerDown();
  }, 3000);
}

function findQuick() {
  if (!isQuickClient()) {
    if (typeof gameAlert === "function") gameAlert(t("quick_denied"));
    return;
  }
  if (!socket || socket.readyState !== 1) {
    showServerDown();
    return;
  }
  if (seekingQuick) return;
  ensureQuickDeck();
  var alias = quickAliasInput ? saveQuickAlias(quickAliasInput.value) : readQuickAlias();
  setSeekingQuick(true);
  socket.send(JSON.stringify({ type: "findQuick", alias: alias }));
}

function joinGame() {
  setSeekingQuick(false);
  btnReadyElem.classList.add("hidden");
  btnCreateElem.classList.add("hidden");
  btnJoinElem.classList.add("hidden");
  if (btnFindQuick) btnFindQuick.classList.add("hidden");

  btnCancelElem.classList.remove("hidden");
  btnConfirmJoin.classList.remove("hidden");
  inputGroup.classList.remove("hidden");
  if (typeof placeAccount === "function") placeAccount();

  if (btnConfirmJoin.dataset.bound) return;
  btnConfirmJoin.dataset.bound = "1";
  btnConfirmJoin.addEventListener("click", async () => {
    if (btnConfirmJoin.disabled) return;
    const sessionCode = inputField.value.trim().toUpperCase();
    if (!sessionCode.length) return;

    btnConfirmJoin.disabled = true;
    socket.send(JSON.stringify({ type: "joinSession", code: sessionCode }));
    const joined = await findSession();
    btnConfirmJoin.disabled = false;

    if (joined === true) {
      if (typeof clearHold === "function") clearHold();
      btnReadyElem.classList.remove("hidden");
      inputGroup.classList.add("hidden");
      btnConfirmJoin.classList.add("hidden");
      joinedSessionId = sessionCode;
      saveSeat(sessionCode, false);
      if (typeof syncChat === "function") syncChat();
    } else {
      if (joined === "mix" && typeof showHold === "function") showHold(t("session_mix"));
      else gameAlert(t(joined === "mix" ? "session_mix" : "session_bad"));
      joinedSessionId = null;
    }
  });
}

async function findSession() {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.removeEventListener("message", handleMessage);
      resolve(false);
    }, 8000);
    const handleMessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type !== "sessionJoined" && data.type !== "sessionMismatch" && data.type !== "sessionInvalid") return;
      clearTimeout(timer);
      socket.removeEventListener("message", handleMessage);
      if (data.type === "sessionJoined") resolve(true);
      else if (data.type === "sessionMismatch") resolve("mix");
      else resolve(false);
    };

    socket.addEventListener("message", handleMessage);
  });
}

function cancelSession(silent) {
  clearSeat();
  console.log("cancelSession");
  var wasSeeking = seekingQuick;
  setSeekingQuick(false);
  btnReadyElem.classList.add("hidden");
  btnCreateElem.classList.remove("hidden");
  btnJoinElem.classList.remove("hidden");

  btnCancelElem.classList.add("hidden");
  sessionIdDiv.classList.add("hidden");
  btnConfirmJoin.classList.add("hidden");
  inputGroup.classList.add("hidden");

  var created = createdSessionId;
  var joined = joinedSessionId;
  createdSessionId = null;
  joinedSessionId = null;
  if (!silent && socket && socket.readyState === 1) {
    if (wasSeeking && !created && !joined) {
      socket.send(JSON.stringify({ type: "cancelQuick" }));
    } else if (created) {
      console.log("Cancelled Session of code: " + created);
      socket.send(JSON.stringify({ type: "cancelSession", code: created }));
    } else if (joined) {
      console.log("Left Session of code: " + joined);
      socket.send(JSON.stringify({ type: "leaveSession", code: joined }));
    }
  }
  syncQuickUi();
  if (typeof placeAccount === "function") placeAccount();
  if (typeof syncChat === "function") syncChat();
  if (typeof syncLeaveLobby === "function") syncLeaveLobby();
}

function copySessionId() {
  var sessionIdText = sessionIdDiv.innerText.split(":").pop().trim();

  navigator.clipboard
    .writeText(sessionIdText)
    .then(() => {
      const tooltip = document.getElementById("tooltip");
      tooltip.classList.add("show");

      // Hide tooltip after 2 seconds
      setTimeout(() => {
        tooltip.classList.remove("show");
      }, 1500);
    })
    .catch((err) => {
      console.error("Failed to copy text: ", err);
    });
}
