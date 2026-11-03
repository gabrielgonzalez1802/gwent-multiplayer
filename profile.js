"use strict";

var FACTION_KEYS = ["realms", "nilfgaard", "monsters", "scoiatael", "skellige"];

function accountToken() {
  try {
    return localStorage.getItem("gwent-token") || "";
  } catch (e) {
    return "";
  }
}

function setAccountToken(token) {
  try {
    if (token) localStorage.setItem("gwent-token", token);
    else localStorage.removeItem("gwent-token");
  } catch (e) {}
}

function accountApi(path, body) {
  return fetch(path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Token": accountToken() },
    body: body ? JSON.stringify(body) : undefined,
  }).then(function (res) {
    return res.json().catch(function () { return {}; }).then(function (data) {
      data.ok = res.ok;
      return data;
    });
  });
}

function accountError(code) {
  if (code === "taken") return t("acc_taken");
  if (code === "db") return t("acc_db");
  if (code === "empty") return t("pack_empty");
  if (code === "bad") return t("acc_bad");
  return t("acc_db");
}

function cardTitle(filename) {
  var card = card_dict.find(function (item) { return item.filename === filename; });
  if (!card) return filename;
  return typeof cardLabel === "function" ? cardLabel(card.name) : card.name;
}

function cardList(files) {
  if (!files || !files.length) return t("bet_none");
  return files.map(cardTitle).join(", ");
}

var rewardTimer = null;

function showReward(text) {
  var note = document.getElementById("reward-note");
  if (rewardTimer) clearTimeout(rewardTimer);
  if (!text) {
    note.textContent = "";
    note.classList.add("hide");
    return;
  }
  note.textContent = text;
  note.classList.remove("hide");
  rewardTimer = setTimeout(function () {
    note.classList.add("hide");
  }, 3500);
}

function fillFactions() {
  var select = document.getElementById("account-faction");
  var current = select.value || accountProfile && accountProfile.faction || "realms";
  select.innerHTML = "";
  FACTION_KEYS.forEach(function (key) {
    var option = document.createElement("option");
    option.value = key;
    option.textContent = factionField(key, "name");
    select.appendChild(option);
  });
  select.value = FACTION_KEYS.indexOf(current) >= 0 ? current : "realms";
}

function renderAccount() {
  var inn = document.getElementById("account-in");
  var out = document.getElementById("account-out");
  var actions = document.getElementById("deck-actions");
  if (actions) actions.classList.toggle("account", !!accountProfile);
  if (!accountProfile) {
    inn.classList.remove("hide");
    out.classList.add("hide");
    return;
  }
  inn.classList.add("hide");
  out.classList.remove("hide");
  document.getElementById("account-who").textContent =
    accountProfile.name + " · " + factionField(accountProfile.faction, "name");
  document.getElementById("account-open").textContent = tf("acc_open", {
    n: accountProfile.packs || 0,
  });
  placeAccount();
}

function applyAccountDeck() {
  if (!accountProfile || typeof dm === "undefined") return;
  dm.setFaction(accountProfile.faction, true);
  dm.makeBank(dm.faction);
  var prefer = dm.leaders.find(function (leader) {
    return leader.card.deck === accountProfile.faction;
  }) || dm.leaders[0];
  if (prefer) dm.setLeader(prefer.index);
  var need = 22;
  var order = dm.bank.map(function (entry, index) {
    return { index: index, card: card_dict[entry.index], count: entry.count };
  }).filter(function (entry) {
    if (entry.card.deck === "special" || entry.card.deck === "weather") return false;
    return String(entry.card.ability || "").split(" ").indexOf("hero") < 0;
  }).sort(function (a, b) {
    return Number(a.card.strength) - Number(b.card.strength);
  });
  order.forEach(function (entry) {
    if (need <= 0) return;
    var n = Math.min(need, entry.count);
    dm.deck[entry.index].count = n;
    dm.bank[entry.index].count = entry.count - n;
    setPreviewCount(dm.deck[entry.index].elem, n);
    setPreviewCount(dm.bank[entry.index].elem, entry.count - n);
    need -= n;
  });
  dm.update();
  dm.rememberFactionDeck();
}

function acceptAccount(data) {
  setAccountToken(data.token || accountToken());
  accountProfile = data;
  renderAccount();
  applyAccountDeck();
  if (typeof netSend === "function" && accountToken())
    netSend(JSON.stringify({ type: "auth", token: accountToken() }));
}

