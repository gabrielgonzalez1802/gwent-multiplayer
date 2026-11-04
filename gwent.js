"use strict";

class Controller {}

// Websocket and Server config
var accountProfile = null;
let amReady = false;
let oponentReady = false;
let playerId = null;

const readyButtonElem = document.getElementById("start-game");
const oponentReadyElem = document.getElementById("oponent-ready");
const isOponentReadyElem = document.getElementById("oponent-ready");
const passButton = document.getElementById("pass-button");
const customizationElem = document.getElementById("deck-customization");
const gameStartControlsElem = document.getElementById("session-start-control");

if (socket) socket.onmessage = onSocketMessage;

async function onSocketMessage(event) {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case "welcome":
      playerId = data.playerId;
      console.log("Welcome");
      break;

    // Oponent has joined and the session is ready
    case "sessionReady":
      if (typeof clearHold === "function") clearHold();
      readyButtonElem.classList.remove("disabled");
      isOponentReadyElem.classList.remove("hidden");
      // sends the oponent which faction you're playing with
      netSend(
        JSON.stringify({ type: "opChangeFaction", faction: dm.faction }),
      );
      break;
    case "sessionRules":
      applySessionRules(data);
      break;
    case "sessionDeleted":
      Carousel.curr?.cancel();
      ui.enablePlayer(true);
      await ui.notification("win-opleft", 1200);

      game.returnToCustomization();
      cancelSession();
      break;
    // Oponent has left and the session is no longer ready
    case "sessionUnready":
      console.log("---------------------");
      console.log("Oponent left the game");

      isOponentReadyElem.classList.add("hidden");
      readyButtonElem.classList.add("disabled");

      break;

    // Oponent is ready. If you are ready begin the game immediately
    case "ready":
      player_op = new Player(1, "Oponent", data.deck);
      if (amReady) {
        customizationElem.classList.add("hide");
        gameStartControlsElem.classList.add("hide");

        game.startGame();
        return;
      } else {
        oponentReadyElem.classList.remove("disabled");
        oponentReady = true;
      }
      break;

    case "opChangeFaction":
      console.log("oponent has changed his faction");
      oponentReadyElem.querySelector("img").src =
        `img/icons/deck_shield_${data.faction}.png`;
      break;

    case "unReady":
      oponentReady = false;
      oponentReadyElem.classList.add("disabled");
      if (amReady) {
        readyButtonElem.classList.remove("ready");
        customizationElem.classList.remove("noclick");
      }
      break;

    // Initializes Oponent's updated Hand and Deck
    case "deck_hand_ready":
      data.deck = fillCardElements(data.deck, player_op);
      data.hand = fillCardElements(data.hand, player_op);

      player_op.hand.cards = data.hand;
      player_op.deck.cards = data.deck;
      break;

    // Game-start
    case "start":
      console.log("----------==o==----------");
      console.log("Match start!");

      game.startRound();
      tocar("game_start", false);
      break;

    // Game - Oponent plays card
    case "play":
      const card = player_op.hand.cards.find(
        (c) => c.filename === data.card.filename,
      );

      const splitRowName = data.row.split("-");
      let row;
      if (splitRowName.length > 1) {
        const targetRow = splitRowName[0] === "self" ? "target" : "self";
        row = board.row.find(
          (r) => r.elem_parent.id === `${targetRow}-${splitRowName[1]}`,
        );
      } else {
        row = data.row;
      }

      if (data.card.filename === "decoy") {
        const replacedCard = row.cards.find(
          (bc) => bc.filename === data.target.filename,
        );
        if (!replacedCard) return;

        board.moveTo(replacedCard, player_op.hand, row);
      }

      if (row === "weather") await player_op.playCard(card, row);
      else if (data.card.filename === "scorch")
        await player_op.playScorch(card);
      else await player_op.playCardToRow(card, row);
      break;

    // Game - Oponent pass
    case "pass":
      player_op.passRound();
      break;

    case "forcedPass":
      clearTurnClock();
      if (data.player === playerId) {
        if (player_me && !player_me.passed) player_me.passRound();
      } else if (player_op && !player_op.passed) {
        player_op.passRound();
      }
      break;

    case "redrawTimeout":
      clearTurnClock();
      if (typeof Carousel !== "undefined" && Carousel.curr) Carousel.curr.exit();
      break;

    case "readyAck":
      readyButtonElem.disabled = false;
      break;

    // Game - Oponent used the leader card
    case "useLeader":
      player_op.activateLeader();
      break;

    case "skelligeAbility":
      const playedCards = data.cards.map((c) => c.filename);

      const cardCounts = playedCards.reduce((counts, filename) => {
        counts[filename] = (counts[filename] || 0) + 1;
        return counts;
      }, {});

      const graveCards = [];
      Object.entries(cardCounts).forEach(([filename, neededCount]) => {
        const matchingCards = player_op.grave.findCards(
          (gc) => gc.filename === filename,
        );
        const cardsToTake = matchingCards.slice(0, neededCount);
        graveCards.push(...cardsToTake);
      });

      await Promise.all(
        graveCards.map((card) => board.toRow(card, player_op.grave)),
      );

    case "monstersKeepCard":
      const keptCard = board
        .getRow(data.card, data.card.row, player_op)
        .findCard((c) => c.filename === data.card.filename);
      if (!keptCard) return;
      keptCard.noRemove = true;
      game.roundStart.push(async () => {
        await ui.notification("monsters", 1200);
        delete keptCard.noRemove;
        return true;
      });
  }
}

function fillCardElements(cards, player) {
  for (let i = 0; i < cards.length; i++) {
    const cardFromDict = card_dict.find(
      (dict) => dict.filename === cards[i].filename,
    );
    cards[i] = new Card(cardFromDict, player);
  }
  return cards;
}

// Oponent Controller
class ControllerOponent {
  constructor(player) {
    player.tag = "op";

    this.player = player;
  }
}

// Can make actions during turns like playing cards that it owns
class Player {
  constructor(id, name, deck) {
    this.id = id;
    this.tag = id === 0 ? "me" : "op";
    this.controller =
      id === 0
        ? new Controller()
        : gameMode === "offline"
          ? new ControllerAI(this)
          : new ControllerOponent(this);

    this.hand =
      id === 0
        ? new Hand(document.getElementById("hand-row"))
        : new HandOponent();
    this.grave = new Grave(document.getElementById("grave-" + this.tag));
    this.deck = new Deck(
      deck.faction,
      document.getElementById("deck-" + this.tag),
    );
    this.deck_data = deck;

    this.leader = new Card(deck.leader, this);
    this.elem_leader = document.getElementById("leader-" + this.tag);
    this.elem_leader.children[0].appendChild(this.leader.elem);

    this.reset();

    this.name = name;
    document.getElementById("name-" + this.tag).innerHTML = displayName(name);

    document.getElementById("deck-name-" + this.tag).innerHTML = factionField(
      deck.faction,
      "name",
    );
    document
      .getElementById("stats-" + this.tag)
      .getElementsByClassName("profile-img")[0].children[0].children[0];
    let x = document.querySelector(
      "#stats-" + this.tag + " .profile-img > div > div",
    );
    x.style.backgroundImage = iconURL("deck_shield_" + deck.faction);
  }

  // Sets default values
  reset() {
    this.grave.reset();
    this.hand.reset();
    this.deck.reset();
    this.deck.initializeFromID(this.deck_data.cards, this);

    this.health = 2;
    this.total = 0;
    this.passed = false;
    this.handsize = 10;
    this.winning = false;

    this.enableLeader();
    this.setPassed(false);
    document.getElementById("gem1-" + this.tag).classList.add("gem-on");
    document.getElementById("gem2-" + this.tag).classList.add("gem-on");
  }

  // Returns the opponent Player
  opponent() {
    return board.opponent(this);
  }

  // Updates the player's total score and notifies the gamee
  updateTotal(n) {
    this.total += n;
    document.getElementById("score-total-" + this.tag).children[0].innerHTML =
      this.total;
    board.updateLeader();
  }

  // Puts the player in the winning state
  setWinning(isWinning) {
    if (this.winning ^ isWinning)
      document
        .getElementById("score-total-" + this.tag)
        .classList.toggle("score-leader");
    this.winning = isWinning;
  }

  // Puts the player in the passed state
  setPassed(hasPassed) {
    if (this.passed ^ hasPassed)
      document.getElementById("passed-" + this.tag).classList.toggle("passed");
    this.passed = hasPassed;
  }

  // Sets up board for turn
  async startTurn() {
    document.getElementById("stats-" + this.tag).classList.add("current-turn");
    if (this.leaderAvailable)
      this.elem_leader.children[1].classList.remove("hide");

    if (this === player_me) {
      document.getElementById("pass-button").classList.remove("noclick");
    }

    if (this.controller instanceof ControllerAI) {
      try {
        await this.controller.startTurn(this);
      } catch (err) {
        // ponytail: a bad CPU play used to reject the turn and leave the board locked. Passing hands it back. The upgrade is to reject illegal plays before they start.
        console.error(err);
        if (game.currPlayer === this && !this.passed) this.passRound();
      }
    }
  }

  // Passes the round and ends the turn
  passRound() {
    clearTurnClock();
    this.setPassed(true);
    this.endTurn();
  }

  // Plays a scorch card
  async playScorch(card) {
    await this.playCardAction(
      card,
      async () => await ability_dict["scorch"].activated(card),
    );
  }

  // Plays a card to a specific row
  async playCardToRow(card, row) {
    await this.playCardAction(
      card,
      async () => await board.moveTo(card, row, this.hand),
    );
  }

  // Plays a card to the board
  async playCard(card) {
    await this.playCardAction(card, async () => await card.autoplay(this.hand));
  }

  // Shows a preview of the card being played, plays it to the board and ends the turn
  async playCardAction(card, action) {
    clearTurnClock();
    ui.showPreviewVisuals(card);
    await sleep(1000);
    ui.hidePreview(card);
    await action();
    this.endTurn();
  }

  // Handles end of turn visuals and behavior the notifies the game
  endTurn() {
    if (!this.passed && !this.canPlay()) this.setPassed(true);
    if (this === player_me) {
      document.getElementById("pass-button").classList.add("noclick");
    }
    document
      .getElementById("stats-" + this.tag)
      .classList.remove("current-turn");
    this.elem_leader.children[1].classList.add("hide");
    game.endTurn();
  }

  // Tells the the Player if it won the round. May damage health.
  endRound(win) {
    if (!win) {
      if (this.health < 1) return;
      document
        .getElementById("gem" + this.health + "-" + this.tag)
        .classList.remove("gem-on");
      this.health--;
    }
    this.setPassed(false);
    this.setWinning(false);
  }

  // Returns true if the Player can make any action other than passing
  canPlay() {
    return this.hand.cards.length > 0 || this.leaderAvailable;
  }

  // Use a leader's Activate ability, then disable the leader
  async activateLeader() {
    ui.showPreviewVisuals(this.leader);
    await sleep(1500);
    ui.hidePreview(this.leader);
    await this.leader.activated[0](this.leader, this);
    this.disableLeader();
    this.endTurn();
  }

  // Disable access to leader ability and toggles leader visuals to off state
  disableLeader() {
    this.leaderAvailable = false;
    let elem = this.elem_leader.cloneNode(true);
    this.elem_leader.parentNode.replaceChild(elem, this.elem_leader);
    this.elem_leader = elem;
    this.elem_leader.children[0].classList.add("fade");
    this.elem_leader.children[1].classList.add("hide");
    this.elem_leader.addEventListener(
      "click",
      async () => await ui.viewCard(this.leader),
      false,
    );
  }

  // Enable access to leader ability and toggles leader visuals to on state
  enableLeader() {
    this.leaderAvailable = this.leader.activated.length > 0;
    let elem = this.elem_leader.cloneNode(true);
    this.elem_leader.parentNode.replaceChild(elem, this.elem_leader);
    this.elem_leader = elem;
    this.elem_leader.children[0].classList.remove("fade");
    this.elem_leader.children[1].classList.remove("hide");

    if (this.id === 0 && this.leader.activated.length > 0) {
      this.elem_leader.addEventListener("click", async () => {
        await ui.viewCard(this.leader, async () => {
          netSend(JSON.stringify({ type: "useLeader", player: this.id }));
          await this.activateLeader();
        });
      });
    } else {
      this.elem_leader.addEventListener(
        "click",
        async () => await ui.viewCard(this.leader),
        false,
      );
    }

    // TODO set crown color
  }
}

// Handles the adding, removing and formatting of cards in a container
class CardContainer {
  constructor(elem) {
    this.elem = elem;
    this.cards = [];
  }

  // Returns the first card that satisfies the predcicate. Does not modify container.
  findCard(predicate) {
    for (let i = this.cards.length - 1; i >= 0; --i)
      if (predicate(this.cards[i])) return this.cards[i];
  }

  // Returns a list of cards that satisfy the predicate. Does not modify container.
  findCards(predicate) {
    return this.cards.filter(predicate);
  }

  // Returns a list of up to n cards that satisfy the predicate. Does not modify container.
  findCardsRandom(predicate, n) {
    let valid = predicate ? this.cards.filter(predicate) : this.cards;
    if (valid.length === 0) return [];
    if (!n || n === 1) return [valid[randomInt(valid.length)]];
    let out = [];
    for (let i = Math.min(n, valid.length); i > 0; --i) {
      let index = randomInt(valid.length);
      out.push(valid.splice(index, 1)[0]);
    }
    return out;
  }

  // Removes and returns a list of cards that satisy the predicate.
  getCards(predicate) {
    return this.cards
      .reduce((a, c, i) => (predicate(c, i) ? [i] : []).concat(a), [])
      .map((i) => this.removeCard(i));
  }

  // Removes and returns a card that satisfies the predicate.
  getCard(predicate) {
    for (let i = this.cards.length - 1; i >= 0; --i)
      if (predicate(this.cards[i])) return this.removeCard(i);
  }

  // Removes and returns any cards up to n that satisfy the predicate.
  getCardsRandom(predicate, n) {
    return this.findCardsRandom(predicate, n).map((c) => this.removeCard(c));
  }

  // Adds a card to the container along with its associated HTML element.
  addCard(card, index) {
    this.cards.push(card);
    this.addCardElement(card, index ? index : 0);
    this.resize();
  }

  // Removes a card from the container along with its associated HTML element.
  removeCard(card, index) {
    if (this.cards.length === 0)
      throw "Cannot draw from empty " + this.constructor.name;
    card = this.cards.splice(
      isNumber(card) ? card : this.cards.indexOf(card),
      1,
    )[0];
    this.removeCardElement(card, index ? index : 0);
    this.resize();
    return card;
  }

  // Adds a card to a pre-sorted CardContainer
  addCardSorted(card, index) {
    let i = index ?? this.getSortedIndex(card);
    this.cards.splice(i, 0, card);
    return i;
  }

  // Returns the expected index of a card in a sorted CardContainer
  getSortedIndex(card) {
    for (var i = 0; i < this.cards.length; ++i)
      if (Card.compare(card, this.cards[i]) < 0) break;
    return i;
  }

  // Adds a card to a random index of the CardContainer
  addCardRandom(card) {
    this.cards.push(card);
    let index = randomInt(this.cards.length);
    if (index !== this.cards.length - 1) {
      let t = this.cards[this.cards.length - 1];
      this.cards[this.cards.length - 1] = this.cards[index];
      this.cards[index] = t;
    }
    return index;
  }

  // Removes the HTML elemenet associated with the card from this CardContainer
  removeCardElement(card, index) {
    if (this.elem) this.elem.removeChild(card.elem);
  }

  // Adds the HTML elemenet associated with the card to this CardContainer
  addCardElement(card, index) {
    if (this.elem) {
      if (index === this.cards.length) thise.elem.appendChild(card.elem);
      else this.elem.insertBefore(card.elem, this.elem.children[index]);
    }
  }

  // Empty function to be overried by subclasses that resize their content
  resize() {}

  // Modifies the margin of card elements inside a row-like container to stack properly
  resizeCardContainer(overlap_count, gap, coef) {
    let n = this.elem.children.length;
    let param =
      n < overlap_count ? "" + gap + "vw" : defineCardRowMargin(n, coef);
    let children = this.elem.getElementsByClassName("card");
    for (let x of children) x.style.marginLeft = x.style.marginRight = param;

    function defineCardRowMargin(n, coef = 0) {
      return (
        "calc((100% - (4.45vw * " +
        n +
        ")) / (2*" +
        n +
        ") - (" +
        coef +
        "vw * " +
        n +
        "))"
      );
    }
  }

  // Allows the row to be clicked
  setSelectable() {
    this.elem.classList.add("row-selectable");
  }

  // Disallows the row to be clicked
  clearSelectable() {
    this.elem.classList.remove("row-selectable");
    for (card in this.cards) card.elem.classList.add("noclick");
  }

  // Returns the container to its default, empty state
  reset() {
    while (this.cards.length) this.removeCard(0);
    if (this.elem)
      while (this.elem.firstChild) this.elem.removeChild(this.elem.firstChild);
    this.cards = [];
  }
}

// Contians all used cards in the order that they were discarded
class Grave extends CardContainer {
  constructor(elem) {
    super(elem);
    elem.addEventListener("click", () => ui.viewCardsInContainer(this), false);
  }

  // Override
  addCard(card) {
    this.setCardOffset(card, this.cards.length);
    super.addCard(card, this.cards.length);
  }

  // Override
  removeCard(card) {
    let n = isNumber(card) ? card : this.cards.indexOf(card);
    return super.removeCard(card, n);
  }

  // Override
  removeCardElement(card, index) {
    card.elem.style.left = "";
    super.removeCardElement(card, index);
    setTimeout(() => {
      for (let i = index; i < this.cards.length; ++i) {
        this.setCardOffset(this.cards[i], i);
      }
    }, 500);
  }

  // Offsets the card element in the deck
  setCardOffset(card, n) {
    card.elem.style.left = -0.03 * n + "vw";
  }
}

// Contains a randomized set of cards to be drawn from
class Deck extends CardContainer {
  constructor(faction, elem) {
    super(elem);
    this.faction = faction;

    this.counter = document.createElement("div");
    this.counter.classList = "deck-counter center";
    this.counter.appendChild(document.createTextNode(this.cards.length));
    this.elem.appendChild(this.counter);
  }

  // Creates duplicates of cards with a count of more than one, then initializes deck
  initializeFromID(card_id_list, player) {
    this.initialize(
      card_id_list.reduce(
        (a, c) => a.concat(clone(c.count, card_dict[c.index])),
        [],
      ),
      player,
    );
    function clone(n, elem) {
      for (var i = 0, a = []; i < n; ++i) a.push(elem);
      return a;
    }
  }

  // Populates a deck with a list of card data and associated those cards with the owner of this deck.
  initialize(card_data_list, player) {
    for (let i = 0; i < card_data_list.length; ++i) {
      let card = new Card(card_data_list[i], player);
      card.holder = player;
      this.addCardRandom(card);
      this.addCardElement();
    }
    this.resize();
  }

  // Override
  addCard(card) {
    this.addCardRandom(card);
    this.addCardElement();
    this.resize();
  }

  // Sends the top card from the Deck to the Hand
  async draw(hand) {
    let drawnCard = null;
    tocar("game_buy", false);
    if (hand === player_op.hand) {
      drawnCard = this.removeCard(0);
      hand.addCard(drawnCard);
    } else {
      drawnCard = this.cards[0];
      await board.toHand(drawnCard, this);
    }

    if (drawnCard !== null) return drawnCard;
  }

