# gwent-classic

![cover](https://user-images.githubusercontent.com/26311830/116256903-f1599b00-a7b6-11eb-84a1-16dcb5c9bfc6.jpg)

This repository is a fork of [Leo-Felde/gwent-multiplayer](https://github.com/Leo-Felde/gwent-multiplayer), which is a multiplayer fork of [asundr/gwent-classic](https://github.com/asundr/gwent-classic) by Arun Sundaram. The cards, the classic rules, and the original layout stay. This fork adds local play against the CPU, Spanish, and an optional custom deck mode.

The page [leo-felde.github.io/gwent-multiplayer](https://leo-felde.github.io/gwent-multiplayer/) belongs to the parent repository. It does not include the changes in this fork. Play this version on your own machine.

The Node server can still host more than one game at a time. Decoys, spies, most leader abilities, and medics respawning medics respawning whatever remain as they were in the multiplayer fork.

## How to play on this computer

Install [Node.js](https://nodejs.org/en/download). In the project folder (the one that contains `index.html`) run:

```
npm install
npm start
```

Then open http://127.0.0.1:8080 . `npm start` serves the page and the websocket on port 8080. Accounts, packs, and bets need MySQL. If it is down, the page still opens and `/api` answers 503.

**Offline** plays against the CPU. The server is not required for that match. **Online** plays against another player. The Online button checks that the server answers. If it does not, the page says to run `npm start`. Creating a game shows a session code. The other player joins with that code.

## Accounts, packs, and the tutorial

An account is optional. Register with a name, a password, and a faction. The browser keeps the login token. Without an account you can still play, and online a guest only meets another guest. An account only meets another account. The CPU is available either way.

Copy `db.example.json` to `db.json` and set the host, port, user, password, and database. `db.json` stays on this machine. Without that file the server uses localhost, user `root`, an empty password, database `gwent`, and port 3306. The same values can be set with `GWENT_DB_HOST`, `GWENT_DB_PORT`, `GWENT_DB_USER`, `GWENT_DB_PASSWORD`, and `GWENT_DB_NAME`. The server creates the database when the account is allowed to, then creates the tables. Set `"ssl": true` when the external server requires it.

A win against the CPU grants one pack of 1 to 3 cards. A loss or a draw sometimes grants one pack with a single weak card, and sometimes nothing. The end of the match only says whether a pack was earned. Opening it plays the envelope and adds the cards to the collection, stacked by copy, not to the deck in play. Online, both accounts can wager cards from the collection. The server decides that match from the round scores both players report, and Nilfgaard still wins a tie.

Tutorial, on the deck screen, walks through the layout and ends in a practice match on Beginner.

## CPU

The selector next to Offline has six levels: Beginner, Easy, Normal, Hard, Expert, and Madness (Principiante, Fácil, Normal, Difícil, Experto, Demencia).

- Beginner uses a short deck of weak units, with no heroes, spies, or weather, and plays at random.
- Easy uses a slightly larger deck, at most one hero, and no spies.
- Normal is the premade opponent from the original game.
- Hard, Expert, and Madness bring a stronger deck and pick the better move more often. Madness uses the strongest deck that faction is allowed to field.

Online ignores this selector. If Custom is on, the CPU deck also follows those limits.

## Custom rules and random deck

Classic mode is unchanged: at least 22 unit cards and at most 10 special cards. Weather cards count toward that 10. There is no cap on heroes, spies, strength, or deck size.

Custom is a separate switch. It can set a minimum and maximum of units, a maximum deck size, specials, weather on or off and a weather maximum, heroes, spies, and total strength. A blank number means that cap is not used.

Random deck builds a deck for the current faction inside whichever limits are active, classic or custom. The leader stays in that faction. If the limits cannot be met, the message says what that faction would need. Empty deck sends every card back to the collection and does not change the leader.

Against the CPU, both decks follow the active limits. Online, the player who creates the session sets the limits. The other player receives those limits and their deck is checked against them.

## Language

English is the default. The ES button switches to Spanish, and the choice is saved in the browser. Large cards show the Spanish name and the ability text over the picture. Small cards on the board keep the name painted on the art. Each player can use a different language. The Rules window and the player aid (Aid / Chuleta) follow the same choice and describe this game.

## Rules

The game is played in the same way as the original. The player aims to win two of three rounds. The higher strength wins the round.

### Cards and points

Points come from unit cards. Some units have an ability, shown by the symbol on the left. Cards and rows can be inspected in the game. Special cards apply weather, Scorch, Commander's Horn, Decoy, and the other effects from the original minigame.

### Turns

A turn is one card, or a pass. The opponent then plays until one player passes. The other may keep playing until they pass too. When both have passed, the round ends. A leader ability can be used once from the leader slot when it is available.

### Factions

The faction limits the unit cards, the neutral and special cards, and the leader. Each faction also has its own effect, shown when the faction is selected and at the top of the deck screen.

## Features

### All cards from The Witcher 3 and its expansions

All cards from the base game, Hearts of Stone, and Blood and Wine can be used, including Skellige. The CPU uses the same card pool. The count matches the original minigame.

### Faithful to the original minigame

The remake keeps the original font, layout, and notifications. Extra controls are the music toggle, the pass button, the language button, Rules, and the player aid. The deck screen can load a deck, save it, change faction, build a random deck, and empty the deck.

### Customize, save, and upload decks

Pick a faction at the top, then click cards to move them between the collection and the deck. The leader is chosen from the leaders of that faction. Saved decks are JSON and are checked against the faction and the active card limits.

### Music

The Gwent tracks still stream from YouTube. The music icon is in the center of the deck screen and at the bottom left during a match. Card sound effects come from [RandomPianist's fork](https://github.com/RandomPianist).

## How to host a server

Local play does not need a config change. The server listens on `0.0.0.0` and on `PORT`, or 8080 if `PORT` is not set, and it serves this folder. Opening the page from that server makes Online use the same address.

To put it on a remote host, [Glitch](https://glitch.com), [Fly.io](https://fly.io/docs/js/), and [Render](https://render.com/) still work. Set `PORT` if the host requires it. `config.js` holds `CLIENT_CONFIG`, a fallback `wss://` address used only when the page cannot reach a local server. The old edit in `session.js` that switched `ws://` to `wss://` is no longer needed.

A successful online connection shows the session code after Create Game. If nothing is listening, the page says the server is not running.

## Known issues

Bugs and suggestions are welcome. Open an issue on this fork.