function renderBet() {
  var panel = document.getElementById("bet-panel");
  var inMatch = document.getElementById("lobby-bar").classList.contains("hide");
  if (!betState || !accountProfile || inMatch) {
    panel.classList.add("hide");
    return;
  }
  panel.classList.remove("hide");
  var controls = document.getElementById("bet-controls");
  var mine = betState.players.find(function (player) { return player.playerId === playerId; });
  var theirs = betState.players.find(function (player) { return player.playerId !== playerId; });
  document.getElementById("bet-mine").textContent = tf("bet_mine", { cards: cardList(mine && mine.cards) });
  document.getElementById("bet-theirs").textContent = tf("bet_theirs", { cards: cardList(theirs && theirs.cards) });
  var status = document.getElementById("bet-status");
  if (!betState.live) status.textContent = t("bet_login");
  else if (betState.locked) status.textContent = t("bet_locked");
  else status.textContent = t("bet_wait");
  controls.classList.toggle("hide", !betState.live || betState.locked);
  var pick = document.getElementById("bet-pick");
  var selected = pick.value;
  pick.innerHTML = "";
  Object.keys(accountProfile.owned || {}).sort().forEach(function (filename) {
    var left = accountProfile.owned[filename];
    var used = mine && mine.cards ? mine.cards.filter(function (file) { return file === filename; }).length : 0;
    if (left - used <= 0) return;
    var option = document.createElement("option");
    option.value = filename;
    option.textContent = cardTitle(filename);
    pick.appendChild(option);
  });
  if (selected) pick.value = selected;
}

function syncOwnedDeck() {
  if (!accountProfile || typeof dm === "undefined" || !dm.rememberFactionDeck) return;
  dm.rememberFactionDeck();
  var saved = dm.factionDecks[dm.faction];
  var faction = dm.faction;
  var current = dm.leader && dm.leader.index;
  dm.leaders = card_dict.map(function (card, index) {
    return { index: index, card: card };
  }).filter(function (entry) {
    return entry.card.row === "leader" && entry.card.deck === faction && (accountProfile.owned[entry.card.filename] || 0) > 0;
  });
  if (current != null) {
    var same = dm.leaders.find(function (entry) { return entry.index === current; });
    if (same) dm.leader = same;
  }
  dm.makeBank(faction, saved && saved.cards);
  if (saved && saved.leader != null) dm.setLeader(saved.leader);
  dm.update();
}

function playPack(files, done) {
  var show = document.getElementById("pack-show");
  var stage = document.getElementById("pack-stage");
  var box = document.getElementById("pack-cards");
  var button = document.getElementById("pack-done");
  box.innerHTML = "";
  stage.classList.remove("open");
  button.classList.add("hide");
  var mid = (files.length - 1) / 2;
  files.forEach(function (filename, i) {
    var card = card_dict.find(function (item) { return item.filename === filename; });
    var el = document.createElement("div");
    el.className = "pack-card";
    el.style.setProperty("--i", String(i));
    el.style.setProperty("--mid", String(mid));
    el.style.setProperty("--tilt", ((i - mid) * 6) + "deg");
    el.style.transitionDelay = (0.55 + i * 0.14) + "s";
    if (card && typeof largeURL === "function") el.style.backgroundImage = largeURL(card.deck + "_" + card.filename);
    if (card) paintLargeCard(el, card);
    box.appendChild(el);
  });
  button.onclick = function () {
    show.classList.add("hide");
    stage.classList.remove("open");
    button.onclick = null;
    if (done) done();
  };
  show.classList.remove("hide");
  setTimeout(function () { stage.classList.add("open"); }, 380);
  setTimeout(function () { button.classList.remove("hide"); }, 1100 + files.length * 160);
}

function grantCpuReward(result) {
  accountApi("/api/cpu", { result: result }).then(function (data) {
    if (!data.ok) {
      showReward(accountError(data.error));
      return;
    }
    accountProfile.packs = data.packs;
    renderAccount();
    showReward(data.pack ? t("pack_got") : t("cpu_none"));
  }).catch(function () { showReward(t("acc_db")); });
}

function undoReady(reason) {
  amReady = false;
  readyButtonElem.classList.remove("ready");
  customizationElem.classList.remove("noclick");
  showReward(reason === "deck" ? t("bet_deck") : reason === "mix" ? t("session_mix") : t("bet_wait"));
}

function takeRewards(data) {
  if (!accountProfile) return;
  accountProfile.owned = data.owned || accountProfile.owned;
  accountProfile.packs = data.packs;
  renderAccount();
  applyAccountDeck();
  var cards = cardList(data.cards);
  var text = "";
  if (data.note === "won") text = tf("bet_won", { cards: cards });
  else if (data.note === "lost") text = tf("bet_lost", { cards: cards });
  else if (data.note === "forfeit-win") text = tf("bet_forfeit_win", { cards: cards });
  else if (data.note === "forfeit-loss") text = tf("bet_forfeit_loss", { cards: cards });
  else if (data.note === "dispute") text = t("bet_dispute");
  else if (data.note === "draw") text = t("bet_draw");
  if (data.pack) text = (text ? text + " " : "") + t("pack_got");
  else text = (text ? text + " " : "") + t("pack_skip");
  showReward(text);
}

var betState = null;

var prevApplyI18n = applyI18n;
applyI18n = function () {
  prevApplyI18n();
  fillFactions();
  renderAccount();
  renderBet();
};