  // Draws a card and sends it to the container before adding a card from the container back to the deck.
  swap(container, card) {
    container.addCard(this.removeCard(0));
    this.addCard(card);
  }

  // Override
  addCardElement() {
    let elem = document.createElement("div");
    elem.classList.add("deck-card");
    elem.style.backgroundImage = iconURL("deck_back_" + this.faction, "jpg");
    this.setCardOffset(elem, this.cards.length - 1);
    this.elem.insertBefore(elem, this.counter);
  }

  // Override
  removeCardElement() {
    this.elem.removeChild(this.elem.children[this.cards.length]).style.left =
      "";
  }

  // Offsets the card element in the deck
  setCardOffset(elem, n) {
    elem.style.left = -0.03 * n + "vw";
  }

  // Override
  resize() {
    this.counter.innerHTML = this.cards.length;
    this.setCardOffset(this.counter, this.cards.length);
  }

  // Override
  reset() {
    super.reset();
    this.elem.appendChild(this.counter);
  }
}

// Hand used by Oponent. Has an offscreen HTML element for card transitions.
class HandOponent extends CardContainer {
  constructor() {
    super(undefined);
    this.counter = document.getElementById("hand-count-op");
    this.hidden_elem = document.getElementById("hand-op");
  }
  resize() {
    this.counter.innerHTML = this.cards.length;
  }
}

// Hand used by current player
class Hand extends CardContainer {
  constructor(elem) {
    super(elem);
    this.counter = document.getElementById("hand-count-me");
  }

  // Override
  addCard(card) {
    let i = this.addCardSorted(card);
    this.addCardElement(card, i);
    this.resize();
  }

  // Override
  resize() {
    this.counter.innerHTML = this.cards.length;
    this.resizeCardContainer(11, 0.075, 0.00225);
  }
}

// Contains active cards and effects. Calculates the current score of each card and the row.
class Row extends CardContainer {
  constructor(elem) {
    super(elem.getElementsByClassName("row-cards")[0]);
    this.elem_parent = elem;
    this.type = /siege/.test(elem.id)
      ? "siege"
      : /ranged/.test(elem.id)
        ? "ranged"
        : "close";
    this.elem_special = elem.getElementsByClassName("row-special")[0];
    this.special = null;
    this.total = 0;
    this.halfWeather = false;
    this.effects = {
      weather: false,
      bond: {},
      morale: 0,
      horn: 0,
      mardroeme: 0,
    };
    this.elem.addEventListener("click", function (event) {
      if (clickedCard(event) && cardClickAction(null, ui.previewCard, myKeyTurn()) !== "row") return;
      ui.selectRow(this);
    }, true);
    this.elem_special.addEventListener("click", function (event) {
      if (clickedCard(event) && cardClickAction(null, ui.previewCard, myKeyTurn()) !== "row") return;
      ui.selectRow(this);
    }, false);
    this.elem.addEventListener("mouseover", function () {
      tocar("card", false);
      this.style.boxShadow = "0 0 1.5vw #6d5210";
    });
    this.elem.addEventListener("mouseout", function () {
      this.style.boxShadow = "0 0 0 #6d5210";
    });
  }

  // Override
  async addCard(card) {
    let index = undefined;
    if (card.isSpecial()) {
      this.special = card;
      this.elem_special.appendChild(card.elem);
    } else {
      index = this.addCardSorted(card);
      this.addCardElement(card, index);
      this.resize();
    }
    this.updateState(card, true);
    for (let x of card.placed) await x(card, this);
    card.elem.classList.add("noclick");
    await sleep(600);
    this.updateScore();
    return index;
  }

  // Override
  removeCard(card) {
    card = isNumber(card)
      ? card === -1
        ? this.special
        : this.cards[card]
      : card;
    if (card.isSpecial()) {
      this.special = null;
      this.elem_special.removeChild(card.elem);
    } else {
      super.removeCard(card);
      card.resetPower();
    }
    this.updateState(card, false);
    for (let x of card.removed) x(card);
    this.updateScore();
    return card;
  }

  // Override
  removeCardElement(card, index) {
    super.removeCardElement(card, index);
    let x = card.elem;
    x.style.marginLeft = x.style.marginRight = "";
    x.classList.remove("noclick");
  }

  // Score copy used by the offline opponent. It does not touch the board.
  getVirtualCopy() {
    const copy = Object.create(Row.prototype);
    copy.effects = Object.assign({}, this.effects, {
      bond: Object.assign({}, this.effects.bond),
    });
    copy.cards = this.cards.slice();
    copy.special = this.special;
    copy.type = this.type;
    return copy;
  }

  updateState(card, activate) {
    for (let x of card.abilities) {
      switch (x) {
        case "morale":
        case "horn":
        case "mardroeme":
          this.effects[x] += activate ? 1 : -1;
          break;
        case "bond":
          if (!this.effects.bond[card.id()]) this.effects.bond[card.id()] = 0;
          this.effects.bond[card.id()] += activate ? 1 : -1;
          break;
      }
    }
  }

  // Activates weather effect and visuals
  addOverlay(overlay) {
    var som =
      overlay == "fog" || overlay == "rain"
        ? overlay
        : overlay == "frost"
          ? "cold"
          : "";
    if (som != "") tocar(som, false);
    this.effects.weather = true;
    this.elem_parent
      .getElementsByClassName("row-weather")[0]
      .classList.add(overlay);
    this.updateScore();
  }

  // Deactivates weather effect and visuals
  removeOverlay(overlay) {
    this.effects.weather = false;
    this.elem_parent
      .getElementsByClassName("row-weather")[0]
      .classList.remove(overlay);
    this.updateScore();
  }

  // Override
  resize() {
    this.resizeCardContainer(10, 0.075, 0.00325);
  }

  // Updates the row's score by summing the current power of its cards
  updateScore() {
    let total = 0;
    for (let card of this.cards) {
      total += this.cardScore(card);
    }
    let player =
      this.elem_parent.parentElement.id === "field-op" ? player_op : player_me;
    player.updateTotal(total - this.total);
    this.total = total;
    this.elem_parent.getElementsByClassName("row-score")[0].innerHTML =
      this.total;
  }

  // Calculates and set the card's current power
  cardScore(card) {
    let total = this.calcCardScore(card);
    card.setPower(total);
    return total;
  }

  // Calculates the current power of a card affected by row affects
  calcCardScore(card) {
    if (card.name === "decoy") return 0;
    let total = card.basePower;
    if (card.hero) return total;
    if (this.effects.weather) total = weatheredPower(total, this.halfWeather);
    if (game.doubleSpyPower && card.abilities.includes("spy")) total *= 2;
    let bond = this.effects.bond[card.id()];
    if (isNumber(bond) && bond > 1) total *= Number(bond);
    total += Math.max(
      0,
      this.effects.morale + (card.abilities.includes("morale") ? -1 : 0),
    );
    if (this.effects.horn - (card.abilities.includes("horn") ? 1 : 0) > 0)
      total *= 2;
    return total;
  }

  calcScore() {
    let total = 0;
    for (let card of this.cards) total += this.calcCardScore(card);
    return total;
  }

  // Applies a temporary leader horn affect that is removed at the end of the round
  async leaderHorn() {
    if (this.special !== null) return;
    let horn = new Card(card_dict[5], null);
    await this.addCard(horn);
    game.roundEnd.push(() => this.removeCard(horn));
  }

  // Applies a local scorch effect to this row
  async scorch() {
    if (this.total >= 10)
      await Promise.all(
        this.maxUnits().map(async (c) => {
          await c.animate("scorch", true, false);
          await board.toGrave(c, this);
        }),
      );
  }

  // Removes all cards and effects from this row
  clear() {
    if (this.special != null) board.toGrave(this.special, this);
    this.cards
      .filter((c) => !c.noRemove)
      .forEach((c) => board.toGrave(c, this));
  }

  // Returns all regular unit cards with the heighest power
  maxUnits() {
    let max = [];
    for (let i = 0; i < this.cards.length; ++i) {
      let card = this.cards[i];
      if (!card.isUnit()) continue;
      if (!max[0] || max[0].power < card.power) max = [card];
      else if (max[0].power === card.power) max.push(card);
    }
    return max;
  }

  // Override
  reset() {
    super.reset();
    while (this.special) this.removeCard(this.special);
    while (this.elem_special.firstChild)
      this.elem_special.removeChild(this.elem_speical.firstChild);
    this.total = 0;
    //["rain","fog","frost"].forEach( w => this.removeOverlay(w) );
    this.halfWeather = false;
    this.effects = {
      weather: false,
      bond: {},
      morale: 0,
      horn: 0,
      mardroeme: 0,
    };
  }
}

// Handles how weather effects are added and removed
class Weather extends CardContainer {
  constructor(elem) {
    super(document.getElementById("weather"));
    this.types = {
      rain: { name: "rain", count: 0, rows: [] },
      fog: { name: "fog", count: 0, rows: [] },
      frost: { name: "frost", count: 0, rows: [] },
    };
    let i = 0;
    for (let key of Object.keys(this.types))
      this.types[key].rows = [board.row[i], board.row[5 - i++]];

    this.elem.addEventListener("click", function (event) {
      if (clickedCard(event) && cardClickAction(null, ui.previewCard, myKeyTurn()) !== "row") return;
      ui.selectRow(this);
    }, false);
  }

  // Adds a card if unique and clears all weather if 'clear weather' card added
  async addCard(card) {
    super.addCard(card);
    card.elem.classList.add("noclick");
    if (card.name === "Clear Weather") {
      // TODO Sunlight animation
      tocar("clear", false);
      await sleep(500);
      this.clearWeather();
    } else {
      this.changeWeather(
        card,
        (x) => ++this.types[x].count === 1,
        (r, t) => r.addOverlay(t.name),
      );
      for (let i = this.cards.length - 2; i >= 0; --i) {
        if (card.name === this.cards[i].name) {
          await sleep(750);
          await board.toGrave(card, this);
          break;
        }
      }
    }
    await sleep(750);
  }

  // Override
  removeCard(card) {
    card = super.removeCard(card);
    card.elem.classList.remove("noclick");
    this.changeWeather(
      card,
      (x) => --this.types[x].count === 0,
      (r, t) => r.removeOverlay(t.name),
    );
    return card;
  }

  // Checks if a card's abilities are a weather type. If the predicate is met, perfom the action
  // on the type's associated rows
  changeWeather(card, predicate, action) {
    for (let x of card.abilities) {
      if (x in this.types && predicate(x)) {
        for (let r of this.types[x].rows) action(r, this.types[x]);
      }
    }
  }

  // Removes all weather effects and cards
  async clearWeather() {
    await Promise.all(
      this.cards
        .map((c, i) => this.cards[this.cards.length - i - 1])
        .map((c) => board.toGrave(c, this)),
    );
  }

  // Override
  resize() {
    this.resizeCardContainer(4, 0.075, 0.045);
  }

  // Override
  reset() {
    super.reset();
    Object.keys(this.types).map((t) => (this.types[t].count = 0));
  }
}

//
class Board {
  constructor() {
    this.op_score = 0;
    this.me_score = 0;
    this.row = [];
    for (let x = 0; x < 6; ++x) {
      let elem = document.getElementById(x < 3 ? "field-op" : "field-me")
        .children[x % 3];
      this.row[x] = new Row(elem);
    }
  }

  // Get the opponent of this Player
  opponent(player) {
    return player === player_me ? player_op : player_me;
  }

  // Finds the first card by a given filename; If none are found returns null
  findCardByName(filename, targetRow = null) {
    let foundCard = null;
    for (const row of board.row) {
      if (targetRow !== null && targetRow !== row.elem_parent.id) continue;
      keptCard = row.cards.find((bc) => bc.filename === data.card.filename);
      if (foundCard) break;
    }

    return foundCard ?? null;
  }

  // Sends and translates a card from the source to the Deck of the card's holder
  async toDeck(card, source) {
    tocar("discard", false);
    await this.moveTo(card, "deck", source);
  }

  // Sends and translates a card from the source to the Grave of the card's holder
  async toGrave(card, source) {
    await this.moveTo(card, "grave", source);
  }

  // Sends and translates a card from the source to the Hand of the card's holder
  async toHand(card, source) {
    await this.moveTo(card, "hand", source);
  }

  // Sends and translates a card from the source to Weather
  async toWeather(card, source) {
    await this.moveTo(card, weather, source);
  }

  // Sends and translates a card from the source to the Deck of the card's combat row
  async toRow(card, source) {
    let row = card.row === "agile" ? "close" : card.row ? card.row : "close";
    if (
      card.row === "agile" &&
      card.holder &&
      card.holder.controller instanceof ControllerAI
    ) {
      row = card.holder.controller.determineAgileRow(card).type;
    }
    await this.moveTo(card, row, source);
  }

  // Sends and translates a card from the source to a specified row name or CardContainer
  async moveTo(card, dest, source) {
    if (isString(dest)) dest = this.getRow(card, dest);

    try {
      cartaNaLinha(dest.elem.id, card);
    } catch (err) {}
    await translateTo(card, source ? source : null, dest);
    await dest.addCard(source ? source.removeCard(card) : card);
  }

  // Sends and translates a card from the source to a row name associated with the passed player
  async addCardToRow(card, row_name, player, source) {
    let row = this.getRow(card, row_name, player);
    try {
      cartaNaLinha(row.elem.id, card);
    } catch (err) {}
    await translateTo(card, source, row);
    await row.addCard(card);
  }

  // Returns the CardCard associated with the row name that the card would be sent to
  getRow(card, row_name, player) {
    player = player ? player : card ? card.holder : player_me;
    let isMe = player === player_me;
    let isSpy = card.abilities.includes("spy");
    switch (row_name) {
      case "weather":
        return weather;
        break;
      case "close":
        return this.row[isMe ^ isSpy ? 3 : 2];
      case "ranged":
        return this.row[isMe ^ isSpy ? 4 : 1];
      case "siege":
        return this.row[isMe ^ isSpy ? 5 : 0];
      case "grave":
        return player.grave;
      case "deck":
        return player.deck;
      case "hand":
        return player.hand;
      default:
        console.error(
          card.name +
            ' sent to incorrect row "' +
            row_name +
            '" by ' +
            card.holder.name,
        );
    }
  }

  // Updates which player currently is in the lead
  updateLeader() {
    let dif = player_me.total - player_op.total;
    player_me.setWinning(dif > 0);
    player_op.setWinning(dif < 0);
  }
}

class Game {
  constructor() {
    this.endScreen = document.getElementById("end-screen");
    let buttons = this.endScreen.getElementsByTagName("button");
    this.customize_elem = buttons[0];
    this.replay_elem = buttons[1];
    this.customize_elem.addEventListener(
      "click",
      () => this.returnToCustomization(),
      false,
    );
    this.replay_elem.addEventListener("click", () => this.restartGame(), false);
    this.reset();
  }

  reset() {
    this.firstPlayer;
    this.currPlayer = null;

    this.gameStart = [];
    this.roundStart = [];
    this.roundEnd = [];
    this.turnStart = [];
    this.turnEnd = [];

    this.roundCount = 0;
    this.roundHistory = [];

    this.randomRespawn = false;
    this.doubleSpyPower = false;

    weather.reset();
    board.row.forEach((r) => r.reset());
  }

  // Sets up player faction abilities and psasive leader abilities
  initPlayers(p1, p2) {
    let l1 = ability_dict[p1.leader.abilities[0]];
    let l2 = ability_dict[p2.leader.abilities[0]];
    if (
      l1 === ability_dict["emhyr_whiteflame"] ||
      l2 === ability_dict["emhyr_whiteflame"]
    ) {
      p1.disableLeader();
      p2.disableLeader();
    } else {
      initLeader(p1, l1);
      initLeader(p2, l2);
    }
    if (p1.deck.faction === p2.deck.faction && p1.deck.faction === "scoiatael")
      return;
    initFaction(p1);
    initFaction(p2);

    function initLeader(player, leader) {
      if (leader.placed) leader.placed(player.leader);
      Object.keys(leader)
        .filter((key) => game[key])
        .map((key) => game[key].push(leader[key]));
    }

    function initFaction(player) {
      if (
        factions[player.deck.faction] &&
        factions[player.deck.faction].factionAbility
      )
        factions[player.deck.faction].factionAbility(player);
    }
  }

  // Initializes player abilities, hands and waits for cointoss
  async startGame() {
    if (tutorialOn && tutorialPhase !== "match") endTutorial();
    gameStartControlsElem.classList.add("hide");
    document.getElementById("lobby-bar").classList.add("hide");
    document.getElementById("top-menu").classList.add("hide");
    closeMenus();
    var accountBar = document.getElementById("account-bar");
    var betPanel = document.getElementById("bet-panel");
    if (accountBar) accountBar.classList.add("hide");
    if (betPanel) betPanel.classList.add("hide");
    isOponentReadyElem.classList.add("hidden");
    ui.toggleMusic_elem.style.left = "26vw";

    ui.toggleMusic_elem.classList.remove("music-customization");
    if (gameMode === "offline") {
      this.cpuPaid = false;
      if (accountProfile && typeof startCpuMatch === "function")
        startCpuMatch(player_me.deck.faction, player_op.deck.faction);
    }
    this.currPlayer = player_me;
    this.initPlayers(player_me, player_op);
    await Promise.all(
      [...Array(10).keys()].map(async () => {
        await player_me.deck.draw(player_me.hand);
        await player_op.deck.draw(player_op.hand);
      }),
    );

    await this.runEffects(this.gameStart);
    tocar("game_opening", false);
    if (gameMode === "offline") {
      const meST = player_me.deck.faction === "scoiatael";
      const opST = player_op.deck.faction === "scoiatael";
      if (opST && !meST) {
        game.firstPlayer = player_me;
        game.currPlayer = player_me;
      } else if (!meST || opST) {
        await this.coinToss();
      }
      await this.initialRedraw();
      return;
    }
    if (
      player_op.deck.faction === "scoiatael" &&
      player_me.deck.faction !== "scoiatael"
    ) {
      await new Promise((resolve) => {
        const handleMessage = async (event) => {
          const data = JSON.parse(event.data);

          if (data.type === "scoiataelStart") {
            const player = data.first === "me" ? player_op : player_me;
            game.firstPlayer = player;
            game.currPlayer = player;
            socket.removeEventListener("message", handleMessage);
            resolve(true);
          }
        };
        socket.addEventListener("message", handleMessage);
      });

      netSend(JSON.stringify({ type: "gameStart" }));
      await this.initialRedraw();
    } else if (
      player_me.deck.faction === "scoiatael" &&
      player_op.deck.faction !== "scoiatael"
    ) {
      netSend(JSON.stringify({ type: "gameStart" }));

      await this.initialRedraw();
    } else {
      netSend(JSON.stringify({ type: "gameStart" }));
      await this.coinToss();

      await this.initialRedraw();
    }
  }

