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
      if (!res.ok && data.error === "auth") {
        setAccountToken("");
        accountProfile = null;
        renderAccount();
      }
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
var dropTimer = null;

function showHold(text) {
  var note = document.getElementById("reward-note");
  if (rewardTimer) clearTimeout(rewardTimer);
  rewardTimer = null;
  note.textContent = text;
  note.classList.remove("hide");
}

function clearHold() {
  if (dropTimer) clearInterval(dropTimer);
  dropTimer = null;
  showReward("");
}

function showDropWait(ms) {
  var left = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  if (dropTimer) clearInterval(dropTimer);
  showHold(tf("op_wait", { n: left }));
  dropTimer = setInterval(function () {
    left -= 1;
    if (left < 0) left = 0;
    showHold(tf("op_wait", { n: left }));
    if (left === 0) {
      clearInterval(dropTimer);
      dropTimer = null;
    }
  }, 1000);
}

function showReward(text, ms) {
  var note = document.getElementById("reward-note");
  if (rewardTimer) clearTimeout(rewardTimer);
  if (!text) {
    note.textContent = "";
    note.classList.remove("low");
    note.classList.add("hide");
    return;
  }
  note.textContent = text;
  note.classList.toggle("low", (ms || 3500) > 3500);
  note.classList.remove("hide");
  rewardTimer = setTimeout(function () {
    note.classList.add("hide");
  }, ms || 3500);
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

var betWanted = false;
var betDismissed = false;
var betStamp = "";
var betNoted = "";

function betCountLabel(n) {
  return n === 1 ? t("bet_one") : tf("bet_many", { n: n });
}

function betStakeText(cards) {
  var list = cards || [];
  var text = betCountLabel(list.length);
  if (list.length) text += ": " + cardList(list);
  return text;
}

function betGapText(player) {
  return tf("bet_gap", { what: betStakeText(player && player.cards) });
}

function betSide(state, self) {
  if (!state || !state.players) return null;
  return state.players.find(function (player) { return (player.playerId === playerId) === self; }) || null;
}

function betBlockText() {
  var mine = betSide(betState, true);
  var theirs = betSide(betState, false);
  var nMine = mine && mine.cards ? mine.cards.length : 0;
  var nTheirs = theirs && theirs.cards ? theirs.cards.length : 0;
  if (nTheirs > 0 && nTheirs !== nMine) return betGapText(theirs);
  if (nMine > 0 && nMine !== nTheirs) return tf("bet_wait_match", { what: betStakeText(mine.cards) });
  return t("bet_same");
}

function betReadyText() {
  var mine = betSide(betState, true);
  var theirs = betSide(betState, false);
  var nMine = mine && mine.cards ? mine.cards.length : 0;
  var nTheirs = theirs && theirs.cards ? theirs.cards.length : 0;
  if (nMine > 0 && nMine === nTheirs) return t("bet_wait");
  return betBlockText();
}

function betLine(player, self) {
  var cards = player && player.cards ? player.cards : [];
  var name = player && player.name ? player.name : "";
  var who = self ? (name ? tf("bet_you_name", { name: name }) : t("bet_you")) : (name || t("bet_rival"));
  var line = tf("bet_line", { who: who, n: cards.length, cards: cardList(cards) });
  if (player && player.ok) line += " · " + t("bet_ok_mark");
  return line;
}

function noteOpponentBet() {
  if (!betState || !betState.live || betState.locked) return;
  var theirs = betSide(betState, false);
  var key = ((theirs && theirs.cards) || []).join("\n");
  if (key === betNoted) return;
  betNoted = key;
  var mine = betSide(betState, true);
  var nMine = mine && mine.cards ? mine.cards.length : 0;
  var nTheirs = theirs && theirs.cards ? theirs.cards.length : 0;
  if (nTheirs > 0 && nTheirs !== nMine) showReward(betGapText(theirs), 7000);
}

function betCardsOf(state) {
  if (!state || !state.players) return false;
  return state.players.some(function (player) { return player.cards && player.cards.length; });
}

function betStampOf(state) {
  if (!state || !state.players) return "";
  return state.players.map(function (player) { return (player.cards || []).join(","); }).join("|") + (state.locked ? ":1" : ":0");
}

function betLook(raw) {
  if (!raw || typeof ui === "undefined") return;
  var abilities = String(raw.ability || "").split(" ").filter(Boolean);
  var hero = abilities[0] === "hero";
  if (hero) abilities = abilities.slice(1);
  var row = raw.deck === "weather" ? "weather" : raw.row;
  var desc = row === "agile" ? abField("agile", "description") : "";
  abilities.forEach(function (item) { desc += abField(item, "description"); });
  if (hero) desc += abField("hero", "description");
  ui.showPreviewVisuals({
    filename: raw.filename,
    faction: raw.deck,
    name: raw.name,
    row: row,
    hero: hero,
    abilities: abilities,
    deck: raw.deck,
    ability: raw.ability,
    strength: raw.strength,
    desc_name: abilities.length ? abField(abilities[abilities.length - 1], "name") : "",
    desc: desc,
  });
}

function paintBetSide(id, player, self) {
  var box = document.getElementById(id);
  box.textContent = "";
  var line = document.createElement("span");
  line.textContent = betLine(player, self);
  box.appendChild(line);
  var cards = player && player.cards ? player.cards : [];
  if (!cards.length) return;
  var row = document.createElement("div");
  row.className = "bet-cards";
  cards.forEach(function (filename) {
    var raw = card_dict.find(function (item) { return item.filename === filename; });
    var thumb = document.createElement("div");
    thumb.className = "bet-thumb";
    thumb.title = cardTitle(filename);
    if (raw) thumb.style.backgroundImage = smallURL(raw.deck + "_" + filename);
    thumb.addEventListener("click", function () { if (raw) betLook(raw); });
    row.appendChild(thumb);
  });
  box.appendChild(row);
}

function renderBet() {
  var panel = document.getElementById("bet-panel");
  var inMatch = document.getElementById("lobby-bar").classList.contains("hide");
  var stamp = betStampOf(betState);
  if (betDismissed && stamp !== betStamp) betDismissed = false;
  if (!accountProfile || inMatch || betDismissed || (!betWanted && !betCardsOf(betState))) {
    panel.classList.add("hide");
    betStamp = stamp;
    return;
  }
  betStamp = stamp;
  panel.classList.remove("hide");
  var controls = document.getElementById("bet-controls");
  if (!betState) {
    document.getElementById("bet-mine").textContent = "";
    document.getElementById("bet-theirs").textContent = "";
    document.getElementById("bet-status").textContent = t("end_wait");
    controls.classList.add("hide");
    return;
  }
  var mine = betSide(betState, true);
  var theirs = betSide(betState, false);
  var nMine = mine && mine.cards ? mine.cards.length : 0;
  var nTheirs = theirs && theirs.cards ? theirs.cards.length : 0;
  paintBetSide("bet-mine", mine, true);
  paintBetSide("bet-theirs", theirs, false);
  var status = document.getElementById("bet-status");
  if (!betState.live) status.textContent = betState.players && betState.players.length > 1 ? t("bet_login") : t("end_wait");
  else if (betState.locked) status.textContent = t("bet_locked");
  else if (nMine !== nTheirs || !nMine) status.textContent = betBlockText();
  else status.textContent = t("bet_wait");
  controls.classList.toggle("hide", !betState.live || betState.locked);
  noteOpponentBet();
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

function packFactionLine(files) {
  var order = ["realms", "nilfgaard", "monsters", "scoiatael", "skellige", "neutral", "special", "weather"];
  var counts = {};
  files.forEach(function (filename) {
    var card = card_dict.find(function (item) { return item.filename === filename; });
    var key = card && card.deck ? card.deck : "neutral";
    counts[key] = (counts[key] || 0) + 1;
  });
  return order.filter(function (key) { return counts[key]; }).map(function (key) {
    var name = typeof factionField === "function" ? factionField(key, "name") : "";
    if (!name) name = t("pack_" + key);
    return counts[key] + " " + name;
  }).join("\n");
}

function playPack(files, done) {
  var show = document.getElementById("pack-show");
  var stage = document.getElementById("pack-stage");
  var box = document.getElementById("pack-cards");
  var button = document.getElementById("pack-done");
  var list = document.getElementById("pack-list");
  box.innerHTML = "";
  if (list) list.textContent = packFactionLine(files);
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

var cpuMatchId = null;
var cpuMatchWait = null;

function startCpuMatch(me, op) {
  cpuMatchId = null;
  cpuMatchWait = accountApi("/api/cpu/start", { me: me, op: op }).then(function (data) {
    if (data.ok) cpuMatchId = data.id;
    return data;
  });
}

function grantCpuReward(rounds) {
  var wait = cpuMatchWait || Promise.resolve({ ok: false, error: "db" });
  wait.then(function (started) {
    if (!started.ok || !cpuMatchId) {
      showReward(accountError(started.error));
      return null;
    }
    return accountApi("/api/cpu", { id: cpuMatchId, rounds: rounds });
  }).then(function (data) {
    if (!data) return;
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
  readyButtonElem.disabled = false;
  readyButtonElem.classList.remove("ready");
  customizationElem.classList.remove("noclick");
  showReward(
    reason === "deck" ? t("bet_deck") : reason === "mix" ? t("session_mix") : reason === "bet" ? betReadyText() : t("bet_wait"),
    reason === "bet" ? 7000 : 3500
  );
}

function takeRewards(data) {
  if (!accountProfile) return;
  accountProfile.owned = data.owned || accountProfile.owned;
  accountProfile.packs = data.packs;
  renderAccount();
  syncOwnedDeck();
  var cards = cardList(data.cards);
  var text = "";
  if (data.note === "won") text = tf("bet_won", { cards: cards });
  else if (data.note === "lost") text = tf("bet_lost", { cards: cards });
  else if (data.note === "forfeit-win") text = tf("bet_forfeit_win", { cards: cards });
  else if (data.note === "forfeit-loss") text = tf("bet_forfeit_loss", { cards: cards });
  else if (data.note === "dispute") text = t("bet_dispute");
  else if (data.note === "draw") text = t("bet_draw");
  if (data.n > 1) text = (text ? text + " " : "") + tf("pack_got_n", { n: data.n });
  else if (data.pack) text = (text ? text + " " : "") + t("pack_got");
  else text = (text ? text + " " : "") + t("cpu_none");
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
    showHold(t("session_mix"));
    if (!joinedSessionId) return;
    joinedSessionId = null;
    createdSessionId = null;
    cancelSession();
    return;
  }
  if (data.type === "sessionMismatch") {
    showHold(t("session_mix"));
    return;
  }
  if (data.type === "opponentDisconnected") {
    showDropWait(data.wait);
    return;
  }
  if (data.type === "opponentBack") {
    clearHold();
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
    showReward(data.reason === "count" ? betBlockText() : t("bet_reject"), data.reason === "count" ? 7000 : 3500);
    return;
  }
  if (data.type === "rewards") {
    takeRewards(data);
    return;
  }
  if (data.type === "chat") {
    takeChat(data);
    return;
  }
  if (data.type === "sessionDeleted" || data.type === "sessionExpired" || data.type === "sessionUnready") {
    if (data.type === "sessionDeleted" || data.type === "sessionExpired") clearHold();
    betState = null;
    betWanted = false;
    betDismissed = false;
    betStamp = "";
    betNoted = "";
    document.getElementById("bet-panel").classList.add("hide");
  }
  return prevSocketMessage(event);
};
if (socket) socket.onmessage = onSocketMessage;

function accountBusy(busy) {
  ["account-register", "account-login"].forEach(function (id) {
    var button = document.getElementById(id);
    button.disabled = busy;
    button.classList.toggle("disabled", busy);
  });
  document.getElementById("account-register").textContent = busy ? t("acc_wait") : t("acc_register");
  document.getElementById("account-login").textContent = busy ? t("acc_wait") : t("acc_login");
}

function showAccountMode(mode) {
  var create = mode === "register";
  document.getElementById("account-tab-login").classList.toggle("on", !create);
  document.getElementById("account-tab-register").classList.toggle("on", create);
  document.getElementById("account-faction").classList.toggle("hide", !create);
  document.getElementById("account-login").classList.toggle("hide", create);
  document.getElementById("account-register").classList.toggle("hide", !create);
}

document.getElementById("account-tab-login").addEventListener("click", function () {
  showAccountMode("login");
});

document.getElementById("account-tab-register").addEventListener("click", function () {
  showAccountMode("register");
});

function accountOnEnter(event) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  var create = document.getElementById("account-tab-register").classList.contains("on");
  document.getElementById(create ? "account-register" : "account-login").click();
}

document.getElementById("account-name").addEventListener("keydown", accountOnEnter);
document.getElementById("account-pass").addEventListener("keydown", accountOnEnter);
document.getElementById("account-faction").addEventListener("keydown", accountOnEnter);

document.getElementById("account-register").addEventListener("click", function () {
  var register = document.getElementById("account-register");
  if (register.disabled) return;
  var name = document.getElementById("account-name").value.trim();
  var password = document.getElementById("account-pass").value;
  var faction = document.getElementById("account-faction").value;
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(name) || password.length < 4) {
    showReward(t("acc_need"));
    return;
  }
  accountBusy(true);
  accountApi("/api/register", { name: name, password: password, faction: faction }).then(function (data) {
    accountBusy(false);
    if (!data.ok) {
      showReward(accountError(data.error));
      return;
    }
    acceptAccount(data);
    showReward("");
    document.getElementById("reward-note").classList.add("hide");
  }).catch(function () {
    accountBusy(false);
    showReward(t("acc_db"));
  });
});

document.getElementById("account-login").addEventListener("click", function () {
  var login = document.getElementById("account-login");
  if (login.disabled) return;
  var name = document.getElementById("account-name").value.trim();
  var password = document.getElementById("account-pass").value;
  accountBusy(true);
  accountApi("/api/login", { name: name, password: password }).then(function (data) {
    accountBusy(false);
    if (!data.ok) {
      showReward(accountError(data.error));
      return;
    }
    acceptAccount(data);
    showReward("");
    document.getElementById("reward-note").classList.add("hide");
  }).catch(function () {
    accountBusy(false);
    showReward(t("acc_db"));
  });
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
  var mine = betSide(betState, true);
  var theirs = betSide(betState, false);
  var nMine = mine && mine.cards ? mine.cards.length : 0;
  var nTheirs = theirs && theirs.cards ? theirs.cards.length : 0;
  if (!nMine || nMine !== nTheirs) {
    showReward(betBlockText(), 7000);
    return;
  }
  netSend(JSON.stringify({ type: "betOk" }));
});

document.getElementById("bet-open").addEventListener("click", function (event) {
  event.stopPropagation();
  if (!accountProfile) {
    showReward(t("bet_login"));
    return;
  }
  betWanted = true;
  betDismissed = false;
  renderBet();
});

document.getElementById("bet-close").addEventListener("click", function (event) {
  event.stopPropagation();
  betWanted = false;
  betDismissed = true;
  betStamp = betStampOf(betState);
  document.getElementById("bet-panel").classList.add("hide");
});

function chatText(raw) {
  return Array.from(String(raw || "").replace(/\s+/g, " ").trim()).slice(0, 200).join("");
}

function chatWho() {
  var name = accountProfile && accountProfile.name;
  return name ? String(name).slice(0, 16) : t("you");
}

function syncChat() {
  var btn = document.getElementById("chat-open");
  var panel = document.getElementById("chat-panel");
  if (!btn || !panel) return;
  var on = gameMode !== "offline" && (createdSessionId || joinedSessionId);
  if (!on) {
    panel.classList.add("hide");
    document.getElementById("chat-log").textContent = "";
    btn.classList.remove("unread");
    var navBtn = document.getElementById("nav-open");
    if (navBtn) navBtn.classList.remove("unread");
  }
  btn.classList.toggle("hide", !on);
  if (typeof paintSeatRole === "function") paintSeatRole();
}

function pushChat(name, text, mine) {
  var log = document.getElementById("chat-log");
  var line = document.createElement("p");
  if (mine) line.className = "me";
  var who = document.createElement("b");
  who.textContent = name;
  line.appendChild(who);
  line.appendChild(document.createTextNode(": " + text));
  log.appendChild(line);
  // ponytail: el chat guarda 40 lineas y tira las viejas. El historial no sobrevive al salir de la sala.
  while (log.children.length > 40) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
}

function takeChat(data) {
  var text = chatText(data && data.text);
  if (!text || !(createdSessionId || joinedSessionId)) return;
  var name = Array.from(chatText(data.name)).slice(0, 16).join("") || t("opponent");
  pushChat(name, text, false);
  var panel = document.getElementById("chat-panel");
  if (panel.classList.contains("hide")) {
    document.getElementById("chat-open").classList.add("unread");
    var navBtn = document.getElementById("nav-open");
    if (navBtn) navBtn.classList.add("unread");
  }
}

function sendChat() {
  var input = document.getElementById("chat-input");
  var text = chatText(input.value);
  if (!text || !(createdSessionId || joinedSessionId)) return;
  input.value = "";
  var name = chatWho();
  pushChat(name, text, true);
  netSend(JSON.stringify({ type: "chat", text: text, name: name }));
}

document.getElementById("chat-open").addEventListener("click", function (event) {
  event.stopPropagation();
  var panel = document.getElementById("chat-panel");
  panel.classList.toggle("hide");
  document.getElementById("chat-open").classList.remove("unread");
  var navBtn = document.getElementById("nav-open");
  if (navBtn) navBtn.classList.remove("unread");
  var nav = document.getElementById("nav");
  if (nav) nav.classList.remove("open");
  if (panel.classList.contains("hide")) document.getElementById("chat-emoji-box").classList.add("hide");
  else document.getElementById("chat-input").focus();
});

document.getElementById("chat-close").addEventListener("click", function (event) {
  event.stopPropagation();
  document.getElementById("chat-panel").classList.add("hide");
  document.getElementById("chat-emoji-box").classList.add("hide");
});

["\uD83D\uDE00","\uD83D\uDE03","\uD83D\uDE04","\uD83D\uDE01","\uD83D\uDE06","\uD83D\uDE05","\uD83E\uDD23","\uD83D\uDE02","\uD83D\uDE42","\uD83D\uDE09","\uD83D\uDE0A","\uD83D\uDE07","\uD83E\uDD70","\uD83D\uDE0D","\uD83E\uDD29","\uD83D\uDE18","\uD83D\uDE17","\uD83D\uDE1A","\uD83D\uDE19","\uD83D\uDE0B","\uD83D\uDE1B","\uD83D\uDE1C","\uD83E\uDD2A","\uD83D\uDE1D","\uD83E\uDD11","\uD83E\uDD17","\uD83E\uDD2D","\uD83E\uDD2B","\uD83E\uDD14","\uD83E\uDD10","\uD83E\uDD28","\uD83D\uDE10","\uD83D\uDE11","\uD83D\uDE36","\uD83D\uDE0F","\uD83D\uDE12","\uD83D\uDE44","\uD83D\uDE2C","\uD83D\uDE0C","\uD83D\uDE14","\uD83D\uDE2A","\uD83E\uDD24","\uD83D\uDE34","\uD83D\uDE37","\uD83E\uDD12","\uD83E\uDD15","\uD83E\uDD22","\uD83E\uDD2E","\uD83E\uDD75","\uD83E\uDD76","\uD83E\uDD74","\uD83D\uDE35","\uD83E\uDD2F","\uD83E\uDD20","\uD83E\uDD73","\uD83D\uDE0E","\uD83E\uDD13","\uD83E\uDDD0","\uD83D\uDE15","\uD83D\uDE1F","\uD83D\uDE41","\u2639\uFE0F","\uD83D\uDE2E","\uD83D\uDE2F","\uD83D\uDE32","\uD83D\uDE33","\uD83E\uDD7A","\uD83D\uDE26","\uD83D\uDE27","\uD83D\uDE28","\uD83D\uDE30","\uD83D\uDE25","\uD83D\uDE22","\uD83D\uDE2D","\uD83D\uDE31","\uD83D\uDE16","\uD83D\uDE23","\uD83D\uDE1E","\uD83D\uDE13","\uD83D\uDE29","\uD83D\uDE2B","\uD83E\uDD71","\uD83D\uDE24","\uD83D\uDE21","\uD83D\uDE20","\uD83E\uDD2C","\uD83D\uDE08","\uD83D\uDC7F","\uD83D\uDC80","\u2620\uFE0F","\uD83D\uDCA9","\uD83E\uDD21","\uD83D\uDC79","\uD83D\uDC7A","\uD83D\uDC7B","\uD83D\uDC7D","\uD83D\uDC7E","\uD83E\uDD16","\uD83D\uDC4D","\uD83D\uDC4E","\uD83D\uDC4F","\uD83D\uDE4F","\uD83D\uDC4C","\u270C\uFE0F","\uD83E\uDD1E","\uD83E\uDD1F","\uD83E\uDD18","\uD83D\uDC4B","\uD83E\uDD19","\uD83D\uDCAA","\uD83E\uDD1B","\uD83E\uDD1C","\u270B","\uD83D\uDD90\uFE0F","\u2764\uFE0F","\uD83E\uDDE1","\uD83D\uDC9B","\uD83D\uDC9A","\uD83D\uDC99","\uD83D\uDC9C","\uD83D\uDDA4","\uD83E\uDD0D","\uD83D\uDC94","\uD83D\uDC95","\uD83D\uDC96","\uD83D\uDC97","\uD83D\uDC9E","\uD83D\uDC93","\uD83D\uDC9D","\uD83D\uDC98","\uD83D\uDC9F","\uD83D\uDC36","\uD83D\uDC31","\uD83D\uDC2D","\uD83D\uDC30","\uD83E\uDD8A","\uD83D\uDC3B","\uD83D\uDC3C","\uD83D\uDC28","\uD83D\uDC2F","\uD83E\uDD81","\uD83D\uDC2E","\uD83D\uDC37","\uD83D\uDC38","\uD83D\uDC35","\uD83D\uDC14","\uD83D\uDC27","\uD83D\uDC26","\uD83E\uDD86","\uD83E\uDD89","\uD83D\uDC3A","\uD83E\uDD84","\uD83D\uDC1D","\uD83E\uDD8B","\uD83D\uDC22","\uD83D\uDC0D","\uD83D\uDC19","\uD83E\uDD80","\uD83D\uDC2C","\uD83D\uDC33","\uD83E\uDD88","\uD83C\uDF4E","\uD83C\uDF4A","\uD83C\uDF4B","\uD83C\uDF4C","\uD83C\uDF49","\uD83C\uDF47","\uD83C\uDF53","\uD83C\uDF52","\uD83C\uDF51","\uD83C\uDF4D","\uD83C\uDF55","\uD83C\uDF54","\uD83C\uDF5F","\uD83C\uDF2D","\uD83C\uDF7F","\uD83C\uDF69","\uD83C\uDF6A","\uD83C\uDF82","\uD83C\uDF70","\u2615","\uD83C\uDF7A","\uD83C\uDF77","\uD83E\uDD42","\uD83C\uDF7B","\u26BD","\uD83C\uDFC0","\uD83C\uDFC8","\u26BE","\uD83C\uDFBE","\uD83C\uDFD0","\uD83C\uDFB1","\uD83C\uDFAE","\uD83D\uDD79\uFE0F","\uD83C\uDFB2","\u265F\uFE0F","\uD83C\uDFAF","\uD83C\uDFB3","\uD83C\uDFC6","\uD83E\uDD47","\uD83E\uDD48","\uD83E\uDD49","\uD83C\uDFC5","\uD83C\uDF96\uFE0F","\uD83C\uDFAA","\uD83C\uDFAD","\uD83C\uDFA8","\uD83C\uDFAC","\uD83C\uDFA4","\uD83C\uDFA7","\uD83C\uDFB5","\uD83C\uDFB6","\uD83D\uDE97","\uD83D\uDE95","\uD83D\uDE8C","\uD83C\uDFCE\uFE0F","\uD83D\uDE93","\uD83D\uDE91","\uD83D\uDE92","\u2708\uFE0F","\uD83D\uDE80","\uD83D\uDE81","\u26F5","\uD83C\uDFE0","\uD83C\uDFF0","\uD83D\uDDFD","\uD83D\uDDFC","\uD83C\uDFA1","\uD83C\uDFA2","\u26FA","\uD83C\uDF0B","\uD83C\uDFD6\uFE0F","\uD83D\uDD25","\u2728","\u2B50","\uD83C\uDF1F","\uD83D\uDCAB","\uD83D\uDCA5","\uD83D\uDCAF","\uD83D\uDCA2","\uD83D\uDCA4","\uD83C\uDF89","\uD83C\uDF8A","\uD83C\uDF81","\uD83C\uDF88","\uD83D\uDC51","\uD83D\uDC8E","\uD83D\uDCB0","\uD83D\uDCB5","\u2694\uFE0F","\uD83D\uDEE1\uFE0F","\uD83C\uDFF9","\uD83D\uDD2E","\uD83D\uDCFF","\uD83D\uDCDC","\uD83D\uDD6F\uFE0F","\uD83C\uDF19","\u2600\uFE0F","\u26A1","\u2744\uFE0F","\uD83C\uDF08","\uD83C\uDF40","\uD83C\uDF38","\uD83C\uDF39","\uD83C\uDF3B","\uD83C\uDF32","\u2705","\u274C","\u26A0\uFE0F","\u2753","\u2757","\uD83D\uDCAC","\uD83D\uDC40","\uD83D\uDCA1","\uD83D\uDCCC","\uD83D\uDD12","\uD83D\uDD11","\uD83D\uDD14","\u23F0","\uD83D\uDCF1","\uD83D\uDCBB","\uD83D\uDCF7"].forEach(function (face) {
  var button = document.createElement("button");
  button.type = "button";
  button.textContent = face;
  button.addEventListener("click", function (event) {
    event.preventDefault();
    var input = document.getElementById("chat-input");
    var start = input.selectionStart || 0;
    var end = input.selectionEnd || 0;
    var next = Array.from(input.value.slice(0, start) + face + input.value.slice(end)).slice(0, 200).join("");
    input.value = next;
    var pos = Math.min(start + face.length, next.length);
    input.focus();
    input.setSelectionRange(pos, pos);
  });
  document.getElementById("chat-emoji-box").appendChild(button);
});

document.getElementById("chat-emoji").addEventListener("click", function (event) {
  event.preventDefault();
  event.stopPropagation();
  document.getElementById("chat-emoji-box").classList.toggle("hide");
});

document.getElementById("chat-form").addEventListener("submit", function (event) {
  event.preventDefault();
  sendChat();
});

(function () {
  var face = "\uD83D\uDE00";
  var cut = chatText(face + "x".repeat(250));
  if (chatText("  a   b  ") !== "a b" || chatText("x".repeat(250)).length !== 200 || chatText("   ") !== "")
    throw new Error("chat");
  if (cut.indexOf(face) !== 0 || Array.from(cut).length !== 200) throw new Error("chat");
  var box = document.getElementById("chat-emoji-box");
  var seen = {};
  for (var i = 0; i < box.children.length; i++) {
    if (seen[box.children[i].textContent]) throw new Error("chat");
    seen[box.children[i].textContent] = 1;
  }
  if (box.children.length < 120) throw new Error("chat");
})();

function placeAccount() {
  var bar = document.getElementById("account-bar");
  if (!bar) return;
  bar.style.top = "";
  bar.style.left = "";
  bar.style.width = "";
  bar.style.transform = "";
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