var prevSocketMessage = onSocketMessage;
onSocketMessage = async function (event) {
  var data = JSON.parse(event.data);
  if (data.type === "welcome" && accountToken())
    netSend(JSON.stringify({ type: "auth", token: accountToken() }));
  if (data.type === "sessionMismatch" && data.role === "join") {
    if (!joinedSessionId) return;
    joinedSessionId = null;
    createdSessionId = null;
    cancelSession();
    gameAlert(t("session_mix"));
    return;
  }
  if (data.type === "sessionMismatch") {
    gameAlert(t("session_mix"));
    return;
  }
  if (data.type === "betState") {
    betState = data;
    renderBet();
    return;
  }
  if (data.type === "readyBlocked") {
    undoReady(data.reason);
    return;
  }
  if (data.type === "betRejected") {
    showReward(t("bet_reject"));
    return;
  }
  if (data.type === "rewards") {
    takeRewards(data);
    return;
  }
  if (data.type === "sessionDeleted" || data.type === "sessionUnready") {
    betState = null;
    document.getElementById("bet-panel").classList.add("hide");
  }
  return prevSocketMessage(event);
};
if (socket) socket.onmessage = onSocketMessage;

document.getElementById("account-register").addEventListener("click", function () {
  var name = document.getElementById("account-name").value.trim();
  var password = document.getElementById("account-pass").value;
  var faction = document.getElementById("account-faction").value;
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(name) || password.length < 4) {
    showReward(t("acc_need"));
    return;
  }
  accountApi("/api/register", { name: name, password: password, faction: faction }).then(function (data) {
    if (!data.ok) {
      showReward(accountError(data.error));
      return;
    }
    acceptAccount(data);
    showReward("");
    document.getElementById("reward-note").classList.add("hide");
  }).catch(function () { showReward(t("acc_db")); });
});

document.getElementById("account-login").addEventListener("click", function () {
  var name = document.getElementById("account-name").value.trim();
  var password = document.getElementById("account-pass").value;
  accountApi("/api/login", { name: name, password: password }).then(function (data) {
    if (!data.ok) {
      showReward(accountError(data.error));
      return;
    }
    acceptAccount(data);
    showReward("");
    document.getElementById("reward-note").classList.add("hide");
  }).catch(function () { showReward(t("acc_db")); });
});

document.getElementById("account-logout").addEventListener("click", function () {
  accountApi("/api/logout", {}).catch(function () {}).then(function () {
    setAccountToken("");
    location.reload();
  });
});

document.getElementById("account-open").addEventListener("click", function () {
  var button = document.getElementById("account-open");
  if (button.disabled) return;
  if (!accountProfile || !accountProfile.packs) {
    showReward(t("pack_empty"));
    return;
  }
  button.disabled = true;
  accountApi("/api/pack/open", {}).then(function (data) {
    button.disabled = false;
    if (!data.ok) {
      showReward(accountError(data.error));
      return;
    }
    accountProfile.owned = data.owned;
    accountProfile.packs = data.packs;
    renderAccount();
    var files = data.files && data.files.length ? data.files : [data.filename];
    playPack(files, function () {
      if (typeof customizationElem !== "undefined" && !customizationElem.classList.contains("hide")) syncOwnedDeck();
    });
  }).catch(function () {
    button.disabled = false;
    showReward(t("acc_db"));
  });
});

document.getElementById("bet-add").addEventListener("click", function () {
  var filename = document.getElementById("bet-pick").value;
  if (!filename || !betState) return;
  var mine = betState.players.find(function (player) { return player.playerId === playerId; });
  var cards = (mine && mine.cards ? mine.cards.slice() : []);
  cards.push(filename);
  netSend(JSON.stringify({ type: "betSet", cards: cards }));
});

document.getElementById("bet-clear").addEventListener("click", function () {
  netSend(JSON.stringify({ type: "betSet", cards: [] }));
});

document.getElementById("bet-ok").addEventListener("click", function () {
  netSend(JSON.stringify({ type: "betOk" }));
});

function placeAccount() {
  var bar = document.getElementById("account-bar");
  var lobby = document.getElementById("lobby-bar");
  var aid = document.getElementById("aid-open");
  if (!bar || !lobby || !aid || bar.classList.contains("hide")) return;
  bar.style.width = "auto";
  var need = bar.scrollWidth;
  var leftEdge = lobby.getBoundingClientRect().right + 8;
  var rightEdge = aid.getBoundingClientRect().left - 8;
  var gap = rightEdge - leftEdge;
  if (!lobby.classList.contains("hide") && gap < need) {
    bar.style.top = lobby.getBoundingClientRect().bottom + 8 + "px";
    bar.style.left = "12px";
    bar.style.width = "auto";
    bar.style.transform = "none";
    return;
  }
  bar.style.top = "12px";
  bar.style.left = Math.max(8, leftEdge) + "px";
  bar.style.width = Math.max(gap, 0) + "px";
  bar.style.transform = "none";
}

window.addEventListener("resize", placeAccount);
document.getElementById("lobby-bar").addEventListener("click", function () {
  setTimeout(placeAccount, 0);
});

fillFactions();
renderAccount();
placeAccount();
if (accountToken()) {
  accountApi("/api/me").then(function (data) {
    if (!data.ok) {
      setAccountToken("");
      return;
    }
    acceptAccount(data);
  }).catch(function () {});
}