  // Determines who starts first
  async coinToss() {
    if (gameMode === "offline") {
      const player = Math.random() < 0.5 ? player_me : player_op;
      game.firstPlayer = player;
      game.currPlayer = player;
      if (player === player_me) {
        passButton.classList.remove("hidden");
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);
      }
      await ui.notification(player.tag + "-coin", 1200);
      return;
    }
    return new Promise((resolve) => {
      const handleMessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "coinToss") {
          let player;
          if (data.player === playerId) {
            player = player_me;
            passButton.classList.remove("hidden");
            document.addEventListener("keydown", handleKeyDown);
            document.addEventListener("keyup", handleKeyUp);
          } else {
            player = player_op;
          }
          game.firstPlayer = player;
          game.currPlayer = player;

          socket.removeEventListener("message", handleMessage);
          await ui.notification(game.firstPlayer.tag + "-coin", 1200);
          resolve(true);
        }
      };
      socket.addEventListener("message", handleMessage);
    });
  }

  // Allows the player to swap out up to two cards from their iniitial hand
  async initialRedraw() {
    if (gameMode === "online") {
      showTurnClock(true);
      netSend(JSON.stringify({ type: "redrawClock" }));
    }
    await ui.queueCarousel(
      player_me.hand,
      2,
      async (c, i) => await player_me.deck.swap(c, c.removeCard(i)),
      (c) => true,
      true,
      true,
      "redraw_hint",
    );
    clearTurnClock();
    ui.enablePlayer(false);

    if (gameMode === "offline") {
      if (player_op.controller instanceof ControllerAI)
        player_op.controller.redraw();
      await this.startRound();
      return;
    }

    netSend(
      JSON.stringify({
        type: "finished_redraw",
      }),
    );
    netSend(
      JSON.stringify({
        type: "deck_hand_ready",
        hand: removeCircularReferences(player_me.hand.cards),
        deck: removeCircularReferences(player_me.deck.cards),
      }),
    );
  }

  // Initiates a new round of the game
  async startRound() {
    this.roundCount++;
    this.currPlayer =
      this.roundCount % 2 === 0
        ? this.firstPlayer
        : this.firstPlayer.opponent();
    await this.runEffects(this.roundStart);

    if (!player_me.canPlay()) player_me.setPassed(true);
    if (!player_op.canPlay()) player_op.setPassed(true);

    if (player_op.passed && player_me.passed) return this.endRound();

    if (this.currPlayer.passed) this.currPlayer = this.currPlayer.opponent();

    await ui.notification("round-start", 1200);
    if (this.currPlayer.opponent().passed)
      await ui.notification(this.currPlayer.tag + "-turn", 1200);

    this.startTurn();
  }

  // Starts a new turn. Enables client interraction in client's turn.
  async startTurn() {
    try {
      await this.runEffects(this.turnStart);
      if (!this.currPlayer.opponent().passed) {
        this.currPlayer = this.currPlayer.opponent();
        ui.notification(this.currPlayer.tag + "-turn", 1200);
      }
      if (this.currPlayer === player_me) {
        passButton.classList.remove("hidden");
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);
        ui.enablePlayer(true);
      } else {
        passButton.classList.add("hidden");
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("keyup", handleKeyUp);
      }

      this.currPlayer.startTurn();
      armTurnClock();
    } catch (err) {
      console.error(err);
      this.giveTurnBack();
    }
  }

  // Ends the current turn and may end round. Disables client interraction in client's turn.
  async endTurn() {
    try {
      clearTurnClock();
      if (this.currPlayer === player_me) ui.enablePlayer(false);
      await this.runEffects(this.turnEnd);
      if (this.currPlayer.passed)
        await ui.notification(this.currPlayer.tag + "-pass", 1200);
      if (player_op.passed && player_me.passed) this.endRound();
      else this.startTurn();
    } catch (err) {
      console.error(err);
      this.giveTurnBack();
    }
  }

  giveTurnBack() {
    if (!player_me || (this.endScreen && !this.endScreen.classList.contains("hide"))) return;
    this.currPlayer = player_me;
    passButton.classList.remove("hidden");
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    ui.enablePlayer(true);
  }

  // Ends the round and may end the game. Determines final scores and the round winner.
  async endRound() {
    let dif = player_me.total - player_op.total;
    if (dif === 0) {
      let nilf_me = player_me.deck.faction === "nilfgaard",
        nilf_op = player_op.deck.faction === "nilfgaard";
      dif = nilf_me ^ nilf_op ? (nilf_me ? 1 : -1) : 0;
    }
    let winner = dif > 0 ? player_me : dif < 0 ? player_op : null;
    let verdict = {
      winner: winner,
      score_me: player_me.total,
      score_op: player_op.total,
    };
    this.roundHistory.push(verdict);

    await this.runEffects(this.roundEnd);
    if (player_op.deck.faction === "monsters") {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    board.row.forEach((row) => row.clear());
    weather.clearWeather();

    player_me.endRound(dif > 0);
    player_op.endRound(dif < 0);

    if (dif > 0) await ui.notification("win-round", 1200);
    else if (dif < 0) await ui.notification("lose-round", 1200);
    else await ui.notification("draw-round", 1200);

    if (player_me.health === 0 || player_op.health === 0) this.endGame();
    else this.startRound();
  }

  // Sets up and displays the end-game screen
  async endGame() {
    readyButtonElem.classList.remove("ready");
    let endScreen = document.getElementById("end-screen");
    let rows = endScreen.getElementsByTagName("tr");
    rows[1].children[0].innerHTML = displayName(player_me.name);
    rows[2].children[0].innerHTML = displayName(player_op.name);

    for (let i = 1; i < 4; ++i) {
      let round = this.roundHistory[i - 1];
      rows[1].children[i].innerHTML = round ? round.score_me : 0;
      rows[1].children[i].style.color =
        round && round.winner === player_me ? "goldenrod" : "";

      rows[2].children[i].innerHTML = round ? round.score_op : 0;
      rows[2].children[i].style.color =
        round && round.winner === player_op ? "goldenrod" : "";
    }

    endScreen.children[0].className = "";
    console.log("----------==o==----------");
    if (player_op.health <= 0 && player_me.health <= 0) {
      tocar("");
      endScreen.getElementsByTagName("p")[0].classList.remove("hide");
      endScreen.children[0].classList.add("end-draw");
      console.log("Game over! || Draw");
    } else if (player_op.health === 0) {
      tocar("game_win", true);
      endScreen.children[0].classList.add("end-win");
      console.log("Game over! || Victory");
    } else {
      endScreen.children[0].classList.add("end-lose");
      endScreen.children[0].classList.add("end-lose");
      console.log("Game over! || Victory");
    }

    if (accountProfile && (gameMode === "online" || gameMode === "offline")) {
      const rounds = this.roundHistory.map((round) => ({ me: round.score_me, op: round.score_op }));
      if (gameMode === "online") netSend(JSON.stringify({ type: "matchResult", rounds: rounds }));
      else if (!this.cpuPaid) {
        this.cpuPaid = true;
        if (typeof grantCpuReward === "function") grantCpuReward(rounds);
      }
    }

    fadeIn(endScreen, 300);
    ui.enablePlayer(true);
  }

  // Returns the client to the deck customization screen
  returnToCustomization() {
    clearTurnClock();
    if (tutorialOn) endTutorial();
    gameMode = "online";
    netSend(JSON.stringify({ type: "unReady" }));
    amReady = false;
    oponentReady = false;
    readyButtonElem.classList.remove("ready");

    ui.toggleMusic_elem.style.left = "20.5vw";

    this.reset();
    player_me.reset();
    player_op.reset();
    ui.toggleMusic_elem.classList.add("music-customization");
    this.endScreen.classList.add("hide");
    customizationElem.classList.remove("hide");
    gameStartControlsElem.classList.remove("hide");
    document.getElementById("lobby-bar").classList.remove("hide");
    document.getElementById("top-menu").classList.remove("hide");
    var accountBar = document.getElementById("account-bar");
    if (accountBar) accountBar.classList.remove("hide");
    if (typeof syncOwnedDeck === "function") syncOwnedDeck();
  }

  // Restarts the last game with the same decks
  restartGame() {
    this.reset();
    player_me.reset();
    player_op.reset();
    this.endScreen.classList.add("hide");
    this.startGame();
  }

  // Executes effects in list. If effect returns true, effect is removed.
  async runEffects(effects) {
    for (let i = effects.length - 1; i >= 0; --i) {
      let effect = effects[i];
      if (await effect()) effects.splice(i, 1);
    }
  }
}

// Contains information and behavior of a Card
class Card {
  constructor(card_data, player) {
    this.name = card_data.name;
    this.basePower = this.power = Number(card_data.strength);
    this.faction = card_data.deck;
    this.abilities =
      card_data.ability === "" ? [] : card_data.ability.split(" ");
    this.row = card_data.deck === "weather" ? card_data.deck : card_data.row;
    this.filename = card_data.filename;
    this.placed = [];
    this.removed = [];
    this.activated = [];
    this.holder = player;

    this.hero = false;
    if (this.abilities.length > 0) {
      if (this.abilities[0] === "hero") {
        this.hero = true;
        this.abilities.splice(0, 1);
      }
      for (let x of this.abilities) {
        let ab = ability_dict[x];
        if ("placed" in ab) this.placed.push(ab.placed);
        if ("removed" in ab) this.removed.push(ab.removed);
        if ("activated" in ab) this.activated.push(ab.activated);
      }
    }

    this.refreshTexts();
    this.elem = this.createCardElem(this);
  }

  refreshTexts() {
    if (this.row === "leader") this.desc_name = t("leader_ability");
    else if (this.abilities.length > 0)
      this.desc_name = abField(this.abilities[this.abilities.length - 1], "name");
    else if (this.row === "agile") this.desc_name = abField("agile", "name");
    else if (this.hero) this.desc_name = abField("hero", "name");
    else this.desc_name = "";

    this.desc = this.row === "agile" ? abField("agile", "description") : "";
    for (let i = this.abilities.length - 1; i >= 0; --i) {
      this.desc += abField(this.abilities[i], "description");
    }
    if (this.hero) this.desc += abField("hero", "description");
  }

  // Returns the identifier for this type of card
  id() {
    return this.name;
  }

  // Sets and displays the current power of this card
  setPower(n) {
    if (this.name === "Decoy") return;
    let elem = this.elem.children[0].children[0];
    if (n !== this.power) {
      this.power = n;
      elem.innerHTML = this.power;
    }
    elem.style.color =
      n > this.basePower ? "goldenrod" : n < this.basePower ? "red" : "";
  }

  // Resets the power of this card to default
  resetPower() {
    this.setPower(this.basePower);
  }

  // Automatically sends and translates this card to its apropriate row from the passed source
  async autoplay(source) {
    await board.toRow(this, source);
  }

  // Animates an ability effect
  async animate(name, bFade = true, bExpand = true) {
    var guia = {
      medic: "med",
      muster: "ally",
      morale: "moral",
      bond: "moral",
    };
    var temSom = new Array();
    for (var x in guia) temSom[temSom.length] = x;
    var literais = [
      "scorch",
      "spy",
      "horn",
      "shield",
      "lock",
      "seize",
      "knockback",
      "resilience",
    ];
    var som =
      literais.indexOf(name) > -1
        ? literais[literais.indexOf(name)]
        : temSom.indexOf(name) > -1
          ? guia[name]
          : "";
    if (som != "") tocar(som, false);

    if (name === "scorch") {
      return await this.scorch(name);
    }
    let anim = this.elem.children[3];
    anim.style.backgroundImage = iconURL("anim_" + name);
    await sleep(50);

    if (bFade) fadeIn(anim, 300);
    if (bExpand) anim.style.backgroundSize = "100% auto";
    await sleep(300);

    if (bExpand) anim.style.backgroundSize = "80% auto";
    await sleep(1000);

    if (bFade) fadeOut(anim, 300);
    if (bExpand) anim.style.backgroundSize = "40% auto";
    await sleep(300);

    anim.style.backgroundImage = "";
  }

  // Animates the scorch effect
  async scorch(name) {
    let anim = this.elem.children[3];
    anim.style.backgroundSize = "cover";
    anim.style.backgroundImage = iconURL("anim_" + name);
    await sleep(50);

    fadeIn(anim, 300);
    await sleep(1300);

    fadeOut(anim, 300);
    await sleep(300);

    anim.style.backgroundSize = "";
    anim.style.backgroundImage = "";
  }

  // Returns true if this is a combat card that is not a Hero
  isUnit() {
    return (
      !this.hero &&
      (this.row === "close" ||
        this.row === "ranged" ||
        this.row === "siege" ||
        this.row === "agile")
    );
  }

  // Returns true if card is sent to a Row's special slot
  isSpecial() {
    return this.name === "Commander's Horn" || this.name === "Mardroeme";
  }

  // Compares by type then power then name
  static compare(a, b) {
    var dif = factionRank(a) - factionRank(b);
    if (dif !== 0) return dif;
    dif = a.basePower - b.basePower;
    if (dif && dif !== 0) return dif;
    return a.name.localeCompare(b.name);

    function factionRank(c) {
      return c.faction === "special" ? -2 : c.faction === "weather" ? -1 : 0;
    }
  }

  // Creates an HTML element based on the card's properties
  createCardElem(card) {
    let elem = document.createElement("div");
    elem.style.backgroundImage = smallURL(card.faction + "_" + card.filename);
    elem.classList.add("card");
    elem.addEventListener("click", function (event) {
      var action = cardClickAction(card, ui.previewCard, myKeyTurn());
      if (action === "play") ui.selectCard(card);
      else if (action === "look") {
        event.stopPropagation();
        ui.showPreviewVisuals(card);
        document.getElementById("click-background").classList.remove("noclick");
      }
    }, false);

    if (card.row === "leader") return elem;

    let power = document.createElement("div");
    elem.appendChild(power);
    let bg;
    if (card.hero) {
      bg = "power_hero";
      elem.classList.add("hero");
    } else if (card.faction === "weather") {
      bg = "power_" + card.abilities[0];
    } else if (card.faction === "special") {
      bg = "power_" + card.abilities[0];
      elem.classList.add("special");
    } else {
      bg = "power_normal";
    }
    power.style.backgroundImage = iconURL(bg);

    let row = document.createElement("div");
    elem.appendChild(row);
    if (
      card.row === "close" ||
      card.row === "ranged" ||
      card.row === "siege" ||
      card.row === "agile"
    ) {
      let num = document.createElement("div");
      num.appendChild(document.createTextNode(card.basePower));
      num.classList.add("center");
      power.appendChild(num);
      row.style.backgroundImage = iconURL("card_row_" + card.row);
    }

    let abi = document.createElement("div");
    elem.appendChild(abi);
    if (
      card.faction !== "special" &&
      card.faction !== "weather" &&
      card.abilities.length > 0
    ) {
      let str = card.abilities[card.abilities.length - 1];
      if (str === "cerys") str = "muster";
      if (str.startsWith("avenger")) str = "avenger";
      if (str === "scorch_c" || str == "scorch_r" || str === "scorch_s")
        str = "scorch";
      abi.style.backgroundImage = iconURL("card_ability_" + str);
    } else if (card.row === "agile")
      abi.style.backgroundImage = iconURL("card_ability_" + "agile");

    elem.appendChild(document.createElement("div")); // animation overlay
    return elem;
  }
}

// Handles notifications and client interration with menus
class UI {
  constructor() {
    this.notificationQueue = [];
    this.isNotifying = false;
    this.currentNotification = null;
    this.carousels = [];
    this.notif_elem = document.getElementById("notification-bar");
    this.preview = document.getElementsByClassName("card-preview")[0];
    this.previewCard = null;
    this.lastRow = null;
    passButton.addEventListener("click", () => {
      netSend(JSON.stringify({ type: "pass", player: playerId }));
      player_me.passRound();
    });
    document
      .getElementById("click-background")
      .addEventListener("click", () => ui.cancel(), false);
    this.youtube;
    this.ytActive;
    this.toggleMusic_elem = document.getElementById("toggle-music");
    this.toggleMusic_elem.classList.add("fade");
    this.toggleMusic_elem.addEventListener(
      "click",
      () => this.toggleMusic(),
      false,
    );
  }

  enablePlayer(enable) {
    let main = document.getElementsByTagName("main")[0].classList;
    if (enable) main.remove("noclick");
    else main.add("noclick");
  }

  // Initializes the youtube background music object
  initYouTube() {
    this.youtube = new YT.Player("youtube", {
      videoId: "UE9fPWy1_o4",
      playerVars: {
        autoplay: 1,
        controls: 0,
        loop: 1,
        playlist: "UE9fPWy1_o4",
        rel: 0,
        version: 3,
        modestbranding: 1,
      },
      events: {
        onStateChange: initButton,
      },
    });

    function initButton() {
      if (ui.ytActive !== undefined) return;
      ui.ytActive = true;
      ui.youtube.playVideo();
      let timer = setInterval(() => {
        if (ui.youtube.getPlayerState() !== YT.PlayerState.PLAYING)
          ui.youtube.playVideo();
        else {
          clearInterval(timer);
          ui.toggleMusic_elem.classList.remove("fade");
        }
      }, 500);
    }
  }

  // Called when client toggles the music
  toggleMusic() {
    if (!this.youtube || typeof this.youtube.getPlayerState !== "function") {
      iniciarMusica();
      return;
    }
    if (this.youtube.getPlayerState() !== YT.PlayerState.PLAYING)
      iniciarMusica();
    else {
      this.youtube.pauseVideo();
      this.toggleMusic_elem.classList.add("fade");
    }
  }

  // Enables or disables backgorund music
  setYouTubeEnabled(enable) {
    if (!this.youtube || typeof this.youtube.pauseVideo !== "function") {
      if (enable) iniciarMusica();
      return;
    }
    if (this.ytActive === enable) return;
    if (enable && !this.mute) ui.youtube.playVideo();
    else ui.youtube.pauseVideo();
    this.ytActive = enable;
  }

  // Called when the player selects a selectable card
  async selectCard(card) {
    let row = this.lastRow;
    let pCard = this.previewCard;
    if (card === pCard) return;
    if (pCard === null || card.holder.hand.cards.includes(card)) {
      this.setSelectable(null, false);
      this.showPreview(card);
    } else if (pCard.name === "Decoy") {
      const nomeColuna = this.lastRow.elem_parent.id;
      const playedCard = removeCircularReferences(this.previewCard);
      const targetCard = removeCircularReferences(card);

      netSend(
        JSON.stringify({
          type: "play",
          player: playerId,
          card: playedCard,
          row: nomeColuna,
          target: targetCard,
        }),
      );

      this.hidePreview(card);
      this.enablePlayer(false);
      board.toHand(card, row);
      await board.moveTo(pCard, row, pCard.holder.hand);
      pCard.holder.endTurn();
    }
  }

  // Called when the player selects a selectable CardContainer
  // LEO - aqui de fato coloca a carta na coluna.
  async selectRow(row, oponentCard = null) {
    this.lastRow = row;
    if (this.previewCard && !handOwns(this.previewCard)) this.hidePreview();

    if (this.previewCard === null && oponentCard === null) {
      await ui.viewCardsInContainer(row);
      return;
    }

    const nomeColuna =
      this.lastRow.elem.id === "weather"
        ? this.lastRow.elem.id
        : this.lastRow.elem_parent.id;
    const playedCard = removeCircularReferences(
      this.previewCard || oponentCard,
    );

    if (this.previewCard.name === "Decoy") return;

    netSend(
      JSON.stringify({
        type: "play",
        player: playerId,
        card: playedCard,
        row: nomeColuna,
      }),
    );

    let card = this.previewCard || oponentCard;
    let holder = card.holder;
    this.hidePreview();
    this.enablePlayer(false);
    if (card.name === "Scorch") {
      this.hidePreview();
      await ability_dict["scorch"].activated(card);
    } else if (card.name === "Decoy") {
      return;
    } else {
      await board.moveTo(card, row, card.holder.hand);
    }
    holder.endTurn();
  }

  // Called when the client cancels out of a card-preview
  cancel() {
    tocar("discard", false);
    this.hidePreview();
  }

