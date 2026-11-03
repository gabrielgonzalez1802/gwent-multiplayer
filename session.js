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

const sessionIdDiv = document.getElementById("session-id");
sessionIdDiv.addEventListener("click", () => copySessionId());
sessionIdDiv.classList.add("hidden");

inputGroup.classList.add("hidden");

function showOnlineControls() {
  btnOnlineElem.classList.add("on");
  if (!createdSessionId && !joinedSessionId) {
    btnCreateElem.classList.remove("hidden");
    btnJoinElem.classList.remove("hidden");
  }
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

function showSessionCode(code) {
  createdSessionId = code;
  clearTimeout(createWatch);
  noServerWarningElement.classList.add("hidden");
  sessionIdDiv.classList.remove("hidden");
  const label = sessionIdDiv.querySelector(".copy-btn");
  if (label) label.textContent = t("session") + " " + createdSessionId;
}

function handleLobbyMessage(event) {
  let data;
  try {
    data = JSON.parse(event.data);
  } catch (e) {
    return;
  }
  if (data.type === "sessionCreated") showSessionCode(data.code);
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
    btnCreateElem.classList.add("disabled");
    btnJoinElem.classList.add("disabled");
    showServerDown();
    if (!activeAddress || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      openSocket(activeAddress).then((ok) => {
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
      resolve(true);
    };
    ws.onerror = () => fail();
    ws.onclose = () => fail();
  });
}

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
  for (const address of serverCandidates()) {
    ok = await openSocket(address);
    if (ok) break;
  }
  connecting = false;
  btnOnlineElem.classList.remove("disabled");
  if (!ok) showServerDown();
}

var createdSessionId = null;
var joinedSessionId = null;

function createGame() {
  if (!socket || socket.readyState !== 1) {
    showServerDown();
    return;
  }
  btnReadyElem.classList.add("disabled");
  btnCreateElem.classList.add("hidden");
  btnJoinElem.classList.add("hidden");

  btnReadyElem.classList.remove("hidden");
  btnCancelElem.classList.remove("hidden");
  socket.send(JSON.stringify({ type: "createSession" }));
  clearTimeout(createWatch);
  createWatch = setTimeout(() => {
    if (!createdSessionId) showServerDown();
  }, 3000);
}

function joinGame() {
  btnReadyElem.classList.add("hidden");
  btnCreateElem.classList.add("hidden");
  btnJoinElem.classList.add("hidden");

  btnCancelElem.classList.remove("hidden");
  btnConfirmJoin.classList.remove("hidden");
  inputGroup.classList.remove("hidden");

  btnConfirmJoin.addEventListener("click", async () => {
    const sessionCode = inputField.value.trim();

    if (sessionCode.length) {
      socket.send(JSON.stringify({ type: "joinSession", code: sessionCode }));
      const joined = await findSession();

      if (joined) {
        btnReadyElem.classList.remove("hidden");
        inputGroup.classList.add("hidden");
        btnConfirmJoin.classList.add("hidden");
        joinedSessionId = sessionCode;
      } else {
        gameAlert(t("session_bad"));
        joinedSessionId = null;
      }
    }
  });
}

async function findSession() {
  return new Promise((resolve) => {
    const handleMessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "sessionJoined") {
        socket.removeEventListener("message", handleMessage);
        resolve(true);
      } else if (data.type === "sessionInvalid") {
        socket.removeEventListener("message", handleMessage);
        resolve(false);
      }
    };

    socket.addEventListener("message", handleMessage);
  });
}

function cancelSession() {
  console.log("cancelSession");
  btnReadyElem.classList.add("hidden");
  btnCreateElem.classList.remove("hidden");
  btnJoinElem.classList.remove("hidden");

  btnCancelElem.classList.add("hidden");
  sessionIdDiv.classList.add("hidden");
  btnConfirmJoin.classList.add("hidden");
  inputGroup.classList.add("hidden");

  if (createdSessionId) {
    console.log("Cancelled Session of code: " + createdSessionId);
    socket.send(
      JSON.stringify({ type: "cancelSession", code: createdSessionId }),
    );
    createdSessionId = null;
  } else if (joinedSessionId) {
    console.log("Left Session of code: " + joinedSessionId);
    socket.send(
      JSON.stringify({ type: "leaveSession", code: joinedSessionId }),
    );
    joinedSessionId = null;
  }
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
