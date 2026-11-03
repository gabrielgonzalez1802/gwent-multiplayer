"use strict";

var factions = {
  realms: {
    name: "Northern Realms",
    factionAbility: (player) =>
      game.roundStart.push(async () => {
        if (
          game.roundCount > 1 &&
          game.roundHistory[game.roundCount - 2].winner === player
        ) {
          player.deck.draw(player.hand);
          await ui.notification("north", 1200);
        }
        return false;
      }),
    description: "Draw a card from your deck whenever you win a round.",
  },
  nilfgaard: {
    name: "Nilfgaardian Empire",
    description: "Wins any round that ends in a draw.",
  },
  monsters: {
    name: "Monsters",
    factionAbility: (player) =>
      game.roundEnd.push(() => {
        if (player === player_me || player.controller instanceof ControllerAI) {
          let units = board.row
            .filter((r, i) => (player === player_me) ^ (i < 3))
            .reduce((a, r) => r.cards.filter((c) => c.isUnit()).concat(a), []);
          if (units.length === 0) return false;

          let card = units[randomInt(units.length)];
          if (player === player_me) {
            netSend(
              JSON.stringify({
                type: "monstersKeepCard",
                card: removeCircularReferences(card),
              }),
            );
          }
          card.noRemove = true;
          game.roundStart.push(async () => {
            await ui.notification("monsters", 1200);
            delete card.noRemove;
            return true;
          });
        }
        return false;
      }),
    description: "Keeps a random Unit Card out after each round.",
  },
  scoiatael: {
    name: "Scoia'tael",
    factionAbility: (player) =>
      game.gameStart.push(async () => {
        if (player === player_me) {
          await ui.popup(
            t("go_first"),
            () => (game.firstPlayer = player),
            t("let_opponent"),
            () => (game.firstPlayer = player.opponent()),
            t("go_first_title"),
            t("scoiatael_perk"),
          );
          netSend(
            JSON.stringify({
              type: "scoiataelStart",
              first: game.firstPlayer.tag,
            }),
          );
        }
        return true;
      }),
    description: "Decides who takes first turn.",
  },
  skellige: {
    name: "Skellige",
    factionAbility: (player) =>
      game.roundStart.push(async () => {
        if (game.roundCount != 3) return false;
        await ui.notification("skellige-" + player.tag, 1200);
        const randomGraveCards = player.grave.findCardsRandom(
          (c) => c.isUnit(),
          2,
        );
        console.log("skellige plays the cards:", randomGraveCards);
        if (player === player_me || player.controller instanceof ControllerAI) {
          await Promise.all(
            randomGraveCards.map((c) => board.toRow(c, player.grave)),
          );
          if (player === player_me) {
            netSend(
              JSON.stringify({
                type: "skelligeAbility",
                cards: removeCircularReferences(randomGraveCards),
              }),
            );
          }
        }
        return true;
      }),
    description:
      "2 random cards from the graveyard are placed on the battlefield at the start of the third round.",
  },
};