  // Displays a card preview then enables and highlights potential card destinations
  showPreview(card) {
    tocar("explaining", false);
    this.showPreviewVisuals(card);
    this.setSelectable(card, true);
    document.getElementById("click-background").classList.remove("noclick");
  }

  // Sets up the graphics and description for a card preview
  showPreviewVisuals(card) {
    this.previewCard = card;
    this.preview.classList.remove("hide");
    var previewFace = this.preview.getElementsByClassName("card-lg")[0];
    previewFace.style.backgroundImage = largeURL(card.faction + "_" + card.filename);
    paintLargeCard(previewFace, card);
    let desc_elem = this.preview.getElementsByClassName("card-description")[0];
    this.setDescription(card, desc_elem);
  }

  // Hides the card preview then disables and removes highlighting from card destinations
  hidePreview() {
    clearKeyPick();
    document.getElementById("click-background").classList.add("noclick");
    player_me.hand.cards.forEach((c) => c.elem.classList.remove("noclick"));

    this.preview.classList.add("hide");
    this.setSelectable(null, false);
    this.previewCard = null;
    this.lastRow = null;
  }

  // Sets up description window for a card
  setDescription(card, desc) {
    tutorialNote(card);
    if (
      card.hero ||
      card.row === "agile" ||
      card.abilities.length > 0 ||
      card.faction === "faction"
    ) {
      desc.classList.remove("hide");
      let str = card.row === "agile" ? "agile" : "";
      if (card.abilities.length)
        str = card.abilities[card.abilities.length - 1];
      if (str === "cerys") str = "muster";
      if (str.startsWith("avenger")) str = "avenger";
      if (str === "scorch_c" || str == "scorch_r" || str === "scorch_s")
        str = "scorch";
      if (
        card.row === "leader" ||
        card.faction === "faction" ||
        (card.abilities.length === 0 && card.row !== "agile")
      )
        desc.children[0].style.backgroundImage = "";
      else
        desc.children[0].style.backgroundImage = iconURL("card_ability_" + str);
      desc.children[1].innerHTML = card.desc_name;
      desc.children[2].innerHTML = card.desc;
    } else {
      desc.classList.add("hide");
    }
  }

  // add notification to queue and run it
  async notification(name, duration) {
    return new Promise((resolve) => {
      this.notificationQueue.push({ name, duration, resolve });
      this.processNotificationQueue();
    });
  }

  async processNotificationQueue() {
    if (this.isNotifying || this.notificationQueue.length === 0) return;

    this.isNotifying = true;
    const { name, duration, resolve } = this.notificationQueue.shift();

    try {
      await this.showNotification(name, duration);
      resolve();
    } catch (error) {
      console.error("Notification error:", error);
      resolve(); // does not stop in case of error
    }

    this.isNotifying = false;
    this.processNotificationQueue();
  }

  async showNotification(name, duration) {
    // Clear previous notification, if any
    await this.clearCurrentNotification();

    if (!duration) duration = 1200;
    duration = Math.max(800, duration);

    var guia2 = {
      "me-pass": "pass",
      "win-round": "round_win",
      "lose-round": "round_lose",
      "me-turn": "turn_me",
      "op-turn": "turn_op",
      "op-leader": "turn_op",
      "op-white-flame": "turn_op",
      "nilfgaard-wins-draws": "turn_op",
      "sv-err": "server_error",
      "win-opleft": "oponent_left",
    };

    var temSom = new Array();
    for (var x in guia2) temSom[temSom.length] = x;
    var som =
      temSom.indexOf(name) > -1
        ? guia2[name]
        : name == "round-start" && game.roundHistory.length == 0
          ? "round1_start"
          : "";
    if (som != "") tocar(som, false);

    const fadeSpeed = 150;
    if (this.notif_elem && this.notif_elem.children[0]) {
      this.notif_elem.children[0].id = "notif-" + name;
    }

    // Resets the opacity visual
    if (this.notif_elem) {
      this.notif_elem.style.opacity = "0";
      this.notif_elem.style.display = "flex";
    }

    await fadeIn(this.notif_elem, fadeSpeed);

    // Store the timeout for cleanup
    return new Promise((resolve) => {
      this.currentNotification = {
        timeout: setTimeout(async () => {
          await this.fadeOutAndHide(fadeSpeed);
          this.currentNotification = null;
          resolve();
        }, duration),
      };
    });
  }

  async clearCurrentNotification() {
    if (this.currentNotification) {
      clearTimeout(this.currentNotification.timeout);
      await this.fadeOutAndHide(50); // should fade out fast
      this.currentNotification = null;
    }
  }

  async fadeOutAndHide(fadeSpeed) {
    if (this.notif_elem) {
      try {
        await fadeOut(this.notif_elem, fadeSpeed, 0);
        this.notif_elem.style.display = "none";
        this.notif_elem.style.opacity = "0";
      } catch (error) {
        // force hide in case of error
        this.notif_elem.style.display = "none";
        this.notif_elem.style.opacity = "0";
      }
    }
  }

  // Displays a cancellable Carousel for a single card
  async viewCard(card, action) {
    if (card === null) return;
    let container = new CardContainer();
    container.cards.push(card);
    await this.viewCardsInContainer(container, action);
  }

  // Displays a cancellable Carousel for all cards in a container
  async viewCardsInContainer(container, action) {
    action = action ? action : () => this.cancel();

    await this.queueCarousel(container, 1, action, () => true, false, true);
    netSend(JSON.stringify({ type: "containerClosed" }));
  }

  // Displays a Carousel menu of filtered container items that match the predicate.
  // Suspends gameplay until the Carousel is closed.
  async queueCarousel(
    container,
    count,
    action,
    predicate,
    bSort,
    bQuit,
    title,
  ) {
    const holder = container.cards[0] && container.cards[0].holder;
    const aiChooses =
      gameMode === "offline" &&
      holder &&
      holder.controller instanceof ControllerAI &&
      game.currPlayer &&
      game.currPlayer.controller instanceof ControllerAI;
    if (aiChooses) {
        for (let n = 0; n < count; n++) {
          let cards = container.cards.reduce(
            (a, c, i) => (!predicate || predicate(c) ? a.concat([i]) : a),
            [],
          );
          if (!cards.length) break;
          await action(container, cards[randomInt(cards.length)]);
        }
        return;
    }
    let carousel = new Carousel(
      container,
      count,
      action,
      predicate,
      bSort,
      bQuit,
      title,
    );
    if (Carousel.curr === undefined || Carousel.curr === null) carousel.start();
    else {
      this.carousels.push(carousel);
      return;
    }
    await sleepUntil(() => this.carousels.length === 0 && !Carousel.curr, 100);
  }

  // Starts the next queued Carousel
  quitCarousel() {
    if (this.carousels.length > 0) {
      this.carousels.shift().start();
    }
  }

  // Displays a custom confirmation menu
  async popup(yesName, yes, noName, no, title, description) {
    let p = new Popup(yesName, yes, noName, no, title, description);
    await sleepUntil(() => !Popup.curr);
  }

  // Enables or disables selection and highlighting of rows specific to the card
  setSelectable(card, enable) {
    if (!enable) {
      for (let row of board.row) {
        row.elem.classList.remove("row-selectable");
        row.elem.classList.remove("noclick");
        row.elem_special.classList.remove("row-selectable");
        row.elem_special.classList.remove("noclick");
        row.elem.classList.add("card-selectable");

        for (let card of row.cards) {
          card.elem.classList.add("noclick");
        }
      }
      weather.elem.classList.remove("row-selectable");
      weather.elem.classList.remove("noclick");
      return;
    }
    if (card.faction === "weather") {
      for (let row of board.row) {
        row.elem.classList.add("noclick");
        row.elem_special.classList.add("noclick");
      }
      weather.elem.classList.add("row-selectable");
      return;
    }

    weather.elem.classList.add("noclick");

    if (card.name === "Scorch") {
      for (let r of board.row) {
        r.elem.classList.add("row-selectable");
        r.elem_special.classList.add("row-selectable");
      }
      return;
    }
    if (card.isSpecial()) {
      for (let i = 0; i < 6; i++) {
        let r = board.row[i];
        if (i < 3 || r.special !== null) {
          r.elem.classList.add("noclick");
          r.elem_special.classList.add("noclick");
        } else {
          r.elem_special.classList.add("row-selectable");
        }
      }
      return;
    }

    board.row.forEach((r) => r.elem_special.classList.add("noclick"));

    if (card.name === "Decoy") {
      for (let i = 0; i < 6; ++i) {
        let r = board.row[i];
        let units = r.cards.filter((c) => c.isUnit());
        if (i < 3 || units.length === 0) {
          r.elem.classList.add("noclick");
          r.elem_special.classList.add("noclick");
          r.elem.classList.remove("card-selectable");
        } else {
          r.elem.classList.add("row-selectable");
          units.forEach((c) => c.elem.classList.remove("noclick"));
        }
      }
      return;
    }

    let currRows =
      card.row === "agile"
        ? [
            board.getRow(card, "close", card.holder),
            board.getRow(card, "ranged", card.holder),
          ]
        : [board.getRow(card, card.row, card.holder)];
    for (let i = 0; i < 6; i++) {
      let row = board.row[i];
      if (currRows.includes(row)) {
        row.elem.classList.add("row-selectable");
      } else {
        row.elem.classList.add("noclick");
      }
    }
  }
}

// Displays up to 5 cards for the client to cycle through and select to perform an action
// Clicking the middle card performs the action on that card "count" times
// Clicking adejacent cards shifts the menu to focus on that card
class Carousel {
  constructor(
    container,
    count,
    action,
    predicate,
    bSort,
    bExit = false,
    title,
  ) {
    if (count <= 0 || !container || !action || container.cards.length === 0)
      return;
    this.container = container;
    this.count = count;
    this.action = action ? action : () => this.cancel();
    this.predicate = predicate;
    this.bSort = bSort;
    this.indices = [];
    this.index = 0;
    this.bExit = bExit;
    this.title = title;
    this.cancelled = false;

    if (!Carousel.elem) {
      Carousel.elem = document.getElementById("carousel");
      Carousel.elem.children[0].addEventListener(
        "click",
        () => Carousel.curr.cancel(),
        false,
      );
    }
    this.elem = Carousel.elem;
    document.getElementsByTagName("main")[0].classList.remove("noclick");

    this.elem.children[0].classList.remove("noclick");
    this.previews = this.elem.getElementsByClassName("card-lg");
    this.desc = this.elem.getElementsByClassName("card-description")[0];
    this.title_elem = this.elem.children[2];
  }

  // Initializes the current Carousel
  start() {
    if (!this.elem) return;
    this.indices = this.container.cards.reduce(
      (a, c, i) => (!this.predicate || this.predicate(c) ? a.concat([i]) : a),
      [],
    );
    if (this.indices.length <= 0) return this.exit();
    if (this.bSort)
      this.indices.sort((a, b) =>
        Card.compare(this.container.cards[a], this.container.cards[b]),
      );

    this.update();
    Carousel.setCurrent(this);

    if (this.title) {
      this.title_elem.innerHTML = t(this.title);
      this.title_elem.classList.remove("hide");
    } else {
      this.title_elem.classList.add("hide");
    }

    this.elem.classList.remove("hide");
    ui.enablePlayer(true);
    tocar("explaining", false);
    if (typeof onTutorialCarousel === "function") onTutorialCarousel();
  }

  // Called by the client to cycle cards displayed by n
  shift(event, n) {
    (event || window.event).stopPropagation();
    this.index = Math.max(0, Math.min(this.indices.length - 1, this.index + n));
    this.update();
  }

  // Called by client to perform action on the middle card in focus
  async select(event) {
    (event || window.event).stopPropagation();
    --this.count;
    if (this.isLastSelection()) this.elem.classList.add("hide");
    if (this.count <= 0) ui.enablePlayer(false);

    const actionString = this.action.toString();
    tocar("redraw", false);
    const resp = await this.action(this.container, this.indices[this.index]);
    if (
      actionString === "(c, i) => wrapper.card=c.cards[i]" ||
      actionString === "(c,i) => newCard = c.cards[i]"
    ) {
      setTimeout(() => {
        netSend(JSON.stringify({ type: "medicDraw", card: resp.filename }));
      }, 1000);
    } else if (actionString.includes("board.toWeather")) {
      setTimeout(() => {
        netSend(
          JSON.stringify({ type: "weatherDraw", card: resp.filename }),
        );
      }, 1000);
    } else if (actionString.includes("board.toGrave")) {
      netSend(
        JSON.stringify({ type: "removeCardHand", index: this.index }),
      );
    } else if (actionString.includes("board.toHand")) {
      setTimeout(() => {
        netSend(
          JSON.stringify({
            type: "addCardHand",
            cardIndex: this.index,
            toIndex: resp,
          }),
        );
      }, 1000);
    }
    if (this.isLastSelection() && !this.cancelled) return this.exit();
    this.update();
  }

  // Called by client to exit out of the current Carousel if allowed. Enables player interraction.
  cancel() {
    if (this.bExit) {
      this.cancelled = true;
      tocar("discard", false);
      this.exit();
    }
    ui.enablePlayer(true);
  }

  // Returns true if there are no more cards to view or select
  isLastSelection() {
    return this.count <= 0 || this.indices.length === 0;
  }

  // Updates the visuals of the current selection of cards
  update() {
    this.indices = this.container.cards.reduce(
      (a, c, i) => (!this.predicate || this.predicate(c) ? a.concat([i]) : a),
      [],
    );
    if (this.index >= this.indices.length) this.index = this.indices.length - 1;
    for (let i = 0; i < this.previews.length; i++) {
      let curr = this.index - 2 + i;
      if (curr >= 0 && curr < this.indices.length) {
        let card = this.container.cards[this.indices[curr]];
        this.previews[i].style.backgroundImage = largeURL(
          card.faction + "_" + card.filename,
        );
        this.previews[i].classList.remove("hide");
        this.previews[i].classList.remove("noclick");
        paintLargeCard(this.previews[i], card);
      } else {
        this.previews[i].style.backgroundImage = "";
        this.previews[i].classList.add("hide");
        this.previews[i].classList.add("noclick");
        paintLargeCard(this.previews[i], null);
      }
    }
    ui.setDescription(
      this.container.cards[this.indices[this.index]],
      this.desc,
    );
  }

  // Clears and quits the current carousel
  exit() {
    for (let x of this.previews) x.style.backgroundImage = "";
    this.elem.classList.add("hide");
    Carousel.clearCurrent();
    ui.quitCarousel();
    if (tutorialOn && tutorialPhase === "match" && !tutorialLive) enterTutorialLive();
  }

  // Statically sets the current carousel
  static setCurrent(curr) {
    this.curr = curr;
  }

  // Statically clears the current carousel
  static clearCurrent() {
    this.curr = null;
  }
}

// Custom confirmation windows
class Popup {
  constructor(yesName, yes, noName, no, header, description) {
    this.yes = yes ? yes : () => {};
    this.no = no ? no : () => {};

    this.elem = document.getElementById("popup");
    let main = this.elem.children[0];
    main.children[0].innerHTML = header ? header : "";
    main.children[1].innerHTML = description ? description : "";
    main.children[2].children[0].innerHTML = yesName ? yesName : t("yes");
    main.children[2].children[1].innerHTML = noName ? noName : t("no");

    this.elem.classList.remove("hide");
    Popup.setCurrent(this);
    ui.enablePlayer(true);
  }

  // Sets this as the current popup window
  static setCurrent(curr) {
    this.curr = curr;
  }

  // Unsets this as the current popup window
  static clearCurrent() {
    this.curr = null;
  }

  // Called when client selects the positive aciton
  selectYes() {
    this.clear();
    this.yes();
    return true;
  }

  // Called when client selects the negative option
  selectNo() {
    this.clear();
    this.no();
    return false;
  }

  // Clears the popup and diables player interraction
  clear() {
    ui.enablePlayer(false);
    this.elem.classList.add("hide");
    Popup.clearCurrent();
  }
}

// Screen used to customize, import and export deck contents
var customMode = false;
var cpuLevel = "normal";
try {
  var savedCpu = localStorage.getItem("gwent-cpu");
  if (savedCpu) cpuLevel = savedCpu;
} catch (e) {}

function deckProblems(stats, rules) {
  const problems = [];
  if (stats.units < rules.minUnits) problems.push("units");
  if (rules.maxUnits != null && stats.units > rules.maxUnits)
    problems.push("maxUnits");
  if (rules.maxDeck != null && stats.total > rules.maxDeck)
    problems.push("deck");
  if (stats.special > rules.maxSpecial) problems.push("special");
  if (rules.maxWeather != null && (stats.weather || 0) > rules.maxWeather)
    problems.push("weather");
  if (rules.maxHeroes != null && stats.hero > rules.maxHeroes)
    problems.push("heroes");
  if (rules.maxSpies != null && stats.spy > rules.maxSpies)
    problems.push("spies");
  if (rules.maxStrength != null && stats.strength > rules.maxStrength)
    problems.push("strength");
  return problems;
}

function readRule(id, fallback) {
  const raw = document.getElementById(id).value.trim();
  if (raw === "") return fallback;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function readCap(id) {
  const raw = document.getElementById(id).value.trim();
  if (raw === "") return null;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function weatherCap() {
  if (document.getElementById("rule-weather").value === "no") return 0;
  return readCap("rule-weather-max");
}

function syncWeatherField() {
  const row = document.getElementById("rule-weather-max-row");
  if (row)
    row.classList.toggle("hide", document.getElementById("rule-weather").value === "no");
}

function publishRules() {
  if (typeof createdSessionId === "undefined" || !createdSessionId) return;
  netSend(JSON.stringify({ type: "setRules", custom: customMode, rules: activeRules() }));
}

function setRuleInput(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value == null ? "" : String(value);
}

function applySessionRules(data) {
  const rules = data.rules || {};
  customMode = !!data.custom;
  document.getElementById("custom-mode").classList.toggle("on", customMode);
  document.getElementById("custom-panel").classList.toggle("hide", !customMode);
  setRuleInput("rule-units", rules.minUnits);
  setRuleInput("rule-units-max", rules.maxUnits);
  setRuleInput("rule-deck", rules.maxDeck);
  setRuleInput("rule-special", rules.maxSpecial);
  setRuleInput("rule-heroes", rules.maxHeroes);
  setRuleInput("rule-spies", rules.maxSpies);
  setRuleInput("rule-strength", rules.maxStrength);
  if (rules.maxWeather === 0) {
    document.getElementById("rule-weather").value = "no";
    setRuleInput("rule-weather-max", "");
  } else {
    document.getElementById("rule-weather").value = "yes";
    setRuleInput("rule-weather-max", rules.maxWeather);
  }
  syncWeatherField();
  if (typeof dm !== "undefined" && dm.updateStats) dm.updateStats();
  if (amReady) {
    amReady = false;
    readyButtonElem.classList.remove("ready");
    customizationElem.classList.remove("noclick");
    netSend(JSON.stringify({ type: "unReady" }));
  }
  if (typeof showReward === "function") showReward(t("rules_host"));
}

function activeRules() {
  if (!customMode) {
    return {
      minUnits: 22,
      maxUnits: null,
      maxDeck: null,
      maxSpecial: 10,
      maxHeroes: null,
      maxSpies: null,
      maxStrength: null,
      maxWeather: null,
    };
  }
  return {
    minUnits: readRule("rule-units", 22),
    maxUnits: readCap("rule-units-max"),
    maxDeck: readCap("rule-deck"),
    maxSpecial: readRule("rule-special", 10),
    maxHeroes: readCap("rule-heroes"),
    maxSpies: readCap("rule-spies"),
    maxStrength: readCap("rule-strength"),
    maxWeather: weatherCap(),
  };
}

function classicLimits() {
  return {
    minUnits: 22,
    maxUnits: null,
    maxDeck: null,
    maxSpecial: 10,
    maxHeroes: null,
    maxSpies: null,
    maxStrength: null,
    maxWeather: null,
  };
}

function cpuProfile(level) {
  if (level === "principiante")
    return { maxUnits: 22, maxDeck: 24, maxSpecial: 1, maxHeroes: 0, maxSpies: 0, maxWeather: 0 };
  if (level === "facil")
    return { maxUnits: 24, maxDeck: 28, maxSpecial: 3, maxHeroes: 1, maxSpies: 0, maxWeather: 1 };
  if (level === "dificil")
    return { maxUnits: 30, maxSpecial: 8, maxWeather: 2 };
  if (level === "experto")
    return { maxUnits: 36, maxSpecial: 10, maxWeather: 3 };
  if (level === "demencia") return { maxSpecial: 10 };
  return null;
}

function tightenRules(base, extra) {
  const out = Object.assign({}, base);
  ["maxUnits", "maxDeck", "maxSpecial", "maxHeroes", "maxSpies", "maxStrength", "maxWeather"].forEach(
    function (key) {
      if (extra[key] == null) return;
      out[key] = out[key] == null ? extra[key] : Math.min(out[key], extra[key]);
    },
  );
  if (out.maxUnits != null && out.minUnits > out.maxUnits) out.minUnits = out.maxUnits;
  if (out.maxDeck != null && out.minUnits > out.maxDeck) out.minUnits = out.maxDeck;
  return out;
}

function factionCopies(faction) {
  const copies = [];
  card_dict.forEach(function (data, index) {
    if (data.row === "leader") return;
    if (![faction, "neutral", "weather", "special"].includes(data.deck)) return;
    const special = data.deck === "special" || data.deck === "weather";
    const ability = String(data.ability || "").split(" ");
    const n = Number(data.count) || 0;
    for (let i = 0; i < n; i++) {
      copies.push({
        index: index,
        special: special,
        weather: data.deck === "weather",
        hero: !special && ability.includes("hero"),
        spy: !special && ability.includes("spy"),
        strength: special ? 0 : Number(data.strength) || 0,
      });
    }
  });
  return copies;
}

function buildLevelDeck(copies, rules, strong) {
  const units = copies
    .filter(function (c) {
      return !c.special;
    })
    .slice()
    .sort(function (a, b) {
      return strong ? b.strength - a.strength : a.strength - b.strength;
    });
  const specials = copies.filter(function (c) {
    return c.special;
  });
  const chosen = [];
  let hero = 0;
  let spy = 0;
  let weather = 0;
  let spec = 0;
  const unitTarget =
    rules.maxUnits == null ? (strong ? units.length : rules.minUnits) : rules.maxUnits;
  for (let i = 0; i < units.length; i++) {
    const card = units[i];
    const unitCount = chosen.length - spec;
    if (unitCount >= unitTarget) break;
    if (rules.maxDeck != null && chosen.length >= rules.maxDeck) break;
    if (rules.maxHeroes != null && card.hero && hero + 1 > rules.maxHeroes) continue;
    if (rules.maxSpies != null && card.spy && spy + 1 > rules.maxSpies) continue;
    chosen.push(card);
    if (card.hero) hero++;
    if (card.spy) spy++;
  }
  if (!strong && rules.maxHeroes > 0 && hero < rules.maxHeroes) {
    const weakestHero = units
      .filter(function (c) {
        return c.hero && (rules.maxSpies == null || rules.maxSpies > 0 || !c.spy);
      })
      .sort(function (a, b) {
        return a.strength - b.strength;
      })[0];
    if (weakestHero) {
      let swap = -1;
      let best = -1;
      chosen.forEach(function (c, i) {
        if (c.special || c.hero || c.strength < best) return;
        best = c.strength;
        swap = i;
      });
      if (swap >= 0) chosen[swap] = weakestHero;
    }
  }
  const ordered = strong
    ? specials.slice()
    : specials.filter(function (c) { return !c.weather; }).concat(
        specials.filter(function (c) { return c.weather; }),
      );
  for (let i = 0; i < ordered.length; i++) {
    const card = ordered[i];
    if (rules.maxDeck != null && chosen.length >= rules.maxDeck) break;
    if (spec >= rules.maxSpecial) break;
    if (card.weather && rules.maxWeather != null && weather >= rules.maxWeather) continue;
    chosen.push(card);
    spec++;
    if (card.weather) weather++;
  }
  if (chosen.length - spec < rules.minUnits && chosen.length - spec < 10) return null;
  const counts = {};
  chosen.forEach(function (c) {
    counts[c.index] = (counts[c.index] || 0) + 1;
  });
  return Object.keys(counts).map(function (index) {
    return { index: Number(index), count: counts[index] };
  });
}

(function checkCpuDeck() {
  const copies = [];
  for (let i = 0; i < 30; i++)
    copies.push({
      index: i,
      special: false,
      weather: false,
      hero: i < 5,
      spy: i >= 5 && i < 9,
      strength: i < 5 ? 10 : 2,
    });
  const easy = buildLevelDeck(copies, tightenRules(classicLimits(), cpuProfile("principiante")), false);
  const heroes = easy.filter(function (c) { return c.index < 5; }).length;
  const spies = easy.filter(function (c) { return c.index >= 5 && c.index < 9; }).length;
  if (!easy || heroes || spies || easy.reduce(function (a, c) { return a + c.count; }, 0) > 24)
    console.error("cpu principiante");
  const hard = buildLevelDeck(copies, tightenRules(classicLimits(), cpuProfile("demencia")), true);
  const hardHeroes = hard.filter(function (c) { return c.index < 5; }).reduce(function (a, c) { return a + c.count; }, 0);
  if (!hard || hardHeroes < 5) console.error("cpu demencia");
})();

function trimToRules(cards, rules) {
  const list = [];
  cards.forEach(function (c) {
    const data = card_dict[c.index];
    if (!data) return;
    for (let i = 0; i < c.count; i++) list.push(data);
  });
  function isSpecial(c) {
    return c.deck === "special" || c.deck === "weather";
  }
  function parts(c) {
    return String(c.ability || "").split(" ");
  }
  function tally() {
    const s = { special: 0, hero: 0, spy: 0, strength: 0, units: 0, total: list.length, weather: 0 };
    list.forEach(function (c) {
      if (isSpecial(c)) {
        s.special++;
        if (c.deck === "weather") s.weather++;
        return;
      }
      s.units++;
      s.strength += Number(c.strength) || 0;
      if (parts(c).includes("hero")) s.hero++;
      if (parts(c).includes("spy")) s.spy++;
    });
    return s;
  }
  function drop(pred) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (!pred(list[i])) continue;
      list.splice(i, 1);
      return true;
    }
    return false;
  }
  function dropStrongest() {
    let best = -1;
    let bi = -1;
    list.forEach(function (c, i) {
      if (isSpecial(c)) return;
      const p = Number(c.strength) || 0;
      if (p < best) return;
      best = p;
      bi = i;
    });
    if (bi < 0) return false;
    list.splice(bi, 1);
    return true;
  }
  function dropWeakestUnit() {
    let best = Infinity;
    let bi = -1;
    let heroBest = Infinity;
    let heroBi = -1;
    list.forEach(function (c, i) {
      if (isSpecial(c)) return;
      const p = Number(c.strength) || 0;
      if (parts(c).includes("hero")) {
        if (p > heroBest) return;
        heroBest = p;
        heroBi = i;
        return;
      }
      if (p > best) return;
      best = p;
      bi = i;
    });
    const i = bi >= 0 ? bi : heroBi;
    if (i < 0) return false;
    list.splice(i, 1);
    return true;
  }
  let s = tally();
  while (rules.maxWeather != null && s.weather > rules.maxWeather && drop(function (c) {
    return c.deck === "weather";
  }))
    s = tally();
  while (s.special > rules.maxSpecial && drop(isSpecial)) s = tally();
  while (
    rules.maxHeroes != null &&
    s.hero > rules.maxHeroes &&
    drop(function (c) {
      return parts(c).includes("hero");
    })
  )
    s = tally();
  while (
    rules.maxSpies != null &&
    s.spy > rules.maxSpies &&
    drop(function (c) {
      return parts(c).includes("spy");
    })
  )
    s = tally();
  while (
    rules.maxStrength != null &&
    s.strength > rules.maxStrength &&
    dropStrongest()
  )
    s = tally();
  while (rules.maxUnits != null && s.units > rules.maxUnits && dropWeakestUnit())
    s = tally();
  while (rules.maxDeck != null && s.total > rules.maxDeck && (drop(isSpecial) || dropWeakestUnit()))
    s = tally();
  const grouped = [];
  list.forEach(function (c) {
    const index = card_dict.indexOf(c);
    let row = grouped.find(function (g) {
      return g.index === index;
    });
    if (!row) {
      row = { index: index, count: 0 };
      grouped.push(row);
    }
    row.count++;
  });
  return grouped;
}

(function checkDeckRules() {
  const classic = {
    minUnits: 22,
    maxUnits: null,
    maxDeck: null,
    maxSpecial: 10,
    maxHeroes: null,
    maxSpies: null,
    maxStrength: null,
  };
  const full = { units: 22, total: 32, special: 10, hero: 9, spy: 4, strength: 200 };
  if (deckProblems(full, classic).length)
    console.error("classic deck rejected");
  const wet = { units: 22, total: 24, special: 2, hero: 0, spy: 0, strength: 40, weather: 2 };
  if (deckProblems(wet, Object.assign({}, classic, { maxWeather: 0 })).join() !== "weather")
    console.error("weather cap");
  const weatherCopies = [];
  for (let i = 0; i < 22; i++)
    weatherCopies.push({
      index: i,
      special: false,
      hero: false,
      spy: false,
      strength: 2,
      weather: false,
    });
  for (let i = 0; i < 4; i++)
    weatherCopies.push({
      index: 50 + i,
      special: true,
      hero: false,
      spy: false,
      strength: 0,
      weather: true,
    });
  const noWeather = buildRandomCounts(
    weatherCopies,
    Object.assign({}, classic, { maxWeather: 0 }),
    function () {
      return 0.999;
    },
  );
  if (!noWeather || noWeather.stats.weather !== 0) console.error("random weather");
  const short = { units: 21, total: 32, special: 11, hero: 9, spy: 4, strength: 200 };
  if (deckProblems(short, classic).join() !== "units,special")
    console.error("classic deck problems");
  const capped = {
    minUnits: 22,
    maxUnits: null,
    maxDeck: null,
    maxSpecial: 10,
    maxHeroes: 2,
    maxSpies: 1,
    maxStrength: 100,
  };
  if (deckProblems(full, capped).join() !== "heroes,spies,strength")
    console.error("custom deck problems");
  const sized = Object.assign({}, capped, { maxUnits: 20, maxDeck: 25, maxHeroes: null, maxSpies: null, maxStrength: null });
  const sizedStats = { units: 22, total: 32, special: 10, hero: 2, spy: 1, strength: 90 };
  if (deckProblems(sizedStats, sized).join() !== "maxUnits,deck")
    console.error("deck size problems");
  const copies = [];
  for (let i = 0; i < 30; i++)
    copies.push({
      index: i,
      special: false,
      hero: i < 4,
      spy: i >= 4 && i < 8,
      strength: 5,
    });
  for (let i = 0; i < 12; i++)
    copies.push({
      index: 100 + i,
      special: true,
      hero: false,
      spy: false,
      strength: 0,
    });
  const rolled = buildRandomCounts(copies, classic, function () {
    return 0;
  });
  if (
    !rolled ||
    rolled.stats.units !== 22 ||
    rolled.stats.special !== 0 ||
    deckProblems(rolled.stats, classic).length
  )
    console.error("random classic");
  const tight = Object.assign({}, classic, {
    maxUnits: 24,
    maxDeck: 26,
    maxHeroes: 1,
    maxSpies: 1,
    maxSpecial: 2,
  });
  const tightRoll = buildRandomCounts(copies, tight, function () {
    return 0.999;
  });
  if (
    !tightRoll ||
    deckProblems(tightRoll.stats, tight).length ||
    tightRoll.stats.hero > 1 ||
    tightRoll.stats.spy > 1 ||
    tightRoll.stats.total > 26
  )
    console.error("random tight");
  if (buildRandomCounts(copies.slice(0, 3), classic, Math.random))
    console.error("random should fail");
})();

function buildRandomCounts(copies, rules, rng) {
  function rnd(n) {
    return Math.floor((rng || Math.random)() * n);
  }
  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }
  function attempt(units, specials) {
    let unitHi =
      rules.maxUnits == null ? rules.minUnits : Math.min(rules.maxUnits, units.length);
    if (rules.maxDeck != null) unitHi = Math.min(unitHi, rules.maxDeck);
    if (unitHi < rules.minUnits || units.length < rules.minUnits) return null;
    const unitTarget = rules.minUnits + rnd(unitHi - rules.minUnits + 1);
    let specialHi = Math.min(rules.maxSpecial, specials.length);
    if (rules.maxDeck != null)
      specialHi = Math.min(specialHi, Math.max(0, rules.maxDeck - unitTarget));
    const specialTarget = specialHi === 0 ? 0 : rnd(specialHi + 1);
    const chosen = [];
    let hero = 0;
    let spy = 0;
    let strength = 0;
    let unitCount = 0;
    for (let i = 0; i < units.length && unitCount < unitTarget; i++) {
      const card = units[i];
      if (rules.maxHeroes != null && card.hero && hero + 1 > rules.maxHeroes)
        continue;
      if (rules.maxSpies != null && card.spy && spy + 1 > rules.maxSpies)
        continue;
      if (rules.maxStrength != null && strength + card.strength > rules.maxStrength)
        continue;
      chosen.push(card);
      unitCount++;
      if (card.hero) hero++;
      if (card.spy) spy++;
      strength += card.strength;
    }
    if (unitCount < rules.minUnits) return null;
    let spec = 0;
    let weather = 0;
    for (let i = 0; i < specials.length && spec < specialTarget; i++) {
      if (rules.maxDeck != null && chosen.length >= rules.maxDeck) break;
      if (
        specials[i].weather &&
        rules.maxWeather != null &&
        weather >= rules.maxWeather
      )
        continue;
      chosen.push(specials[i]);
      spec++;
      if (specials[i].weather) weather++;
    }
    const counts = {};
    chosen.forEach(function (c) {
      counts[c.index] = (counts[c.index] || 0) + 1;
    });
    const stats = {
      total: chosen.length,
      units: unitCount,
      special: spec,
      hero: hero,
      spy: spy,
      strength: strength,
      weather: weather,
    };
    if (deckProblems(stats, rules).length) return null;
    return { counts: counts, stats: stats };
  }
  const unitCopies = copies.filter(function (c) {
    return !c.special;
  });
  const specialCopies = copies.filter(function (c) {
    return c.special;
  });
  let chosen = null;
  for (let n = 0; n < 24 && !chosen; n++)
    chosen = attempt(shuffle(unitCopies), shuffle(specialCopies));
  if (!chosen && rules.maxStrength != null) {
    const weak = unitCopies.slice().sort(function (a, b) {
      return a.strength - b.strength;
    });
    chosen = attempt(weak, shuffle(specialCopies));
  }
  return chosen;
}

function weakestUnitStrength(units, rules) {
  const order = units.slice().sort(function (a, b) {
    return a.strength - b.strength;
  });
  let hero = 0;
  let spy = 0;
  let strength = 0;
  let n = 0;
  for (let i = 0; i < order.length && n < rules.minUnits; i++) {
    const card = order[i];
    if (rules.maxHeroes != null && card.hero && hero + 1 > rules.maxHeroes)
      continue;
    if (rules.maxSpies != null && card.spy && spy + 1 > rules.maxSpies) continue;
    n++;
    if (card.hero) hero++;
    if (card.spy) spy++;
    strength += card.strength;
  }
  if (n < rules.minUnits) return null;
  return strength;
}

function randomLimitText(copies, rules, factionName) {
  const units = copies.filter(function (c) {
    return !c.special;
  });
  const heroes = units.filter(function (c) {
    return c.hero;
  }).length;
  const spies = units.filter(function (c) {
    return c.spy;
  }).length;
  const lines = [tf("random_fail", { faction: factionName })];
  if (rules.maxUnits != null && rules.maxUnits < rules.minUnits)
    lines.push(tf("random_need_unit_order", { min: rules.minUnits, max: rules.maxUnits }));
  if (rules.maxDeck != null && rules.maxDeck < rules.minUnits)
    lines.push(tf("random_need_deck", { min: rules.minUnits, max: rules.maxDeck }));
  if (units.length < rules.minUnits)
    lines.push(tf("random_need_units", { min: rules.minUnits, have: units.length }));
  if (rules.maxHeroes != null) {
    const plain = units.length - heroes;
    if (plain + Math.min(heroes, rules.maxHeroes) < rules.minUnits)
      lines.push(
        tf("random_need_heroes", {
          min: rules.minUnits,
          cap: rules.maxHeroes,
          have: heroes,
          plain: plain,
        }),
      );
  }
  if (rules.maxSpies != null) {
    const plain = units.length - spies;
    if (plain + Math.min(spies, rules.maxSpies) < rules.minUnits)
      lines.push(
        tf("random_need_spies", {
          min: rules.minUnits,
          cap: rules.maxSpies,
          have: spies,
          plain: plain,
        }),
      );
  }
  const weakest = weakestUnitStrength(units, rules);
  if (rules.maxStrength != null && weakest != null && weakest > rules.maxStrength)
    lines.push(
      tf("random_need_strength", {
        min: rules.minUnits,
        need: weakest,
        cap: rules.maxStrength,
      }),
    );
  if (lines.length === 1) lines.push(t("random_need_together"));
  lines.push(
    tf("random_pool", {
      faction: factionName,
      units: units.length,
      heroes: heroes,
      spies: spies,
      specials: copies.length - units.length,
    }),
  );
  return lines.join("\n");
}

(function checkRandomLimitText() {
  const copies = [];
  for (let i = 0; i < 10; i++)
    copies.push({
      index: i,
      special: false,
      hero: false,
      spy: false,
      strength: 4,
    });
  const rules = {
    minUnits: 22,
    maxUnits: 10,
    maxDeck: 15,
    maxSpecial: 10,
    maxHeroes: null,
    maxSpies: null,
    maxStrength: null,
  };
  const text = randomLimitText(copies, rules, "Test");
  if (text.indexOf("22") < 0 || text.indexOf("10") < 0 || text.indexOf("Test") < 0)
    console.error("random limit text");
})();

class DeckMaker {
  constructor() {
    this.elem = customizationElem;
    this.bank_elem = document.getElementById("card-bank");
    this.deck_elem = document.getElementById("card-deck");
    this.leader_elem = document.getElementById("card-leader");
    this.leader_elem.children[1].addEventListener(
      "click",
      () => this.selectLeader(),
      false,
    );

    this.faction = "realms";
    this.factionDecks = {};
    this.setFaction(this.faction, true);

    let start_deck = premade_deck.find((d) => d.faction === this.faction);
    start_deck.cards = start_deck.cards.map((c) => ({
      index: c[0],
      count: c[1],
    }));
    this.setLeader(start_deck.leader);
    this.makeBank(this.faction, start_deck.cards);

    this.change_elem = document.getElementById("change-faction");
    this.change_elem.addEventListener(
      "click",
      () => this.selectFaction(),
      false,
    );

    document
      .getElementById("download-deck")
      .addEventListener("click", () => this.downloadDeck(), false);
    document
      .getElementById("empty-deck")
      .addEventListener("click", () => this.emptyDeck(), false);
    document
      .getElementById("random-deck")
      .addEventListener("click", () => this.randomDeck(), false);
    document
      .getElementById("offline-game")
      .addEventListener("click", () => this.startOffline(), false);
    const cpuSelect = document.getElementById("cpu-level");
    if (["principiante", "facil", "normal", "dificil", "experto", "demencia"].indexOf(cpuLevel) < 0)
      cpuLevel = "normal";
    cpuSelect.value = cpuLevel;
    cpuSelect.addEventListener("change", () => {
      cpuLevel = cpuSelect.value;
      try {
        localStorage.setItem("gwent-cpu", cpuLevel);
      } catch (e) {}
    });
    document.getElementById("custom-mode").addEventListener("click", () => {
      if (typeof joinedSessionId !== "undefined" && joinedSessionId) return;
      customMode = !customMode;
      document.getElementById("custom-mode").classList.toggle("on", customMode);
      document.getElementById("custom-panel").classList.toggle("hide", !customMode);
      this.updateStats();
      publishRules();
    });
    document.getElementById("custom-panel").addEventListener("input", () => {
      if (typeof joinedSessionId !== "undefined" && joinedSessionId) return;
      if (customMode) this.updateStats();
      publishRules();
    });
    document.getElementById("rule-weather").addEventListener("change", () => {
      if (typeof joinedSessionId !== "undefined" && joinedSessionId) return;
      syncWeatherField();
      if (customMode) this.updateStats();
      publishRules();
    });
    document.getElementById("rule-reset").addEventListener("click", () => {
      if (typeof joinedSessionId !== "undefined" && joinedSessionId) return;
      document.getElementById("rule-units").value = 22;
      document.getElementById("rule-units-max").value = "";
      document.getElementById("rule-deck").value = "";
      document.getElementById("rule-special").value = 10;
      document.getElementById("rule-heroes").value = "";
      document.getElementById("rule-spies").value = "";
      document.getElementById("rule-strength").value = "";
      document.getElementById("rule-weather").value = "yes";
      document.getElementById("rule-weather-max").value = "";
      syncWeatherField();
      this.updateStats();
      publishRules();
    });
    document
      .getElementById("add-file")
      .addEventListener("change", () => this.uploadDeck(), false);
    readyButtonElem.addEventListener("click", () => this.startNewGame(), false);
    somCarta();

    this.update();
  }

  // Builds a random deck of the current faction inside the active limits.
  randomDeck() {
    const rules = activeRules();
    const copies = [];
    for (let i = 0; i < this.bank.length; i++) {
      const data = card_dict[this.bank[i].index];
      const total = this.bank[i].count + (this.deck[i] ? this.deck[i].count : 0);
      const special = data.deck === "special" || data.deck === "weather";
      const ability = String(data.ability || "").split(" ");
      for (let n = 0; n < total; n++) {
        copies.push({
          index: this.bank[i].index,
          special: special,
          weather: data.deck === "weather",
          hero: !special && ability.includes("hero"),
          spy: !special && ability.includes("spy"),
          strength: special ? 0 : Number(data.strength) || 0,
        });
      }
    }
    const rolled = buildRandomCounts(copies, rules);
    if (!rolled) {
      const factionName =
        typeof factionField === "function"
          ? factionField(this.faction, "name")
          : this.faction;
      gameAlert(randomLimitText(copies, rules, factionName));
      return;
    }
    for (let i = 0; i < this.bank.length; i++) {
      const total = this.bank[i].count + this.deck[i].count;
      const want = Math.min(total, rolled.counts[this.bank[i].index] || 0);
      this.deck[i].count = want;
      this.bank[i].count = total - want;
      setPreviewCount(this.deck[i].elem, want);
      setPreviewCount(this.bank[i].elem, total - want);
    }
    if (this.leaders.length)
      this.setLeader(this.leaders[randomInt(this.leaders.length)].index);
    tocar("menu_buy", false);
    this.update();
  }

  // Called when client selects a deck faction. Clears previous cards and makes valid cards available.
  async setFaction(faction_name, silent) {
    if (!silent && this.faction === faction_name) return false;
    if (!silent) {
      tocar("warning", false);
      const ask = accountProfile ? t("confirm_faction_account") : t("confirm_faction");
      if (!(await gameConfirm(ask))) {
        tocar("warning", false);
        return false;
      }

      netSend(
        JSON.stringify({ type: "opChangeFaction", faction: faction_name }),
      );
    }

    this.elem.getElementsByTagName("h1")[0].innerHTML = factionField(
      faction_name,
      "name",
    );
    this.elem.getElementsByTagName("h1")[0].style.backgroundImage = iconURL(
      "deck_shield_" + faction_name,
    );
    document.getElementById("faction-description").innerHTML = factionField(
      faction_name,
      "description",
    );

    this.leaders = card_dict
      .map((c, i) => ({ index: i, card: c }))
      .filter((c) => {
        if (c.card.row !== "leader") return false;
        if (accountProfile)
          return (
            c.card.deck === faction_name &&
            (accountProfile.owned[c.card.filename] || 0) > 0
          );
        return c.card.deck === faction_name;
      });
    const still =
      this.leader && this.leaders.some((l) => l.index === this.leader.index);
    if (!still) {
      const ofFaction = this.leaders.find((l) => l.card.deck === faction_name);
      this.leader = ofFaction || this.leaders[0] || null;
      const face = this.leader_elem.children[1];
      if (this.leader) {
        face.style.backgroundImage = largeURL(
          this.leader.card.deck + "_" + this.leader.card.filename,
        );
        paintLargeCard(face, this.leader.card);
      } else {
        face.style.backgroundImage = "";
        paintLargeCard(face, null);
      }
    }
    this.faction = faction_name;
    setTimeout(function () {
      somCarta();
    }, 300);
    return true;
  }

  // Called when client selects a leader for their deck
  setLeader(index) {
    this.leader = this.leaders.find((l) => l.index == index);
    if (!this.leader) return;
    this.leader_elem.children[1].style.backgroundImage = largeURL(
      this.leader.card.deck + "_" + this.leader.card.filename,
    );
    paintLargeCard(this.leader_elem.children[1], this.leader.card);
  }

  // Constructs a bank of cards that can be used by the faction's deck.
  // If a deck is provided, will not add cards to bank that are already in the deck.
  makeBank(faction, deck) {
    this.clear();
    let cards = card_dict
      .map((c, i) => ({ card: c, index: i }))
      .filter((p) => {
        if (p.card.row === "leader") return false;
        const usable = [faction, "neutral", "weather", "special"];
        if (!usable.includes(p.card.deck)) return false;
        if (accountProfile) return (accountProfile.owned[p.card.filename] || 0) > 0;
        return true;
      });

    cards.sort(function (id1, id2) {
      let a = card_dict[id1.index],
        b = card_dict[id2.index];
      let c1 = { name: a.name, basePower: -a.strength, faction: a.deck };
      let c2 = { name: b.name, basePower: -b.strength, faction: b.deck };
      return Card.compare(c1, c2);
    });

    let deckMap = {};
    if (deck) {
      for (let i of Object.keys(deck)) deckMap[deck[i].index] = deck[i].count;
    }
    cards.forEach((p) => {
      let cap = accountProfile
        ? accountProfile.owned[p.card.filename] || 0
        : Number.parseInt(p.card.count, 10);
      let count = deckMap[p.index] !== undefined ? Number(deckMap[p.index]) : 0;
      if (count > cap) count = cap;
      this.makePreview(p.index, cap - count, this.bank_elem, this.bank);
      this.makePreview(p.index, count, this.deck_elem, this.deck);
    });
  }

  // Creates HTML elements for the card previews
  makePreview(index, num, container_elem, cards) {
    let card_data = card_dict[index];

    let elem = document.createElement("div");
    elem.style.backgroundImage = largeURL(
      card_data.deck + "_" + card_data.filename,
    );
    elem.classList.add("card-lg");
    paintLargeCard(elem, card_data);
    setPreviewCount(elem, num);
    container_elem.appendChild(elem);

    let bankID = { index: index, count: num, elem: elem };
    let isBank = cards === this.bank;
    cards.push(bankID);
    let cardIndex = cards.length - 1;
    elem.addEventListener("click", () => this.select(cardIndex, isBank), false);

    return bankID;
  }

  // Updates the card preview elements when any changes are made to the deck
  update() {
    for (let x of this.bank) {
      if (x.count) x.elem.classList.remove("hide");
      else x.elem.classList.add("hide");
    }
    let total = 0,
      units = 0,
      special = 0,
      strength = 0,
      hero = 0,
      spy = 0,
      weather = 0;
    for (let x of this.deck) {
      let card_data = card_dict[x.index];
      if (x.count) x.elem.classList.remove("hide");
      else x.elem.classList.add("hide");
      total += x.count;
      if (card_data.deck === "special" || card_data.deck === "weather") {
        special += x.count;
        if (card_data.deck === "weather") weather += x.count;
        continue;
      }
      units += x.count;
      strength += card_data.strength * x.count;
      const ability = String(card_data.ability || "").split(" ");
      if (ability.includes("hero")) hero += x.count;
      if (ability.includes("spy")) spy += x.count;
    }
    this.stats = {
      total: total,
      units: units,
      special: special,
      strength: strength,
      hero: hero,
      spy: spy,
      weather: weather,
    };
    this.updateStats();
  }

  // Updates and displays the statistics describing the cards currently in the deck
  updateStats() {
    let stats = document.getElementById("deck-stats");
    const rules = activeRules();
    stats.classList.toggle("custom", customMode);
    const spyEl = document.getElementById("stat-spies-value");
    if (!customMode) {
      stats.children[1].innerHTML = this.stats.total;
      stats.children[1].style.color = "";
      stats.children[3].innerHTML =
        this.stats.units + (this.stats.units < 22 ? "/22" : "");
      stats.children[5].innerHTML = this.stats.special + "/10";
      stats.children[7].innerHTML = this.stats.strength;
      stats.children[9].innerHTML = this.stats.hero;
      stats.children[3].style.color = this.stats.units < 22 ? "red" : "";
      stats.children[5].style.color = this.stats.special > 10 ? "red" : "";
      stats.children[7].style.color = "";
      stats.children[9].style.color = "";
      return;
    }
    stats.children[1].innerHTML =
      this.stats.total + (rules.maxDeck == null ? "" : "/" + rules.maxDeck);
    stats.children[1].style.color =
      rules.maxDeck != null && this.stats.total > rules.maxDeck ? "red" : "";
    stats.children[3].innerHTML =
      this.stats.units +
      "/" +
      rules.minUnits +
      (rules.maxUnits == null ? "" : "-" + rules.maxUnits);
    stats.children[5].innerHTML = this.stats.special + "/" + rules.maxSpecial;
    stats.children[7].innerHTML =
      this.stats.strength +
      (rules.maxStrength == null ? "" : "/" + rules.maxStrength);
    stats.children[9].innerHTML =
      this.stats.hero + (rules.maxHeroes == null ? "" : "/" + rules.maxHeroes);
    if (spyEl)
      spyEl.innerHTML =
        this.stats.spy + (rules.maxSpies == null ? "" : "/" + rules.maxSpies);
    const weatherEl = document.getElementById("stat-weather-value");
    if (weatherEl)
      weatherEl.innerHTML =
        this.stats.weather +
        (rules.maxWeather == null ? "" : "/" + rules.maxWeather);
    stats.children[3].style.color =
      this.stats.units < rules.minUnits ||
      (rules.maxUnits != null && this.stats.units > rules.maxUnits)
        ? "red"
        : "";
    stats.children[5].style.color =
      this.stats.special > rules.maxSpecial ? "red" : "";
    stats.children[7].style.color =
      rules.maxStrength != null && this.stats.strength > rules.maxStrength
        ? "red"
        : "";
    stats.children[9].style.color =
      rules.maxHeroes != null && this.stats.hero > rules.maxHeroes ? "red" : "";
    if (spyEl)
      spyEl.style.color =
        rules.maxSpies != null && this.stats.spy > rules.maxSpies ? "red" : "";
    if (weatherEl)
      weatherEl.style.color =
        rules.maxWeather != null && this.stats.weather > rules.maxWeather
          ? "red"
          : "";
  }

  deckWarning() {
    if (!customMode) {
      let warning = "";
      if (this.stats.units < 22) warning += t("need_units");
      if (this.stats.special > 10) warning += t("need_special_max");
      return warning;
    }
    const rules = activeRules();
    let warning = "";
    if (rules.maxUnits != null && rules.maxUnits < rules.minUnits)
      warning += t("need_unit_range");
    if (this.stats.units < rules.minUnits)
      warning += tf("need_units_n", { n: rules.minUnits });
    if (rules.maxUnits != null && this.stats.units > rules.maxUnits)
      warning += tf("need_units_max", { n: rules.maxUnits });
    if (rules.maxDeck != null && this.stats.total > rules.maxDeck)
      warning += tf("need_deck", { n: rules.maxDeck });
    if (this.stats.special > rules.maxSpecial)
      warning += tf("need_special_n", { n: rules.maxSpecial });
    if (rules.maxHeroes != null && this.stats.hero > rules.maxHeroes)
      warning += tf("need_heroes", { n: rules.maxHeroes });
    if (rules.maxSpies != null && this.stats.spy > rules.maxSpies)
      warning += tf("need_spies", { n: rules.maxSpies });
    if (rules.maxStrength != null && this.stats.strength > rules.maxStrength)
      warning += tf("need_strength", { n: rules.maxStrength });
    if (rules.maxWeather === 0 && this.stats.weather > 0)
      warning += t("need_weather_none");
    else if (rules.maxWeather != null && this.stats.weather > rules.maxWeather)
      warning += tf("need_weather", { n: rules.maxWeather });
    return warning;
  }

  // Opens a Carousel to allow the client to select a leader for their deck
  selectLeader() {
    let container = new CardContainer();
    container.cards = this.leaders.map((c) => {
      let card = new Card(c.card, player_me);
      card.data = c;
      return card;
    });

    let index = this.leaders.indexOf(this.leader);
    ui.queueCarousel(
      container,
      1,
      (c, i) => {
        let data = c.cards[i].data;
        this.leader = data;
        this.leader_elem.children[1].style.backgroundImage = largeURL(
          data.card.deck + "_" + data.card.filename,
        );
        paintLargeCard(this.leader_elem.children[1], data.card);
      },
      () => true,
      false,
      true,
    );
    Carousel.curr.index = index;
    Carousel.curr.update();
  }

  rememberFactionDeck() {
    if (!accountProfile || !this.deck) return;
    this.factionDecks[this.faction] = {
      leader: this.leader ? this.leader.index : null,
      cards: this.deck
        .filter((entry) => entry.count > 0)
        .map((entry) => ({ index: entry.index, count: entry.count })),
    };
  }

  // First visit to a faction: the deck is the cards of that faction the account owns.
  placeOwnedFactionCards() {
    this.makeBank(this.faction);
    for (let i = 0; i < this.deck.length; i++) {
      const card = card_dict[this.deck[i].index];
      if (card.deck !== this.faction) continue;
      const total = this.deck[i].count + this.bank[i].count;
      this.deck[i].count = total;
      this.bank[i].count = 0;
      setPreviewCount(this.deck[i].elem, total);
      setPreviewCount(this.bank[i].elem, 0);
    }
  }

  // Opens a Carousel to allow the client to select a faction for their deck
  selectFaction() {
    let container = new CardContainer();
    container.cards = Object.keys(factions).map((f) => {
      return {
        abilities: [f],
        filename: f,
        desc_name: factionField(f, "name"),
        desc: factionField(f, "description"),
        faction: "faction",
      };
    });
    let index = container.cards.reduce(
      (a, c, i) => (c.filename === this.faction ? i : a),
      0,
    );
    ui.queueCarousel(
      container,
      1,
      async (c, i) => {
        const card_faction_name = c.cards[i].filename;
        this.rememberFactionDeck();
        let change = await this.setFaction(card_faction_name);
        if (!change) return;
        if (accountProfile) {
          const saved = this.factionDecks[card_faction_name];
          if (saved) {
            this.makeBank(card_faction_name, saved.cards);
            if (saved.leader != null) this.setLeader(saved.leader);
          } else this.placeOwnedFactionCards();
          this.update();
          return;
        }
        const faction_premade_deck = premade_deck.find(
          (d) => d.faction === card_faction_name,
        );

        if (faction_premade_deck) {
          if (!faction_premade_deck?.cards[0].index)
            faction_premade_deck.cards = faction_premade_deck.cards.map(
              (c) => ({ index: c[0], count: c[1] }),
            );
          this.makeBank(card_faction_name, faction_premade_deck.cards);
        } else this.makeBank(card_faction_name);
        this.update();
      },
      () => true,
      false,
      true,
    );
    Carousel.curr.index = index;
    Carousel.curr.update();
  }

  // Called when client selects s a preview card. Moves it from bank to deck or vice-versa then updates;
  select(index, isBank) {
    if (isBank) {
      tocar("menu_buy", false);
      this.add(index, this.deck);
      this.remove(index, this.bank);
    } else {
      tocar("discard", false);
      this.add(index, this.bank);
      this.remove(index, this.deck);
    }
    this.update();
  }

  // Adds a card to container (Bank or deck)
  add(index, cards) {
    let id = cards[index];
    setPreviewCount(id.elem, ++id.count);
  }

  // Removes a card from container (bank or deck)
  remove(index, cards) {
    let id = cards[index];
    setPreviewCount(id.elem, --id.count);
  }

  // Returns every card in the deck to the collection. The leader stays.
  emptyDeck() {
    tocar("discard", false);
    for (let i = 0; i < this.deck.length; i++) {
      let copies = this.deck[i].count;
      if (!copies || !this.bank[i]) continue;
      this.bank[i].count += copies;
      setPreviewCount(this.bank[i].elem, this.bank[i].count);
      this.deck[i].count = 0;
      setPreviewCount(this.deck[i].elem, 0);
    }
    this.update();
  }

  // Removes all elements in the bank and deck
  clear() {
    while (this.bank_elem.firstChild)
      this.bank_elem.removeChild(this.bank_elem.firstChild);
    while (this.deck_elem.firstChild)
      this.deck_elem.removeChild(this.deck_elem.firstChild);
    this.bank = [];
    this.deck = [];
    this.stats = {};
  }

  // Verifies current deck, creates the players and their decks, then starts a new game
  async startNewGame() {
    if (amReady) {
      amReady = false;
      readyButtonElem.classList.remove("ready");
      customizationElem.classList.remove("noclick");
      netSend(JSON.stringify({ type: "unReady" }));
      return;
    }

    let warning = this.deckWarning();

    if (warning != "") return gameAlert(warning);
    if (!this.leader) return gameAlert(t("need_leader"));
    gameMode = "online";
    readyButtonElem.classList.add("ready");
    customizationElem.classList.add("noclick");

    let me_deck = {
      faction: this.faction,
      leader: card_dict[this.leader.index],
      cards: this.deck.filter((x) => x.count > 0),
    };

    player_me = new Player(0, "you", me_deck);
    readyButtonElem.disabled = true;
    netSend(JSON.stringify({ type: "ready", deck: me_deck }));
    setTimeout(function () { readyButtonElem.disabled = false; }, 8000);
    amReady = true;
    if (oponentReady) {
      this.elem.classList.add("hide");
      game.startGame();
    }
  }

  startOffline() {
    let warning = this.deckWarning();
    if (warning) return gameAlert(warning);
    if (!this.leader) return gameAlert(t("need_leader"));

    gameMode = "offline";
    let me_deck = {
      faction: this.faction,
      leader: card_dict[this.leader.index],
      cards: this.deck.filter((x) => x.count > 0),
    };
    let choices = premade_deck.filter((d) => d.faction !== this.faction);
    if (!choices.length) choices = premade_deck;
    let pick = choices[randomInt(choices.length)];
    let leaders = card_dict.filter(
      (c) => c.row === "leader" && c.deck === pick.faction,
    );
    let opCards = pick.cards.map((c) =>
      Array.isArray(c) ? { index: c[0], count: c[1] } : { index: c.index, count: c.count },
    );
    const profile = cpuProfile(cpuLevel);
    if (!profile) {
      if (customMode) opCards = trimToRules(opCards, activeRules());
    } else {
      const rules = tightenRules(customMode ? activeRules() : classicLimits(), profile);
      const built = buildLevelDeck(
        factionCopies(pick.faction),
        rules,
        cpuLevel !== "principiante" && cpuLevel !== "facil",
      );
      if (built) opCards = built;
      else if (customMode) opCards = trimToRules(opCards, activeRules());
    }
    let op_deck = {
      faction: pick.faction,
      leader: leaders[randomInt(leaders.length)],
      cards: opCards,
    };

    player_me = new Player(0, "you", me_deck);
    player_op = new Player(1, "Oponent", op_deck);
    this.elem.classList.add("hide");
    customizationElem.classList.add("hide");
    gameStartControlsElem.classList.add("hide");
    game.startGame();
  }

  // Converts the current deck to a JSON string
  deckToJSON() {
    let obj = {
      faction: this.faction,
      leader: this.leader.index,
      cards: this.deck
        .filter((x) => x.count > 0)
        .map((x) => [x.index, x.count]),
    };
    return JSON.stringify(obj);
  }

  // Called by the client to download the current deck as a JSON file
  downloadDeck() {
    let json = this.deckToJSON();
    let str = "data:text/json;charset=utf-8," + encodeURIComponent(json);
    let hidden_elem = document.getElementById("download-json");
    hidden_elem.href = str;
    hidden_elem.download = "GwentDeck.json";
    hidden_elem.click();
  }

  // Called by the client to upload a JSON file representing a new deck
  uploadDeck() {
    let files = document.getElementById("add-file").files;
    if (files.length <= 0) return false;
    let fr = new FileReader();
    fr.onload = (e) => {
      try {
        this.deckFromJSON(e.target.result);
      } catch (e) {
        gameAlert(t("deck_bad_format"));
      }
    };
    fr.readAsText(files.item(0));
    document.getElementById("add-file").value = "";
  }

  // Creates a deck from a JSON file's contents and sets that as the current deck
  // Notifies client with warnings if the deck is invalid
  async deckFromJSON(json) {
    let deck;
    try {
      deck = JSON.parse(json);
    } catch (e) {
      gameAlert(t("deck_unparsable"));
      return;
    }
    let warning = "";
    if (card_dict[deck.leader].row !== "leader")
      warning += tf("not_a_leader", { name: card_dict[deck.leader].name });
    if (!accountProfile && deck.faction != card_dict[deck.leader].deck)
      warning += tf("leader_faction_mismatch", {
        name: card_dict[deck.leader].name,
        faction: factionField(deck.faction, "name") || deck.faction,
      });

    let cards = deck.cards
      .filter((c) => {
        let card = card_dict[c[0]];
        if (!card) {
          warning += "ID " + c[0] + " does not correspond to a card.\n";
          return false;
        }
        const cap = accountProfile
          ? accountProfile.owned[card.filename] || 0
          : Number(card.count);
        if (
          !accountProfile &&
          ![deck.faction, "neutral", "special", "weather"].includes(card.deck)
        ) {
          warning += tf("card_wrong_faction", {
            name: card.name,
            faction: factionField(deck.faction, "name") || deck.faction,
          });
          return false;
        }
        if (cap < c[1]) {
          warning += tf("too_many_copies", {
            have: c[1],
            max: cap,
            name: card.name,
          });
          return false;
        }
        return true;
      })
      .map((c) => ({
        index: c[0],
        count: Math.min(
          c[1],
          accountProfile
            ? accountProfile.owned[card_dict[c[0]].filename] || 0
            : card_dict[c[0]].count,
        ),
      }));

    if (warning && !(await gameConfirm(warning + t("import_continue")))) return;
    this.setFaction(deck.faction, true);
    netSend(
      JSON.stringify({ type: "opChangeFaction", faction: deck.faction }),
    );
    var importedLeader = card_dict[deck.leader];
    var leaderOk =
      importedLeader.row === "leader" &&
      (accountProfile
        ? (accountProfile.owned[importedLeader.filename] || 0) > 0
        : deck.faction === importedLeader.deck);
    if (leaderOk) {
      this.leader = this.leaders.find((c) => c.index === deck.leader);
      if (this.leader) {
        this.leader_elem.children[1].style.backgroundImage = largeURL(
          this.leader.card.deck + "_" + this.leader.card.filename,
        );
        paintLargeCard(this.leader_elem.children[1], this.leader.card);
      }
    }
    this.makeBank(deck.faction, cards);
    this.update();
  }
}

// Translates a card between two containers
async function translateTo(card, container_source, container_dest) {
  if (!container_dest || !container_source) return;
  if (container_dest === player_op.hand && container_source === player_op.deck)
    return;

  let elem = card.elem;
  let source = !container_source
    ? card.elem
    : getSourceElem(card, container_source, container_dest);
  let dest = getDestinationElem(card, container_source, container_dest);
  if (!isInDocument(elem)) source.appendChild(elem);
  let x =
    trueOffsetLeft(dest) -
    trueOffsetLeft(elem) +
    dest.offsetWidth / 2 -
    elem.offsetWidth;
  let y =
    trueOffsetTop(dest) -
    trueOffsetTop(elem) +
    dest.offsetHeight / 2 -
    elem.offsetHeight / 2;
  if (
    container_dest instanceof Row &&
    container_dest.cards.length !== 0 &&
    !card.isSpecial()
  ) {
    x +=
      container_dest.getSortedIndex(card) === container_dest.cards.length
        ? elem.offsetWidth / 2
        : -elem.offsetWidth / 2;
  }
  if (card.holder.controller instanceof ControllerOponent)
    x += elem.offsetWidth / 2;
  if (
    container_source instanceof Row &&
    container_dest instanceof Grave &&
    !card.isSpecial()
  ) {
    let mid =
      trueOffset(container_source.elem, true) +
      container_source.elem.offsetWidth / 2;
    x += trueOffset(elem, true) - mid;
  }
  if (container_source instanceof Row && container_dest === player_me.hand)
    y *= 7 / 8;
  await translate(elem, x, y);

  // Returns true if the element is visible in the viewport
  function isInDocument(elem) {
    return elem.getBoundingClientRect().width !== 0;
  }

  // Returns the true offset of a nested element in the viewport
  function trueOffset(elem, left) {
    let total = 0;
    let curr = elem;
    while (curr) {
      total += left ? curr.offsetLeft : curr.offsetTop;
      curr = curr.parentElement;
    }
    return total;
  }
  function trueOffsetLeft(elem) {
    return trueOffset(elem, true);
  }
  function trueOffsetTop(elem) {
    return trueOffset(elem, false);
  }

  // Returns the source container's element to transition from
  function getSourceElem(card, source, dest) {
    if (source instanceof HandOponent) return source.hidden_elem;
    if (source instanceof Deck)
      return source.elem.children[source.elem.children.length - 2];
    return source.elem;
  }

  // Returns the destination container's element to transition to
  function getDestinationElem(card, source, dest) {
    if (dest instanceof HandOponent) return dest.hidden_elem;
    if (card.isSpecial() && dest instanceof Row) return dest.elem_special;
    if (
      dest instanceof Row ||
      dest instanceof Hand ||
      dest instanceof Weather
    ) {
      if (dest.cards.length === 0) return dest.elem;
      let index = dest.getSortedIndex(card);
      let dcard = dest.cards[index === dest.cards.length ? index - 1 : index];
      return dcard.elem;
    }
    return dest.elem;
  }
}

// Translates an element by x from the left and y from the top
async function translate(elem, x, y) {
  let vw100 = 100 / document.getElementById("dimensions").offsetWidth;
  x *= vw100;
  y *= vw100;
  elem.style.transform = "translate(" + x + "vw, " + y + "vw)";
  let margin = elem.style.marginLeft;
  elem.style.marginRight = -elem.offsetWidth * vw100 + "vw";
  elem.style.marginLeft = "";
  await sleep(499);
  elem.style.transform = "";
  elem.style.position = "";
  elem.style.marginLeft = margin;
  elem.style.marginRight = margin;
}

// Fades out an element until hidden over the duration
async function fadeOut(elem, duration, delay) {
  await fade(false, elem, duration, delay);
}

// Fades in an element until opaque over the duration
async function fadeIn(elem, duration, delay) {
  await fade(true, elem, duration, delay);
}

// Fades an element over a duration
async function fade(fadeIn, elem, dur, delay) {
  if (delay) await sleep(delay);
  let op = fadeIn ? 0.1 : 1;
  elem.style.opacity = op;
  elem.style.filter = "alpha(opacity=" + op * 100 + ")";
  if (fadeIn) elem.classList.remove("hide");
  let timer = setInterval(async function () {
    op += op * (fadeIn ? 0.1 : -0.1);
    if (op >= 1) {
      clearInterval(timer);
      return;
    } else if (op <= 0.1) {
      elem.classList.add("hide");
      elem.style.opacity = "";
      elem.style.filter = "";
      clearInterval(timer);
      return;
    }
    elem.style.opacity = op;
    elem.style.filter = "alpha(opacity=" + op * 100 + ")";
  }, dur / 24);
}

//      Get Image paths
function iconURL(name, ext = "png") {
  return imgURL("icons/" + name, ext);
}
function largeURL(name, ext = "jpg") {
  return imgURL("lg/" + name, ext);
}
function smallURL(name, ext = "jpg") {
  return imgURL("sm/" + name, ext);
}
function imgURL(path, ext) {
  return "url('img/" + path + "." + ext;
}

// A unit under weather drops to 1. With King Bran it keeps half, rounded up.
function weatheredPower(total, half) {
  total = Number(total) || 0;
  if (half) return Math.ceil(total / 2);
  return Math.min(1, total);
}
(function () {
  if (weatheredPower(6, false) !== 1 || weatheredPower(6, true) !== 3) throw new Error("clima bran");
  if (weatheredPower(5, true) !== 3 || weatheredPower(1, true) !== 1) throw new Error("clima bran");
})();

// Returns true if n is an Number
function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// Returns true if s is a String
function isString(s) {
  return typeof s === "string" || s instanceof String;
}

// Returns a random integer in the range [0,n)
function randomInt(n) {
  return Math.floor(Math.random() * n);
}

// Pauses execution until the passed number of milliseconds as expired
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
  //return new Promise(resolve => setTimeout(() => {if (func) func(); return resolve();}, ms));
}

// Suspends execution until the predicate condition is met, checking every ms milliseconds
function sleepUntil(predicate, ms) {
  return new Promise((resolve) => {
    let timer = setInterval(function () {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      }
    }, ms);
  });
}

// Remove circular references to create JSON.
function removeCircularReferences(obj) {
  const seen = new WeakSet();
  return JSON.parse(
    JSON.stringify(obj, (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return;
        }
        seen.add(value);
      }
      return value;
    }),
  );
}

function setPreviewCount(elem, n) {
  if (!elem) return;
  var count = elem.querySelector(":scope > .card-count");
  if (!count) {
    count = document.createElement("div");
    count.className = "card-count";
    elem.appendChild(count);
  }
  count.textContent = n;
}

function createCardElement(card) {
  let elem = document.createElement("div");
  elem.style.backgroundImage = smallURL(card.faction + "_" + card.filename);
  elem.classList.add("card");
  elem.addEventListener("click", () => ui.selectCard(card), false);
  elem.addEventListener("mouseover", function () {
    tutorialNote(card);
  });

  if (card.row === "leader") return elem;

  let power = document.createElement("div");
  elem.appendChild(power);
  let bg;
  if (card.hero) {
    bg = "power_hero";
    elem.classList.add("hero");
  } else if (card.faction === "weather") {
    bg = "power_" + card.abilities[0];
  } else if (card.faction === "special") {
    bg = "power_" + card.abilities[0];
    elem.classList.add("special");
  } else {
    bg = "power_normal";
  }
  power.style.backgroundImage = iconURL(bg);

  let row = document.createElement("div");
  elem.appendChild(row);
  if (
    card.row === "close" ||
    card.row === "ranged" ||
    card.row === "siege" ||
    card.row === "agile"
  ) {
    let num = document.createElement("div");
    num.appendChild(document.createTextNode(card.basePower));
    num.classList.add("center");
    power.appendChild(num);
    row.style.backgroundImage = iconURL("card_row_" + card.row);
  }

  let abi = document.createElement("div");
  elem.appendChild(abi);
  if (
    card.faction !== "special" &&
    card.faction !== "weather" &&
    card.abilities.length > 0
  ) {
    let str = card.abilities[card.abilities.length - 1];
    if (str === "cerys") str = "muster";
    if (str.startsWith("avenger")) str = "avenger";
    if (str === "scorch_c" || str == "scorch_r" || str === "scorch_s")
      str = "scorch";
    abi.style.backgroundImage = iconURL("card_ability_" + str);
  } else if (card.row === "agile")
    abi.style.backgroundImage = iconURL("card_ability_" + "agile");

  elem.appendChild(document.createElement("div")); // animation overlay
  return elem;
}

function somCarta() {
  var classes = ["card", "card-lg"];
  for (var i = 0; i < classes.length; i++) {
    var cartas = document.getElementsByClassName(classes[i]);
    for (var j = 0; j < cartas.length; j++) {
      if (cartas[j].id != "no_sound" && cartas[j].id != "no_hover")
        cartas[j].addEventListener("mouseover", function () {
          tocar("card", false);
        });
    }
  }
  var tags = ["label", "a", "button"];
  for (var i = 0; i < tags.length; i++) {
    var rec = document.getElementsByTagName(tags[i]);
    for (var j = 0; j < rec.length; j++)
      rec[j].addEventListener("mouseover", function () {
        tocar("card", false);
      });
  }
  var ids = ["pass-button", "toggle-music"];
  for (var i = 0; i < ids.length; i++)
    document.getElementById(ids[i]).addEventListener("mouseover", function () {
      tocar("card", false);
    });
}

var lastSound = "";

function tocar(arquivo, pararMusica) {
  if (arquivo != lastSound && arquivo != "") {
    var s = new Audio("sfx/" + arquivo + ".mp3");
    if (
      pararMusica &&
      ui.youtube &&
      typeof ui.youtube.getPlayerState === "function" &&
      typeof YT !== "undefined" &&
      ui.youtube.getPlayerState() === YT.PlayerState.PLAYING
    ) {
      ui.youtube.pauseVideo();
      ui.toggleMusic_elem.classList.add("fade");
    }
    lastSound = arquivo;
    var played = s.play();
    if (played && typeof played.catch === "function") played.catch(function () {});
    setTimeout(function () {
      lastSound = "";
    }, 50);
  }
}

/*----------------------------------------------------*/

function onYouTubeIframeAPIReady() {
  ui.initYouTube();
}

function loadYouTube() {
  if (ui.youtube || ui.youtubeLoading) return;
  ui.youtubeLoading = true;
  var script = document.createElement("script");
  script.src = "https://www.youtube.com/iframe_api";
  document.body.appendChild(script);
}

function iniciarMusica() {
  if (!ui.youtube || typeof ui.youtube.getPlayerState !== "function") {
    loadYouTube();
    return;
  }
  try {
    if (ui.youtube.getPlayerState() !== YT.PlayerState.PLAYING) {
      ui.youtube.playVideo();
      ui.toggleMusic_elem.classList.remove("fade");
    }
  } catch (err) {}
}

var ui = new UI();

var board = new Board();
var weather = new Weather();
var game = new Game();
var player_me, player_op;

ui.enablePlayer(false);
let dm = new DeckMaker();

function cartaNaLinha(id, carta) {
  tutorialNote(carta);
  if (id.charAt(0) == "f") {
    if (!carta.hero) {
      if (carta.name != "Decoy") {
        var linha = parseInt(id.charAt(1));
        if (linha == 1 || linha == 6) tocar("common3", false);
        else if (linha == 2 || linha == 5) tocar("common2", false);
        else if (linha == 3 || linha == 4) tocar("common1", false);
      } else tocar("menu_buy", false);
    } else tocar("hero", false);
  }
}

var turnClock = null;

function clearTurnClock() {
  clearInterval(turnClock);
  turnClock = null;
  var el = document.getElementById("turn-clock");
  if (el) el.classList.add("hide");
}

function showTurnClock(mine) {
  clearTurnClock();
  if (gameMode !== "online") return;
  var left = 60;
  var el = document.getElementById("turn-clock");
  if (!el) return;
  el.classList.remove("hide");
  el.classList.toggle("mine", !!mine);
  el.classList.toggle("theirs", !mine);
  el.textContent = "1:00";
  turnClock = setInterval(function () {
    left -= 1;
    if (left < 0) left = 0;
    el.textContent = "0:" + (left < 10 ? "0" : "") + left;
    if (left === 0) clearInterval(turnClock);
  }, 1000);
}

function armTurnClock() {
  showTurnClock(typeof game !== "undefined" && game.currPlayer === player_me);
  if (gameMode !== "online" || typeof game === "undefined" || !game.currPlayer) return;
  // ponytail: el numero en pantalla lo lleva cada navegador. El pase al minuto lo manda el servidor. Si los dos relojes se separan un segundo, manda el del servidor.
  netSend(JSON.stringify(game.currPlayer === player_me ? { type: "clock" } : { type: "clock", opp: true }));
}

function inicio() {
  var classe = document.getElementsByClassName("abs");
  for (var i = 0; i < classe.length; i++) classe[i].style.display = "none";
  document.getElementById("top-menu").classList.remove("hide");
  document.getElementById("top-tools").classList.remove("hide");
  iniciou = true;
  tocar("menu_opening", false);
}

var iniciou = false,
  isLoaded = false;
window.onload = function () {
  document.getElementById("load_text").style.display = "none";
  document.getElementById("button_start").style.display = "inline-block";
  customizationElem.style.display = "";
  document.getElementById("toggle-music").style.display = "";
  document.getElementsByTagName("main")[0].style.display = "";
  document
    .getElementById("button_start")
    .addEventListener("click", function () {
      inicio();
    });
  isLoaded = true;
};

let spacebarPressTimer;
let isSpacebarPressed = false;

function handleKeyDown(event) {
  if (event.code === "Space" && !isSpacebarPressed) {
    isSpacebarPressed = true;
    spacebarPressTimer = setTimeout(() => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      passButton.classList.remove("loading");
      player_me.passRound();
      netSend(JSON.stringify({ type: "pass", player: playerId }));
    }, 2 * 1000);
    startLoadingEffect();
  }
}

function handleKeyUp(event) {
  if (event.code === "Space") {
    isSpacebarPressed = false;
    clearTimeout(spacebarPressTimer);
    stopLoadingEffect();
  }
}

function startLoadingEffect() {
  passButton.classList.add("loading");
}

function stopLoadingEffect() {
  passButton.classList.remove("loading");
}

var keyHand = 0;
var keyRow = 0;

function keyTyping(event) {
  var el = event.target;
  if (!el || !el.tagName) return false;
  var tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

function keyBlocked() {
  var ids = ["rules-modal", "aid-modal", "game-notice", "pack-show", "popup"];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el && !el.classList.contains("hide")) return true;
  }
  return false;
}

function clearKeyPick() {
  var nodes = document.querySelectorAll(".key-pick");
  for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove("key-pick");
}

function clickedCard(event) {
  return !!(event && event.target && event.target.closest && event.target.closest(".card"));
}

function handOwns(card) {
  return !!(card && card.holder && card.holder.hand && card.holder.hand.cards.indexOf(card) !== -1);
}

function cardClickAction(card, preview, turn) {
  if (turn && handOwns(card)) return "play";
  if (turn && preview && preview.name === "Decoy" && card && card.isUnit && card.isUnit()) return "play";
  if (turn && handOwns(preview) && preview.name !== "Decoy") return "row";
  return "look";
}

(function () {
  var hand = { cards: [] };
  var unit = { name: "A", holder: { hand: hand }, isUnit: function () { return true; } };
  hand.cards.push(unit);
  var board = { name: "B", holder: { hand: { cards: [] } }, isUnit: function () { return true; } };
  var hero = { name: "C", holder: { hand: { cards: [] } }, isUnit: function () { return false; } };
  var decoy = { name: "Decoy", holder: { hand: { cards: [] } } };
  if (cardClickAction(unit, null, true) !== "play") throw new Error("clic mano");
  if (cardClickAction(board, null, true) !== "look") throw new Error("clic tablero");
  if (cardClickAction(board, unit, true) !== "row") throw new Error("clic al jugar");
  if (cardClickAction(board, decoy, true) !== "play") throw new Error("clic senuelo");
  if (cardClickAction(hero, decoy, true) !== "look") throw new Error("clic heroe");
  if (cardClickAction(board, null, false) !== "look") throw new Error("clic turno rival");
})();

function myKeyTurn() {
  if (typeof game === "undefined" || !game || typeof player_me === "undefined" || !player_me) return false;
  if (game.currPlayer !== player_me || player_me.passed) return false;
  var main = document.getElementsByTagName("main")[0];
  return !!(main && !main.classList.contains("noclick") && player_me.hand);
}

function playTargets() {
  if (!ui || !ui.previewCard) return [];
  var nodes = ui.previewCard.name === "Decoy"
    ? document.querySelectorAll(".row-selectable .card")
    : document.querySelectorAll(".row-selectable");
  return Array.prototype.filter.call(nodes, function (el) {
    return !el.classList.contains("noclick");
  });
}

function markPlayTarget() {
  var targets = playTargets();
  for (var i = 0; i < targets.length; i++) targets[i].classList.remove("key-pick");
  if (!targets.length) return;
  if (keyRow < 0 || keyRow >= targets.length) keyRow = 0;
  targets[keyRow].classList.add("key-pick");
}

function pickHand(delta) {
  var cards = player_me.hand.cards;
  if (!cards.length || !ui) return;
  var current = cards.indexOf(ui.previewCard);
  if (current >= 0) keyHand = current;
  keyHand = (keyHand + delta + cards.length) % cards.length;
  clearKeyPick();
  keyRow = 0;
  cards[keyHand].elem.classList.add("key-pick");
  ui.selectCard(cards[keyHand]);
  markPlayTarget();
}

function movePlayTarget(delta) {
  var targets = playTargets();
  if (!targets.length) return;
  keyRow = (keyRow + delta + targets.length) % targets.length;
  for (var i = 0; i < targets.length; i++) targets[i].classList.remove("key-pick");
  targets[keyRow].classList.add("key-pick");
}

var keyDeckEl = null;

function deckScreenOn() {
  return customizationElem && !customizationElem.classList.contains("hide") && customizationElem.style.display !== "none";
}

function visibleDeckCards() {
  var out = [];
  ["card-bank", "card-deck"].forEach(function (id) {
    var root = document.getElementById(id);
    if (!root) return;
    Array.prototype.forEach.call(root.children, function (el) {
      if (el.classList.contains("card-lg") && !el.classList.contains("hide")) out.push(el);
    });
  });
  return out;
}

function nearestDeckCard(from, dx, dy) {
  var cards = visibleDeckCards();
  var origin = from.getBoundingClientRect();
  var ox = origin.left + origin.width / 2;
  var oy = origin.top + origin.height / 2;
  var best = null;
  var bestScore = Infinity;
  for (var i = 0; i < cards.length; i++) {
    var el = cards[i];
    if (el === from) continue;
    var rect = el.getBoundingClientRect();
    var vx = rect.left + rect.width / 2 - ox;
    var vy = rect.top + rect.height / 2 - oy;
    if (dx && Math.sign(vx) !== dx) continue;
    if (dy && Math.sign(vy) !== dy) continue;
    var along = dx ? Math.abs(vx) : Math.abs(vy);
    var cross = dx ? Math.abs(vy) : Math.abs(vx);
    if (along < 4) continue;
    if (cross > along * 1.2) continue;
    var score = along + cross * 2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

function showDeckPick(el) {
  clearKeyPick();
  keyDeckEl = el;
  if (!el) return;
  el.classList.add("key-pick");
  var scroller = el.parentElement;
  if (!scroller) return;
  var er = el.getBoundingClientRect();
  var sr = scroller.getBoundingClientRect();
  if (er.top < sr.top) scroller.scrollTop -= sr.top - er.top;
  else if (er.bottom > sr.bottom) scroller.scrollTop += er.bottom - sr.bottom;
}

function pickDeck(dx, dy) {
  var cards = visibleDeckCards();
  if (!cards.length) return;
  if (!keyDeckEl || keyDeckEl.classList.contains("hide") || cards.indexOf(keyDeckEl) < 0) {
    showDeckPick(cards[0]);
    return;
  }
  var next = dx || dy ? nearestDeckCard(keyDeckEl, dx, dy) : keyDeckEl;
  showDeckPick(next || keyDeckEl);
}

function clickDeck() {
  var el = keyDeckEl;
  if (!el || el.classList.contains("hide")) {
    pickDeck(0, 0);
    return;
  }
  var parentId = el.parentElement ? el.parentElement.id : "";
  var before = [];
  var root = document.getElementById(parentId);
  if (root) {
    Array.prototype.forEach.call(root.children, function (child) {
      if (child.classList.contains("card-lg") && !child.classList.contains("hide")) before.push(child);
    });
  }
  var at = before.indexOf(el);
  el.click();
  if (!el.classList.contains("hide")) {
    showDeckPick(el);
    return;
  }
  var after = [];
  if (root) {
    Array.prototype.forEach.call(root.children, function (child) {
      if (child.classList.contains("card-lg") && !child.classList.contains("hide")) after.push(child);
    });
  }
  showDeckPick(after[Math.min(Math.max(at, 0), after.length - 1)] || visibleDeckCards()[0] || null);
}

document.addEventListener("keydown", function (event) {
  if (keyTyping(event) || keyBlocked()) return;
  var carousel = document.getElementById("carousel");
  if (carousel && !carousel.classList.contains("hide") && typeof Carousel !== "undefined" && Carousel.curr) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      Carousel.curr.shift(event, -1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      Carousel.curr.shift(event, 1);
    } else if (event.key === "Enter" && !event.repeat) {
      event.preventDefault();
      Carousel.curr.select(event);
    }
    return;
  }
  if (deckScreenOn() && (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter")) {
    event.preventDefault();
    if (event.key === "ArrowLeft") pickDeck(-1, 0);
    else if (event.key === "ArrowRight") pickDeck(1, 0);
    else if (event.key === "ArrowUp") pickDeck(0, -1);
    else if (event.key === "ArrowDown") pickDeck(0, 1);
    else if (!event.repeat) clickDeck();
    return;
  }
  if (!myKeyTurn()) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    pickHand(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    pickHand(1);
  } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
    event.preventDefault();
    movePlayTarget(event.key === "ArrowUp" ? -1 : 1);
  } else if (event.key === "Enter" && !event.repeat) {
    var targets = playTargets();
    if (!targets.length) {
      event.preventDefault();
      pickHand(0);
      return;
    }
    event.preventDefault();
    if (keyRow < 0 || keyRow >= targets.length) keyRow = 0;
    targets[keyRow].click();
  }
});

var tutorialOn = false;
var tutorialLive = false;
var tutorialPhase = "deck";
var tutorialStep = 0;
var tutorialCpuPrev = "";
var tutorialTarget = null;
var TUTORIAL_DECK = [
  { target: "faction-title", key: "tut_faction" },
  { target: "card-bank", key: "tut_bank" },
  { target: "card-deck", key: "tut_deck" },
  { target: "card-leader", key: "tut_leader" },
  { target: "deck-stats", key: "tut_limits" },
  { target: "cpu-level", key: "tut_cpu" },
  { target: "offline-game", key: "tut_choice", choice: true },
];
var TUTORIAL_MATCH = [
  { target: "carousel", key: "tut_redraw" },
  { target: "hand-row", key: "tut_hand" },
  { target: "field-me", key: "tut_rows" },
  { target: "panel-left", key: "tut_pass" },
  { target: "stats-me", key: "tut_gems" },
];

function tutorialSteps() {
  return tutorialPhase === "match" ? TUTORIAL_MATCH : TUTORIAL_DECK;
}

function clearTutorialTarget() {
  if (tutorialTarget) tutorialTarget.classList.remove("tutorial-target");
  tutorialTarget = null;
}

function tutorialKind(card) {
  if (!card) return "";
  if (card.row === "leader") return "leader";
  var abs = card.abilities || [];
  var last = abs.length ? String(abs[abs.length - 1]) : "";
  if (last === "cerys") last = "muster";
  if (last.indexOf("avenger") === 0) last = "avenger";
  if (last === "scorch_c" || last === "scorch_r" || last === "scorch_s") last = "scorch";
  var known = {
    spy: 1, medic: 1, muster: 1, morale: 1, bond: 1, avenger: 1, scorch: 1,
    horn: 1, decoy: 1, frost: 1, fog: 1, rain: 1, storm: 1, clear: 1,
    mardroeme: 1, berserker: 1,
  };
  if (known[last]) return last;
  if (card.hero) return "hero";
  if (card.row === "agile") return "agile";
  if (card.row === "close" || card.row === "ranged" || card.row === "siege" || card.row === "weather")
    return "unit";
  return "";
}

function tutorialNote(card) {
  if (!tutorialOn || tutorialPhase !== "match" || !card) return;
  var kind = tutorialKind(card);
  var key = kind ? "tut_card_" + kind : "";
  if (!key || !TEXTS.en[key]) return;
  document.getElementById("tutorial-text").textContent = t(key);
  var panel = document.getElementById("tutorial-panel");
  panel.classList.add("match");
  panel.classList.remove("hide");
}

function enterTutorialLive() {
  if (!tutorialOn) return;
  tutorialLive = true;
  clearTutorialTarget();
  var panel = document.getElementById("tutorial-panel");
  panel.classList.add("match");
  panel.classList.remove("hide");
  document.getElementById("tutorial-text").textContent = t("tut_live");
  document.getElementById("tutorial-next").classList.add("hide");
  document.getElementById("tutorial-back").classList.add("hide");
  document.getElementById("tutorial-play").classList.add("hide");
  document.getElementById("tutorial-game").classList.add("on");
}

function renderTutorial() {
  if (!tutorialOn) return;
  if (tutorialLive) {
    enterTutorialLive();
    return;
  }
  var steps = tutorialSteps();
  if (tutorialStep < 0) tutorialStep = 0;
  if (tutorialStep >= steps.length) tutorialStep = steps.length - 1;
  var step = steps[tutorialStep];
  clearTutorialTarget();
  var target = document.getElementById(step.target);
  if (target) {
    target.classList.add("tutorial-target");
    tutorialTarget = target;
  }
  document.getElementById("tutorial-text").textContent = t(step.key);
  var last = tutorialStep === steps.length - 1;
  var next = document.getElementById("tutorial-next");
  var play = document.getElementById("tutorial-play");
  next.classList.toggle("hide", !!step.choice);
  play.classList.toggle("hide", !step.choice);
  next.setAttribute("data-i18n", last ? "tut_done" : "tut_next");
  next.textContent = t(last ? "tut_done" : "tut_next");
  document.getElementById("tutorial-back").classList.toggle("hide", tutorialStep === 0);
  var panel = document.getElementById("tutorial-panel");
  panel.classList.toggle("match", tutorialPhase === "match");
  panel.classList.remove("hide");
  document.getElementById("tutorial-game").classList.add("on");
  openMenuFor(target);
}

function endTutorial() {
  tutorialOn = false;
  tutorialLive = false;
  tutorialPhase = "deck";
  tutorialStep = 0;
  clearTutorialTarget();
  document.getElementById("tutorial-panel").classList.add("hide");
  document.getElementById("tutorial-game").classList.remove("on");
  closeMenus();
  if (tutorialCpuPrev) {
    cpuLevel = tutorialCpuPrev;
    document.getElementById("cpu-level").value = tutorialCpuPrev;
    tutorialCpuPrev = "";
  }
}

function startTutorial() {
  if (tutorialOn) {
    endTutorial();
    return;
  }
  tutorialOn = true;
  tutorialLive = false;
  tutorialPhase = "deck";
  tutorialStep = 0;
  renderTutorial();
}

function showTutorialWait() {
  clearTutorialTarget();
  var panel = document.getElementById("tutorial-panel");
  panel.classList.add("match");
  panel.classList.remove("hide");
  document.getElementById("tutorial-text").textContent = t("tut_wait");
  document.getElementById("tutorial-next").classList.add("hide");
  document.getElementById("tutorial-back").classList.add("hide");
  document.getElementById("tutorial-play").classList.add("hide");
}

function onTutorialCarousel() {
  if (!tutorialOn || tutorialPhase !== "match" || tutorialLive) return;
  if (!Carousel.curr || Carousel.curr.title !== "redraw_hint") return;
  tutorialStep = 0;
  renderTutorial();
  document.getElementById("tutorial-next").classList.add("hide");
  document.getElementById("tutorial-back").classList.add("hide");
  document.getElementById("tutorial-play").classList.add("hide");
}

function onTutorialAfterRedraw() {
  if (!tutorialOn || tutorialPhase !== "match" || tutorialLive) return;
  if (tutorialStep !== 0) return;
  tutorialStep = 1;
  renderTutorial();
}

function startTutorialMatch() {
  tutorialCpuPrev = cpuLevel;
  cpuLevel = "principiante";
  document.getElementById("cpu-level").value = "principiante";
  tutorialPhase = "match";
  tutorialLive = false;
  tutorialStep = 0;
  dm.startOffline();
  if (gameMode !== "offline") {
    tutorialPhase = "deck";
    cpuLevel = tutorialCpuPrev;
    document.getElementById("cpu-level").value = tutorialCpuPrev;
    tutorialCpuPrev = "";
    renderTutorial();
    return;
  }
  showTutorialWait();
}

(function checkTutorial() {
  TUTORIAL_DECK.concat(TUTORIAL_MATCH).forEach(function (step) {
    if (!document.getElementById(step.target)) console.error("tutorial target", step.target);
  });
  ["unit", "hero", "agile", "spy", "medic", "muster", "morale", "bond", "avenger", "scorch", "horn", "decoy", "frost", "fog", "rain", "storm", "clear", "mardroeme", "berserker", "leader"].forEach(function (kind) {
    if (!TEXTS.en["tut_card_" + kind] || !TEXTS.es["tut_card_" + kind])
      console.error("tutorial card", kind);
  });
})();

function refreshLocalized() {
  function paint(card) {
    if (card && typeof card.refreshTexts === "function") card.refreshTexts();
  }
  function walk(cont) {
    if (cont && cont.cards) cont.cards.forEach(paint);
  }
  if (board && board.row) board.row.forEach(walk);
  if (typeof weather !== "undefined") walk(weather);
  if (player_me) {
    walk(player_me.hand);
    walk(player_me.grave);
    walk(player_me.deck);
    paint(player_me.leader);
    document.getElementById("name-me").textContent = displayName(player_me.name);
    document.getElementById("deck-name-me").textContent = factionField(
      player_me.deck.faction,
      "name",
    );
  }
  if (player_op) {
    walk(player_op.hand);
    walk(player_op.grave);
    walk(player_op.deck);
    paint(player_op.leader);
    document.getElementById("name-op").textContent = displayName(player_op.name);
    document.getElementById("deck-name-op").textContent = factionField(
      player_op.deck.faction,
      "name",
    );
  }
  if (typeof dm !== "undefined" && dm && dm.faction) {
    document.querySelector("#faction-title h1").textContent = factionField(
      dm.faction,
      "name",
    );
    document.getElementById("faction-description").textContent = factionField(
      dm.faction,
      "description",
    );
  }
  if (typeof Carousel !== "undefined" && Carousel.curr && Carousel.curr.container) {
    Carousel.curr.container.cards.forEach(function (card) {
      paint(card);
      if (card && card.faction === "faction" && card.abilities && card.abilities[0]) {
        card.desc_name = factionField(card.abilities[0], "name");
        card.desc = factionField(card.abilities[0], "description");
      }
    });
    if (Carousel.curr.title && Carousel.curr.title_elem)
      Carousel.curr.title_elem.innerHTML = t(Carousel.curr.title);
    if (Carousel.curr.indices && Carousel.curr.indices.length && ui) {
      var shown =
        Carousel.curr.container.cards[
          Carousel.curr.indices[Carousel.curr.index]
        ];
      if (shown) ui.setDescription(shown, Carousel.curr.desc);
    }
  }
  if (ui && ui.previewCard && ui.preview && !ui.preview.classList.contains("hide")) {
    paint(ui.previewCard);
    ui.setDescription(
      ui.previewCard,
      ui.preview.getElementsByClassName("card-description")[0],
    );
  }
  if (tutorialOn) renderTutorial();
}

function closeMenus(except) {
  var drops = document.querySelectorAll("#top-menu .menu-drop.open");
  for (var i = 0; i < drops.length; i++) {
    if (drops[i] !== except) drops[i].classList.remove("open");
  }
}

function openMenuFor(el) {
  var drop = el && el.closest ? el.closest(".menu-drop") : null;
  closeMenus(drop);
  if (drop) drop.classList.add("open");
}

document.querySelectorAll("#top-menu .menu-drop-btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    var drop = btn.parentElement;
    var was = drop.classList.contains("open");
    closeMenus();
    if (!was) drop.classList.add("open");
  });
});
document.addEventListener("click", function (event) {
  if (event.target.closest && event.target.closest("#top-menu, #tutorial-panel")) return;
  closeMenus();
});

document.getElementById("tutorial-game").addEventListener("click", startTutorial);
document.getElementById("tutorial-close").addEventListener("click", endTutorial);
document.getElementById("tutorial-back").addEventListener("click", function () {
  tutorialStep--;
  renderTutorial();
});
document.getElementById("tutorial-next").addEventListener("click", function () {
  if (tutorialPhase === "match" && tutorialStep >= tutorialSteps().length - 1) {
    enterTutorialLive();
    return;
  }
  if (tutorialStep >= tutorialSteps().length - 1) {
    endTutorial();
    return;
  }
  tutorialStep++;
  renderTutorial();
});
document.getElementById("tutorial-play").addEventListener("click", startTutorialMatch);
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && tutorialOn) endTutorial();
});
