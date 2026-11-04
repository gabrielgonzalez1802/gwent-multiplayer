"use strict";

var LANG = localStorage.getItem("gwent-lang") === "es" ? "es" : "en";

var TEXTS = {
  en: {
    title: "Gwent Classic - Multiplayer",
    splash: "UP FOR<br>A FEW ROUNDS<br>OF GWENT?",
    loading: "Loading...",
    begin: "Click here to begin",
    opponent: "Opponent",
    passed: "Passed",
    pass_round: "Pass round",
    space_hint: "[Space]",
    round_1: "Round 1",
    round_2: "Round 2",
    round_3: "Round 3",
    draw_note:
      "The battle cannot end in a draw. You can play a rematch using the same decks or surrender.",
    customize: "Customize",
    replay: "Replay",
    load_deck: "Load Deck",
    change_faction: "Change Faction",
    download_deck: "Download Deck",
    empty_deck: "Clear deck",
    random_deck: "Random deck",
    random_fail: "A random deck of {faction} cannot be built with these limits.",
    random_pool: "{faction} has {units} units ({heroes} heroes, {spies} spies) and {specials} specials.",
    random_need_unit_order: "Max. units ({max}) must be at least the minimum ({min}).",
    random_need_deck: "Max. cards ({max}) must be at least the minimum of units ({min}).",
    random_need_units: "Min. units ({min}) cannot be higher than the {have} units of this faction.",
    random_need_heroes: "With at most {cap} heroes, {min} units do not fit: only {plain} units are not heroes, and the faction has {have} heroes.",
    random_need_spies: "With at most {cap} spies, {min} units do not fit: only {plain} units are not spies, and the faction has {have} spies.",
    random_need_strength: "The {min} weakest units that still fit add up to {need} strength. Max. strength is {cap}.",
    random_need_together: "These caps together do not leave enough cards. Raise a maximum or lower the minimum.",
    collection: "Card Collection",
    in_deck: "Cards in Deck",
    leader: "Leader",
    stat_total: "Total cards in deck",
    stat_units: "Number of Unit Cards",
    stat_special: "Special Cards",
    stat_strength: "Total Unit Card Strength",
    stat_heroes: "Hero Cards",
    offline_play: "Offline",
    acc_name: "Name",
    acc_pass: "Password",
    acc_register: "Create account",
    acc_login: "Log in",
    acc_wait: "Wait",
    acc_logout: "Log out",
    acc_open: "Open pack ({n})",
    acc_who: "{name}",
    acc_bad: "That name or password is not valid.",
    acc_taken: "That name is already in use.",
    acc_db: "The database is not available.",
    acc_need: "Use a name of 3 to 16 letters and a password of at least 4 characters.",
    need_leader: "Choose a leader.",
    bet_add: "Add",
    bet_clear: "Clear",
    bet_ok: "Confirm bet",
    bet_title: "Bet",
    bet_open: "Bet",
    bet_close: "Close",
    bet_mine: "You: {cards}",
    bet_theirs: "Opponent: {cards}",
    bet_none: "nothing",
    bet_wait: "Both players have to confirm the bet before the match.",
    bet_locked: "Bet locked.",
    bet_login: "Both players have to be logged in to bet.",
    bet_deck: "That deck uses cards you do not own.",
    bet_reject: "That bet is not valid.",
    bet_won: "You won the bet: {cards}",
    bet_lost: "You lost the bet: {cards}",
    bet_draw: "Draw. The bet stays put.",
    bet_dispute: "The bet could not be settled.",
    bet_forfeit_win: "Your opponent left. You won the bet: {cards}",
    bet_forfeit_loss: "You left after confirming. You lost the bet: {cards}",
    bet_you: "You",
    bet_you_name: "You ({name})",
    bet_rival: "Opponent",
    bet_line: "{who} · {n}: {cards}",
    bet_ok_mark: "confirmed",
    bet_one: "1 card",
    bet_many: "{n} cards",
    bet_same: "Pick one or more cards. Both players must stake the same number and confirm.",
    bet_gap: "Your opponent wants to bet {what}. To play with a bet, both must stake the same number of cards and confirm the bet.",
    bet_wait_match: "You staked {what}. Your opponent has to stake the same number of cards and confirm the bet.",
    pack_got: "You earned a pack.",
    pack_got_n: "You earned {n} packs.",
    end_wait: "Waiting for the other player.",
    resume_back: "Returning to the match.",
    resume_fail: "The board could not be recovered. You are still in the room.",
    end_deck_other: "Your opponent wants to build a deck again. This is a chance to review yours and continue.",
    pack_neutral: "Neutral",
    pack_special: "Special",
    pack_weather: "Weather",
    pack_skip: "No pack: a card has to be played.",
    pack_card: "The pack had {name}.",
    pack_empty: "You have no packs.",
    cpu_cards: "You received {n}: {cards}",
    cpu_none: "No pack this time.",
    full_enter: "Fullscreen",
    full_exit: "Exit fullscreen",
    tut_btn: "Tutorial",
    tut_back: "Back",
    tut_next: "Next",
    tut_done: "Done",
    tut_close: "Close",
    tut_play: "Play practice",
    tut_faction: "This is your faction. Change Faction switches it, and the line under the name is its ability.",
    tut_bank: "The collection is on the left. Click a card to put one copy in the deck.",
    tut_deck: "The deck is on the right. Click a card there to send it back to the collection.",
    tut_leader: "The leader is in the center. Click it to choose another leader of this faction. The ability is used once per match.",
    tut_limits: "Classic rules need at least 22 unit cards and at most 10 special cards. A number turns red when the deck is not allowed.",
    tut_cpu: "Offline uses this difficulty. The practice match plays on Beginner.",
    tut_choice: "Close this guide, or play a practice match against Beginner with the deck you have now.",
    tut_wait: "The practice match is starting. You can swap cards in a moment.",
    tut_redraw: "You drew 10 cards. You may swap up to 2. Pick the ones you do not want, then confirm. You can also keep all of them.",
    tut_hand: "These are your cards. On your turn, click one and then the row where it plays.",
    tut_rows: "Your three rows are close combat, ranged, and siege. The number on the left is that row's strength.",
    tut_pass: "To pass, hold Space, or use Pass on the left when it is your turn. The round ends when both players have passed.",
    tut_gems: "You have two gems. Losing a round removes one. The total is your strength this round. Win two rounds to win the match.",
    tut_live: "The guide stays for the whole match. Pass the pointer over a card and it names the type. Close hides it.",
    tut_card_unit: "A plain unit. Play it on its row and its strength is added there.",
    tut_card_hero: "A hero keeps its printed strength. Weather and Scorch do not change it.",
    tut_card_agile: "Agile can go to close combat or ranged, and it stays on the row you choose.",
    tut_card_spy: "A spy is placed on your opponent's side, and you draw 2 cards.",
    tut_card_medic: "A medic lets you play one non-hero unit from your discard pile.",
    tut_card_muster: "Muster plays every card of the same name from your deck and your hand.",
    tut_card_morale: "Morale gives +1 to the other units on its row. Several of them stack.",
    tut_card_bond: "Tight bond multiplies the strength of cards that share its name on the same row.",
    tut_card_avenger: "When this card leaves the battlefield, it summons another unit in its place.",
    tut_card_scorch: "Scorch destroys the strongest non-hero unit. Every unit tied for that strength is destroyed.",
    tut_card_horn: "Commander's horn doubles one row. A second horn on that row does not double it again.",
    tut_card_decoy: "Decoy swaps with one of your units and returns that unit to your hand.",
    tut_card_frost: "Biting frost sets close combat to 1. Heroes are not affected.",
    tut_card_fog: "Impenetrable fog sets ranged to 1. Heroes are not affected.",
    tut_card_rain: "Torrential rain sets siege to 1. Heroes are not affected.",
    tut_card_storm: "Skellige storm sets ranged and siege to 1. Heroes are not affected.",
    tut_card_clear: "Clear weather removes every weather effect.",
    tut_card_mardroeme: "Mardroeme transforms every Berserker on its row.",
    tut_card_berserker: "A Berserker becomes a stronger unit when Mardroeme hits its row.",
    tut_card_leader: "The leader ability can be used once from the leader slot.",
    cpu_principiante: "Beginner",
    cpu_facil: "Easy",
    cpu_normal: "Normal",
    cpu_dificil: "Hard",
    cpu_experto: "Expert",
    cpu_demencia: "Madness",
    menu_play: "Play",
    menu_online: "Online",
    menu_limits: "Limits",
    menu_account: "Account",
    online_play: "Online",
    create_game: "Create Game",
    join_game: "Join Game",
    session_code: "Session code",
    join: "Join",
    ready: "Ready",
    cancel: "Cancel",
    session: "Session:",
    role_host: "Host",
    role_guest: "Guest",
    role_you_host: "You are the host",
    role_you_guest: "You are the guest",
    role_line: "{host}: {hostName} · {guest}: {guestName}",
    copied: "Copied to clipboard",
    no_server: "Server is not running. Run npm start",
    custom_mode: "Custom",
    rule_units: "Min. units",
    rule_units_max: "Max. units",
    rule_deck: "Max. cards",
    rule_special: "Max. specials",
    rule_heroes: "Max. heroes",
    rule_spies: "Max. spies",
    rule_strength: "Max. strength",
    rule_weather: "Weather",
    rule_weather_max: "Max. weather",
    rule_blank: "no cap",
    rule_reset: "Classic limits",
    stat_spies: "Spies",
    stat_weather: "Weather cards",
    need_units_n: "Your deck must have at least {n} unit cards. \n",
    need_units_max: "Your deck must have no more than {n} unit cards. \n",
    need_deck: "Your deck must have no more than {n} cards. \n",
    need_unit_range: "Max. units cannot be lower than min. units. \n",
    need_special_n: "Your deck must have no more than {n} special cards. \n",
    need_heroes: "Your deck must have no more than {n} heroes. \n",
    need_spies: "Your deck must have no more than {n} spy cards. \n",
    need_strength: "Your deck strength must be at most {n}. \n",
    need_weather: "Your deck must have no more than {n} weather cards. \n",
    need_weather_none: "Your deck cannot include weather cards. \n",
    redraw_hint: "Choose up to 2 cards to redraw.",
    confirm_faction: "Changing factions will clear the current deck. Continue? ",
    confirm_faction_account: "Switch to the deck you already have for this faction?",
    session_bad: "That session code does not exist.",
    session_mix: "Online, an account only plays another account. Without an account, only someone without one.",
    op_wait: "The other player left. {n} seconds to return.",
    rules_host: "The host's deck limits are in effect.",
    notice_ok: "OK",
    need_units: "Your deck must have at least 22 unit cards. \n",
    need_special_max: "Your deck must have no more than 10 special cards. \n",
    deck_bad_format: "Uploaded deck is not formatted correctly!",
    deck_unparsable: "Uploaded deck is not parsable!",
    not_a_leader: "'{name}' is cannot be used as a leader\n",
    leader_faction_mismatch:
      "Leader '{name}' doesn't match deck faction '{faction}'.\n",
    card_wrong_faction:
      "'{name}' cannot be used in a deck of faction type '{faction}'\n",
    too_many_copies: "Deck contains {have}/{max} available {name} cards\n",
    import_continue: "\n\nContinue importing deck?",
    go_first: "Go First",
    let_opponent: "Let Opponent Start",
    go_first_title: "Would you like to go first?",
    scoiatael_perk:
      "The Scoia'tael faction perk allows you to decide who will get to go first.",
    yes: "Yes",
    no: "No",
    you: "you",
    leader_ability: "Leader Ability",
    rules_btn: "Rules",
    rules_title: "How to play",
    rules_close: "Close",
    aid_btn: "Aid",
    chat_title: "Chat",
    chat_send: "Send",
    chat_placeholder: "Message",
    chat_emoji: "☺",
    aid_title: "Player aid",
  },
  es: {
    title: "Gwent Classic - Multijugador",
    splash: "¿TE APETECE<br>UNAS RONDAS<br>DE GWENT?",
    loading: "Cargando...",
    begin: "Pulsa aquí para empezar",
    opponent: "Oponente",
    passed: "Pasó",
    pass_round: "Pasar ronda",
    space_hint: "[Espacio]",
    round_1: "Ronda 1",
    round_2: "Ronda 2",
    round_3: "Ronda 3",
    draw_note:
      "La batalla no puede terminar en empate. Puedes jugar la revancha con los mismos mazos o rendirte.",
    customize: "Personalizar",
    replay: "Repetir",
    load_deck: "Cargar mazo",
    change_faction: "Cambiar facción",
    download_deck: "Descargar mazo",
    empty_deck: "Vaciar mazo",
    random_deck: "Mazo al azar",
    random_fail: "No se puede armar un mazo al azar de {faction} con estos límites.",
    random_pool: "{faction} tiene {units} unidades ({heroes} héroes, {spies} espías) y {specials} especiales.",
    random_need_unit_order: "El máximo de unidades ({max}) tiene que ser al menos el mínimo ({min}).",
    random_need_deck: "El máximo del mazo ({max}) tiene que ser al menos el mínimo de unidades ({min}).",
    random_need_units: "El mínimo de unidades ({min}) no puede ser mayor que las {have} unidades de esta facción.",
    random_need_heroes: "Con máximo {cap} héroes no caben {min} unidades: solo {plain} no son héroes, y la facción tiene {have} héroes.",
    random_need_spies: "Con máximo {cap} espías no caben {min} unidades: solo {plain} no son espías, y la facción tiene {have} espías.",
    random_need_strength: "Las {min} unidades más débiles que aún caben suman {need} de fuerza. La fuerza máxima es {cap}.",
    random_need_together: "Esos topes juntos no dejan cartas suficientes. Sube un máximo o baja el mínimo.",
    collection: "Colección",
    in_deck: "Cartas del mazo",
    leader: "Líder",
    stat_total: "Cartas en el mazo",
    stat_units: "Cartas de unidad",
    stat_special: "Cartas especiales",
    stat_strength: "Fuerza de las unidades",
    stat_heroes: "Cartas de héroe",
    offline_play: "Contra la CPU",
    acc_name: "Nombre",
    acc_pass: "Clave",
    acc_register: "Crear cuenta",
    acc_login: "Entrar",
    acc_wait: "Espera",
    acc_logout: "Salir",
    acc_open: "Abrir sobre ({n})",
    acc_who: "{name}",
    acc_bad: "Ese nombre o esa clave no sirven.",
    acc_taken: "Ese nombre ya está usado.",
    acc_db: "La base de datos no está disponible.",
    acc_need: "El nombre lleva de 3 a 16 letras y la clave al menos 4 caracteres.",
    need_leader: "Elige un líder.",
    bet_add: "Añadir",
    bet_clear: "Quitar",
    bet_ok: "Confirmar apuesta",
    bet_title: "Apuesta",
    bet_open: "Apostar",
    bet_close: "Cerrar",
    bet_mine: "Tú: {cards}",
    bet_theirs: "Rival: {cards}",
    bet_none: "nada",
    bet_wait: "Los dos tienen que confirmar la apuesta antes de la partida.",
    bet_locked: "Apuesta cerrada.",
    bet_login: "Los dos tienen que estar logueados para apostar.",
    bet_deck: "Ese mazo usa cartas que no tienes.",
    bet_reject: "Esa apuesta no vale.",
    bet_won: "Ganaste la apuesta: {cards}",
    bet_lost: "Perdiste la apuesta: {cards}",
    bet_draw: "Empate. La apuesta no se mueve.",
    bet_dispute: "La apuesta no se pudo resolver.",
    bet_forfeit_win: "El rival se fue. Ganaste la apuesta: {cards}",
    bet_forfeit_loss: "Te fuiste después de confirmar. Perdiste la apuesta: {cards}",
    bet_you: "Tú",
    bet_you_name: "Tú ({name})",
    bet_rival: "Rival",
    bet_line: "{who} · {n}: {cards}",
    bet_ok_mark: "confirmada",
    bet_one: "1 carta",
    bet_many: "{n} cartas",
    bet_same: "Elige una o más cartas. Los dos tienen que apostar la misma cantidad y confirmar.",
    bet_gap: "Tu contraparte quiere apostar {what}. Para jugar con modo apuesta deben apostar la misma cantidad de cartas y confirmar la apuesta.",
    bet_wait_match: "Apostaste {what}. Tu contraparte tiene que apostar la misma cantidad de cartas y confirmar la apuesta.",
    pack_got: "Ganaste un sobre.",
    pack_got_n: "Ganaste {n} sobres.",
    end_wait: "Esperando al otro jugador.",
    resume_back: "Volviendo a la partida.",
    resume_fail: "No se pudo recuperar el tablero. Sigues en la sala.",
    end_deck_other: "Tu contraparte quiere armar de nuevo el mazo. Es un momento para revisar el tuyo y seguir.",
    pack_neutral: "Neutral",
    pack_special: "Especial",
    pack_weather: "Clima",
    pack_skip: "Sin sobre: hay que jugar una carta.",
    pack_card: "El sobre traía {name}.",
    pack_empty: "No tienes sobres.",
    cpu_cards: "Te han tocado {n}: {cards}",
    cpu_none: "Esta vez no te tocó sobre.",
    full_enter: "Pantalla completa",
    full_exit: "Salir de pantalla completa",
    tut_btn: "Tutorial",
    tut_back: "Atrás",
    tut_next: "Siguiente",
    tut_done: "Listo",
    tut_close: "Cerrar",
    tut_play: "Jugar práctica",
    tut_faction: "Esta es tu facción. Cambiar facción la sustituye, y la frase de debajo es su habilidad.",
    tut_bank: "La colección está a la izquierda. Un clic mete una copia en el mazo.",
    tut_deck: "El mazo está a la derecha. Un clic ahí devuelve la carta a la colección.",
    tut_leader: "El líder está en el centro. Un clic abre los líderes de esta facción. Su habilidad se usa una vez por partida.",
    tut_limits: "En clásico hacen falta al menos 22 unidades y como máximo 10 especiales. Si el mazo no vale, el número se pone rojo.",
    tut_cpu: "Contra la CPU usa esta dificultad. La práctica se juega en Principiante.",
    tut_choice: "Puedes cerrar la guía o jugar una práctica contra Principiante con el mazo que tienes ahora.",
    tut_wait: "La práctica está empezando. Enseguida puedes cambiar cartas.",
    tut_redraw: "Robaste 10 cartas. Puedes cambiar hasta 2. Elige las que no quieras y confirma. También puedes quedarte con todas.",
    tut_hand: "Estas son tus cartas. En tu turno, elige una y luego la fila donde se juega.",
    tut_rows: "Tus filas son las tres de tu lado: cuerpo a cuerpo, a distancia y asedio. El número de la izquierda es la fuerza de esa fila.",
    tut_pass: "Para pasar, mantén Espacio o usa Pasar, a la izquierda, cuando sea tu turno. La ronda termina cuando los dos han pasado.",
    tut_gems: "Tienes dos gemas. Pierdes una si pierdes la ronda. El total es tu fuerza en esta ronda. Ganas la partida al ganar dos rondas.",
    tut_live: "La guía sigue toda la partida. Pasa el mouse por una carta y te dice el tipo. Cerrar la quita.",
    tut_card_unit: "Unidad sin habilidad. Se juega en su fila y suma su fuerza ahí.",
    tut_card_hero: "Un héroe conserva la fuerza impresa. El clima y Abrasamiento no lo cambian.",
    tut_card_agile: "Ágil puede ir a cuerpo a cuerpo o a distancia, y se queda en la fila que elijas.",
    tut_card_spy: "Un espía se coloca en el campo del rival y tú robas 2 cartas.",
    tut_card_medic: "Un médico te deja jugar una unidad que no sea héroe desde tu descarte.",
    tut_card_muster: "Reclutamiento juega todas las cartas del mismo nombre que tengas en el mazo o en la mano.",
    tut_card_morale: "Moral da +1 a las demás unidades de su fila. Varias se acumulan.",
    tut_card_bond: "Vínculo firme multiplica la fuerza de las cartas del mismo nombre en esa fila.",
    tut_card_avenger: "Cuando esta carta sale del campo, invoca otra unidad en su lugar.",
    tut_card_scorch: "Abrasamiento destruye la unidad no héroe más fuerte. Si hay varias con esa fuerza, las destruye todas.",
    tut_card_horn: "Cuerno del comandante duplica una fila. Un segundo cuerno en esa fila no la duplica otra vez.",
    tut_card_decoy: "Señuelo se cambia por una de tus unidades y esa unidad vuelve a tu mano.",
    tut_card_frost: "Escarcha mordiente deja el cuerpo a cuerpo en 1. Los héroes no cambian.",
    tut_card_fog: "Niebla impenetrable deja a distancia en 1. Los héroes no cambian.",
    tut_card_rain: "Lluvia torrencial deja el asedio en 1. Los héroes no cambian.",
    tut_card_storm: "Tormenta de Skellige deja a distancia y asedio en 1. Los héroes no cambian.",
    tut_card_clear: "Clima despejado quita todos los efectos de clima.",
    tut_card_mardroeme: "Mardroeme transforma a todos los berserkers de su fila.",
    tut_card_berserker: "Un berserker se convierte en una unidad más fuerte si Mardroeme cae en su fila.",
    tut_card_leader: "La habilidad del líder se usa una vez desde su hueco.",
    cpu_principiante: "Principiante",
    cpu_facil: "Fácil",
    cpu_normal: "Normal",
    cpu_dificil: "Difícil",
    cpu_experto: "Experto",
    cpu_demencia: "Demencia",
    menu_play: "Jugar",
    menu_online: "En línea",
    menu_limits: "Límites",
    menu_account: "Cuenta",
    online_play: "En línea",
    create_game: "Crear partida",
    join_game: "Unirse",
    session_code: "Código",
    join: "Entrar",
    ready: "Listo",
    cancel: "Cancelar",
    session: "Sesión:",
    role_host: "Anfitrión",
    role_guest: "Invitado",
    role_you_host: "Eres el anfitrión",
    role_you_guest: "Eres el invitado",
    role_line: "{host}: {hostName} · {guest}: {guestName}",
    copied: "Copiado",
    no_server: "El servidor no está levantado. Ejecuta npm start",
    custom_mode: "Personalizado",
    rule_units: "Mínimo de unidades",
    rule_units_max: "Máximo de unidades",
    rule_deck: "Máximo del mazo",
    rule_special: "Máximo de especiales",
    rule_heroes: "Máximo de héroes",
    rule_spies: "Máximo de espías",
    rule_strength: "Fuerza máxima",
    rule_weather: "Clima",
    rule_weather_max: "Máximo de clima",
    rule_blank: "sin tope",
    rule_reset: "Límites clásicos",
    stat_spies: "Espías",
    stat_weather: "Cartas de clima",
    need_units_n: "El mazo debe tener al menos {n} cartas de unidad. \n",
    need_units_max: "El mazo no puede tener más de {n} cartas de unidad. \n",
    need_deck: "El mazo no puede tener más de {n} cartas. \n",
    need_unit_range: "El máximo de unidades no puede ser menor que el mínimo. \n",
    need_special_n: "El mazo no puede tener más de {n} cartas especiales. \n",
    need_heroes: "El mazo no puede tener más de {n} héroes. \n",
    need_spies: "El mazo no puede tener más de {n} cartas de espía. \n",
    need_strength: "La fuerza del mazo no puede pasar de {n}. \n",
    need_weather: "El mazo no puede tener más de {n} cartas de clima. \n",
    need_weather_none: "El mazo no puede incluir cartas de clima. \n",
    redraw_hint: "Elige hasta 2 cartas para reemplazar.",
    confirm_faction: "Cambiar de facción vaciará el mazo actual. ¿Continuar? ",
    confirm_faction_account: "¿Pasar al mazo que ya tienes de esta facción?",
    session_bad: "Ese código de sesión no existe.",
    session_mix: "En línea, una cuenta solo juega contra otra cuenta. Sin cuenta, solo contra alguien sin cuenta.",
    op_wait: "El otro jugador se fue. Quedan {n} segundos para volver.",
    rules_host: "Valen los límites del anfitrión.",
    notice_ok: "Vale",
    need_units: "El mazo debe tener al menos 22 cartas de unidad. \n",
    need_special_max: "El mazo no puede tener más de 10 cartas especiales. \n",
    deck_bad_format: "El mazo cargado no tiene el formato correcto.",
    deck_unparsable: "No se pudo leer el mazo.",
    not_a_leader: "'{name}' no puede usarse como líder\n",
    leader_faction_mismatch:
      "El líder '{name}' no coincide con la facción '{faction}'.\n",
    card_wrong_faction:
      "'{name}' no puede usarse en un mazo de la facción '{faction}'\n",
    too_many_copies: "El mazo tiene {have}/{max} cartas disponibles de {name}\n",
    import_continue: "\n\n¿Continuar importando el mazo?",
    go_first: "Empiezo yo",
    let_opponent: "Que empiece el rival",
    go_first_title: "¿Quieres empezar?",
    scoiatael_perk:
      "La ventaja de los Scoia'tael te permite decidir quién empieza.",
    yes: "Sí",
    no: "No",
    you: "Tú",
    leader_ability: "Habilidad de líder",
    rules_btn: "Reglas",
    rules_title: "Cómo se juega",
    rules_close: "Cerrar",
    aid_btn: "Chuleta",
    chat_title: "Chat",
    chat_send: "Enviar",
    chat_placeholder: "Mensaje",
    chat_emoji: "☺",
    aid_title: "Chuleta",
  },
};

var AB_ES = {
  clear: {
    name: "Clima despejado",
    description:
      "Elimina los efectos de todas las cartas de clima (Escarcha mordiente, Niebla impenetrable y Lluvia torrencial). ",
  },
  frost: {
    name: "Escarcha mordiente",
    description:
      "Reduce a 1 la fuerza de todas las cartas de combate cuerpo a cuerpo de ambos jugadores. ",
  },
  fog: {
    name: "Niebla impenetrable",
    description:
      "Reduce a 1 la fuerza de todas las cartas de combate a distancia de ambos jugadores. ",
  },
  rain: {
    name: "Lluvia torrencial",
    description:
      "Reduce a 1 la fuerza de todas las cartas de asedio de ambos jugadores. ",
  },
  storm: {
    name: "Tormenta de Skellige",
    description:
      "Reduce a 1 la fuerza de todas las unidades a distancia y de asedio. ",
  },
  hero: {
    name: "Héroe",
    description: "No se ve afectada por ninguna carta especial ni habilidad. ",
  },
  decoy: {
    name: "Señuelo",
    description:
      "Intercámbiala con una carta del campo de batalla para devolverla a tu mano. ",
  },
  horn: {
    name: "Cuerno del comandante",
    description:
      "Duplica la fuerza de todas las cartas de unidad de esa fila. Máximo 1 por fila. ",
  },
  mardroeme: {
    name: "Mardroeme",
    description: "Transforma todas las cartas de berserker de la misma fila. ",
  },
  berserker: {
    name: "Berserker",
    description:
      "Se transforma en un oso cuando hay una carta de Mardroeme en su fila. ",
  },
  scorch: {
    name: "Abrasamiento",
    description:
      "Se descarta al jugarla. Destruye la carta o cartas más fuertes del campo de batalla. ",
  },
  scorch_c: {
    name: "Abrasamiento: cuerpo a cuerpo",
    description:
      "Destruye la unidad o unidades de combate cuerpo a cuerpo más fuertes del enemigo si la fuerza combinada de todas sus unidades de combate cuerpo a cuerpo es 10 o más. ",
  },
  scorch_r: {
    name: "Abrasamiento: a distancia",
    description:
      "Destruye la unidad o unidades de combate a distancia más fuertes del enemigo si la fuerza combinada de todas sus unidades de combate a distancia es 10 o más. ",
  },
  scorch_s: {
    name: "Abrasamiento: asedio",
    description:
      "Destruye la unidad o unidades de asedio más fuertes del enemigo si la fuerza combinada de todas sus unidades de asedio es 10 o más. ",
  },
  agile: {
    name: "Ágil",
    description:
      "Puede colocarse en la fila de combate cuerpo a cuerpo o en la de combate a distancia. No se puede mover una vez colocada. ",
  },
  muster: {
    name: "Reclutamiento",
    description:
      "Busca en tu mazo las cartas con el mismo nombre y juégalas al instante. ",
  },
  spy: {
    name: "Espía",
    description:
      "Colócala en el campo del rival (cuenta para su total) y roba 2 cartas de tu mazo. ",
  },
  medic: {
    name: "Médico",
    description:
      "Elige una carta de tu pila de descarte y juégala al instante (no héroes ni cartas especiales). ",
  },
  morale: {
    name: "Moral",
    description: "Añade +1 a todas las unidades de la fila (excepto a sí misma). ",
  },
  bond: {
    name: "Vínculo firme",
    description:
      "Colócala junto a una carta con el mismo nombre para duplicar la fuerza de ambas. ",
  },
  avenger: {
    name: "Vengador",
    description:
      "Cuando esta carta se retira del campo de batalla, invoca una nueva carta de unidad poderosa en su lugar. ",
  },
  avenger_kambi: {
    name: "Vengador",
    description:
      "Cuando esta carta se retira del campo de batalla, invoca una nueva carta de unidad poderosa en su lugar. ",
  },
  foltest_king: {
    description:
      "Elige una carta de Niebla impenetrable de tu mazo y juégala al instante.",
  },
  foltest_lord: {
    description:
      "Elimina los efectos de clima en juego (Escarcha mordiente, Lluvia torrencial o Niebla impenetrable).",
  },
  foltest_siegemaster: {
    description:
      "Duplica la fuerza de todas tus unidades de asedio (salvo que también haya un Cuerno del comandante en esa fila).",
  },
  foltest_steelforged: {
    description:
      "Destruye la unidad o unidades de asedio más fuertes del enemigo si la fuerza combinada de todas sus unidades de asedio es 10 o más.",
  },
  foltest_son: {
    description:
      "Destruye la unidad o unidades de combate a distancia más fuertes del enemigo si la fuerza combinada de todas sus unidades de combate a distancia es 10 o más.",
  },
  emhyr_imperial: {
    description: "Elige una carta de Lluvia torrencial de tu mazo y juégala al instante.",
  },
  emhyr_emperor: {
    description: "Mira 3 cartas al azar de la mano de tu rival.",
  },
  emhyr_whiteflame: {
    description: "Anula la habilidad de líder de tu rival.",
  },
  emhyr_relentless: {
    description: "Roba una carta de la pila de descarte de tu rival.",
  },
  emhyr_invader: {
    description:
      "Los médicos no pueden elegir qué carta revivir y roban una al azar del cementerio (afecta a ambos jugadores).",
  },
  eredin_commander: {
    description:
      "Duplica la fuerza de todas tus unidades de combate cuerpo a cuerpo (salvo que también haya un Cuerno del comandante en esa fila).",
  },
  eredin_bringer_of_death: {
    name: "Eredin: Portador de la muerte",
    description: "Devuelve una carta de tu pila de descarte a tu mano.",
  },
  eredin_destroyer: {
    description: "Descarta 2 cartas y roba 1 carta de tu elección de tu mazo.",
  },
  eredin_king: {
    description: "Elige cualquier carta de clima de tu mazo y juégala al instante.",
  },
  eredin_treacherous: {
    description: "Duplica la fuerza de todas las cartas de espía (afecta a ambos jugadores).",
  },
  francesca_queen: {
    description:
      "Destruye la unidad o unidades de combate cuerpo a cuerpo más fuertes del enemigo si la fuerza combinada de todas sus unidades de combate cuerpo a cuerpo es 10 o más.",
  },
  francesca_beautiful: {
    description:
      "Duplica la fuerza de todas tus unidades de combate a distancia (salvo que también haya un Cuerno del comandante en esa fila).",
  },
  francesca_daisy: {
    description: "Roba una carta extra al comienzo de la batalla.",
  },
  francesca_pureblood: {
    description: "Elige una carta de Escarcha mordiente de tu mazo y juégala al instante.",
  },
  francesca_hope: {
    description:
      "Mueve las unidades ágiles a la fila válida que maximice su fuerza (no mueve las que ya están en la fila óptima).",
  },
  crach_an_craite: {
    description:
      "Baraja todas las cartas del cementerio de cada jugador de vuelta en sus mazos.",
  },
  king_bran: {
    description: "Las unidades solo pierden la mitad de su fuerza con mal tiempo.",
  },
};

var FACTION_ES = {
  realms: {
    name: "Reinos del Norte",
    description: "Roba una carta de tu mazo cada vez que ganas una ronda.",
  },
  nilfgaard: {
    name: "Imperio de Nilfgaard",
    description: "Gana cualquier ronda que termine en empate.",
  },
  monsters: {
    name: "Monstruos",
    description: "Conserva una carta de unidad al azar en el campo después de cada ronda.",
  },
  scoiatael: {
    name: "Scoia'tael",
    description: "Decide quién juega primero.",
  },
  skellige: {
    name: "Skellige",
    description:
      "Al comienzo de la tercera ronda, 2 cartas al azar del cementerio se colocan en el campo de batalla.",
  },
};

function t(key) {
  var pack = TEXTS[LANG] || TEXTS.en;
  if (pack[key] !== undefined) return pack[key];
  if (TEXTS.en[key] !== undefined) return TEXTS.en[key];
  return key;
}

function tf(key, vars) {
  var text = t(key);
  if (!vars) return text;
  Object.keys(vars).forEach(function (name) {
    text = text.split("{" + name + "}").join(vars[name]);
  });
  return text;
}

function abField(key, field) {
  var ability = ability_dict[key];
  if (!ability) return "";
  if (LANG === "es" && AB_ES[key] && AB_ES[key][field]) return AB_ES[key][field];
  return ability[field] || "";
}

function factionField(key, field) {
  var faction = factions[key];
  if (!faction) return "";
  if (LANG === "es" && FACTION_ES[key] && FACTION_ES[key][field])
    return FACTION_ES[key][field];
  return faction[field] || "";
}

var CARD_ES = {
  "Mysterious Elf": "Elfo misterioso",
  Decoy: "Señuelo",
  "Biting Frost": "Escarcha mordiente",
  "Clear Weather": "Clima despejado",
  "Commander's Horn": "Cuerno del comandante",
  "Geralt of Rivia": "Geralt de Rivia",
  "Impenetrable Fog": "Niebla impenetrable",
  Scorch: "Abrasamiento",
  "Torrential Rain": "Lluvia torrencial",
  "Yennefer of Vengerberg": "Yennefer de Vengerberg",
  "Gaunter O'Dimm - Darkness": "Gaunter O'Dimm: Oscuridad",
  Cow: "Vaca",
  "Bovine Defense Force": "Fuerza de defensa bovina",
  "Foltest - King of Temeria": "Foltest, rey de Temeria",
  "Foltest - Lord Commander of the North": "Foltest, señor comandante del Norte",
  "Foltest - The Siegemaster": "Foltest, el maestro de asedio",
  "Foltest - The Steel-Forged": "Foltest, el forjado en acero",
  "Foltest - Son of Medell": "Foltest, hijo de Medell",
  Ballista: "Balista",
  "Blue Stripes Commando": "Comando de Franjas Azules",
  Catapult: "Catapulta",
  "Crinfrid Reavers Dragon Hunter": "Cazadragones de Crinfrid",
  "Dun Banner Medic": "Médico del Estandarte de Dun",
  "Kaedweni Siege Expert": "Experto en asedio de Kaedwen",
  "Poor Fucking Infantry": "Maldita infantería",
  "Redanian Foot Soldier": "Soldado de Redania",
  "Siege Tower": "Torre de asedio",
  "Siegfried of Denesle": "Siegfried de Denesle",
  Trebuchet: "Trabuquete",
  "Emhyr var Emreis - His Imperial Majesty": "Emhyr var Emreis, Su Majestad Imperial",
  "Emhyr var Emreis - Emperor of Nilfgaard": "Emhyr var Emreis, emperador de Nilfgaard",
  "Emhyr var Emreis - the White Flame": "Emhyr var Emreis, la Llama Blanca",
  "Emhyr var Emreis - The Relentless": "Emhyr var Emreis, el Implacable",
  "Emhyr var Emreis - Invader of the North": "Emhyr var Emreis, invasor del Norte",
  "Black Infantry Archer": "Arquero de infantería negra",
  "Etolian Auxiliary Archers": "Arqueros auxiliares etolios",
  "Heavy Zerrikanian Fire Scorpion": "Escorpión de fuego zerrikano pesado",
  "Impera Brigade Guard": "Guardia de la brigada Impera",
  "Letho of Gulet": "Letho de Gulet",
  "Nausicaa Cavalry Rider": "Jinete de la caballería Nausicaa",
  "Rotten Mangonel": "Manganel podrido",
  "Siege Engineer": "Ingeniero de asedio",
  "Siege Technician": "Técnico de asedio",
  "Young Emissary": "Joven emisario",
  "Zerrikanian Fire Scorpion": "Escorpión de fuego zerrikano",
  "Eredin - Commander of the Red Riders": "Eredin, comandante de los Jinetes Rojos",
  "Eredin - Bringer of Death": "Eredin, portador de la muerte",
  "Eredin - Destroyer of Worlds": "Eredin, destructor de mundos",
  "Eredin - King of the Wild Hunt": "Eredin, rey de la Cacería Salvaje",
  "Eredin Bréacc Glas - The Treacherous": "Eredin Bréacc Glas, el Traicionero",
  "Arachas- Behemoth": "Arachas behemot",
  Botchling: "Nonato",
  "Celaeno Harpy": "Arpía de Celeno",
  Cockatrice: "Cocatriz",
  "Crone - Brewess": "Bruja: Brewess",
  "Crone - Weavess": "Bruja: Weavess",
  "Crone - Whispess": "Bruja: Whispess",
  "Earth Elemental": "Elemental de tierra",
  "Fire Elemental": "Elemental de fuego",
  Fiend: "Maligno",
  Foglet: "Nieblino",
  Forktail: "Cola horquillada",
  Frightener: "Amedrentador",
  Gargoyle: "Gárgola",
  Ghoul: "Necrófago",
  "Grave Hag": "Bruja de tumba",
  Griffin: "Grifo",
  Harpy: "Arpía",
  "Ice Giant": "Gigante de hielo",
  "Plague Maiden": "Doncella de la plaga",
  "Vampire - Bruxa": "Vampiro: bruja",
  "Vampire - Ekimmara": "Vampiro: ekimmara",
  "Vampire - Fleder": "Vampiro: fleder",
  "Vampire - Garkain": "Vampiro: garkain",
  "Vampire - Katakan": "Vampiro: katakan",
  Werewolf: "Hombre lobo",
  Wyvern: "Güiverno",
  Toad: "Sapo",
  "Francesca Findabair - Queen of Dol Blathanna": "Francesca Findabair, reina de Dol Blathanna",
  "Francesca Findabair - the Beautiful": "Francesca Findabair, la Bella",
  "Francesca Findabair - Daisy of the Valley": "Francesca Findabair, margarita del valle",
  "Francesca Findabair - Pureblood Elf": "Francesca Findabair, elfa de pura sangre",
  "Francesca Findabair - Hope of the Aen Seidhe": "Francesca Findabair, esperanza de los Aen Seidhe",
  "Dol Blathanna Archer": "Arquero de Dol Blathanna",
  "Dol Blathanna Scout": "Explorador de Dol Blathanna",
  "Dwarven Skirmisher": "Escaramuzador enano",
  "Elven Skirmisher": "Escaramuzador elfo",
  "Havekar Healer": "Sanador havekar",
  "Havekar Smuggler": "Contrabandista havekar",
  "Mahakaman Defender": "Defensor de Mahakam",
  "Vrihedd Brigade Recruit": "Recluta de la brigada Vrihedd",
  "Vrihedd Brigade Veteran": "Veterano de la brigada Vrihedd",
  "Clan Brokva Archer": "Arquero del clan Brokvar",
  "Clan Dimun Pirate": "Pirata del clan Dimun",
  "Cerys - Clan Drummond Shield Maiden": "Doncella escudera del clan Drummond",
  "Clan Heymaey Skald": "Escaldo del clan Heymaey",
  "Clan Tordarroch Armorsmith": "Armero del clan Tordarroch",
  "Clan an Craite Warrior": "Guerrero del clan an Craite",
  "Light Longship": "Drakkar ligero",
  "Madman Lugos": "Lugos el Loco",
  "Skellige Storm": "Tormenta de Skellige",
  "Transformed Vildkaarl": "Vildkaarl transformado",
  "Transformed Young Vildkaarl": "Joven vildkaarl transformado",
  "War Longship": "Drakkar de guerra",
  "Young Berserker": "Berserker joven",
  "King Bran": "Rey Bran",
  "Cirilla Fiona Elen Riannon": "Cirilla",
  Dandelion: "Jaskier",
  "Emiel Regis Rohellec Terzieff": "Emiel Regis Rohellec Terzieff",
  "Triss Merigold": "Triss Merigold",
  Vesemir: "Vesemir",
  Villentretenmerth: "Villentretenmerth",
  "Zoltan Chivay": "Zoltan Chivay",
  "Olgierd von Everec": "Olgierd von Everec",
  "Gaunter O'Dimm": "Gaunter O'Dim",
  Dethmold: "Dethmold",
  "Esterad Thyssen": "Esterad Thyssen",
  "John Natalis": "John Natalis",
  "Keira Metz": "Keira Metz",
  "Philippa Eilhart": "Philippa Eilhart",
  "Prince Stennis": "Príncipe Stennis",
  "Sheldon Skaggs": "Sheldon Skaggs",
  "Sigismund Dijkstra": "Sigismund Dijkstra",
  "Síle de Tansarville": "Sheala de Tancarville",
  Thaler: "Thaler",
  "Sabrina Glevissig": "Sabrina Glevissig",
  "Vernon Roche": "Vernon Roche",
  Ves: "Ves",
  "Yarpen Zigrin": "Yarpen Zigrin",
  Albrich: "Albrich",
  "Assire var Anahid": "Assire var Anahid",
  "Cahir Mawr Dyffryn aep Ceallach": "Cahir Mawr Dyffryn aep Ceallach",
  Cynthia: "Cynthia",
  "Fringilla Vigo": "Fringilla Vigo",
  "Menno Coehoorn": "Menno Coehoorn",
  Morteisen: "Morteisen",
  "Morvran Voorhis": "Morvran Voorhis",
  Puttkammer: "Puttkammer",
  Rainfarn: "Rainfarn",
  "Renuald aep Matsen": "Renuald aep Matsen",
  "Shilard Fitz-Oesterlen": "Shilard Fitz-Oesterlen",
  "Stefan Skellen": "Stefan Skellen",
  Sweers: "Sweers",
  "Tibor Eggebracht": "Tibor Eggebracht",
  Vanhemar: "Vanhemar",
  "Vattier de Rideaux": "Vattier de Rideaux",
  Vreemde: "Vreemde",
  Arachas: "Arachas",
  Draug: "Draug",
  Endrega: "Endriago",
  Imlerith: "Imlerith",
  Kayran: "Kayran",
  Leshen: "Leshen",
  Nekker: "Nekker",
  "Ciaran aep Easnillien": "Ciaran aep Easnillien",
  "Barclay Els": "Barclay Els",
  "Dennis Cranmer": "Dennis Cranmer",
  "Eithné": "Eithné",
  "Filavandrel aen Fidhail": "Filavandrel aén Fidháil",
  "Ida Emean aep Sivney": "Ida Emean aep Sivney",
  Iorveth: "Iorveth",
  "Isengrim Faoiltiarna": "Isengrim Faoiltiarna",
  Milva: "Milva",
  Riordain: "Riordain",
  Saesenthessis: "Saesenthessis",
  Toruviel: "Toruviel",
  Yaevinn: "Yaevinn",
  Schirru: "Schirrú",
  Berserker: "Berserker",
  "Birna Bran": "Birna Bran",
  "Blueboy Lugos": "Lugos el Amoratado",
  Cerys: "Cerys",
  "Donar an Hindar": "Donar an Hindar",
  "Draig Bon-Dhu": "Draig bon Dhu",
  Ermion: "Armiño",
  Hemdall: "Hemdall",
  Hjalmar: "Hjalmar",
  "Holger Blackhand": "Holger Manonegra",
  Kambi: "Kambi",
  Mardroeme: "Mardroeme",
  Olaf: "Olaf",
  Svanrige: "Svanrige",
  Udalryk: "Udalryk",
  "Crach an Craite": "Crach an Craite",
};

var FLAVOR_ES = {
  "Redanian Foot Soldier": "¡He sangrado por Redania! ¡He matado por Redania... ¡Maldita sea, hasta he violado por Redania!",
  Ballista: "«Casi siempre les ponemos nombre de mujer.» «¿Como Jenny?» «Más bien como Bertha.»",
  Trebuchet: "«El castillo no se derriba solo, ¿verdad? ¡A mover esos trabuquetes!»",
  "Siege Tower": "Me encanta el estruendo de las torres de asedio por la mañana. Suena a victoria.",
  "Keira Metz": "Si hoy he de morir, quiero estar despampanante para la ocasión.",
  "Sabrina Glevissig": "La Hija de las Tierras Salvajes de Kaedwen.",
  "Sheldon Skaggs": "¡Yo estuve allí, en primera línea! ¡Justo donde más se luchaba!",
  Ves: "Más vale vivir un día como un rey que toda una vida como un mendigo.",
  "Yarpen Zigrin": "El mundo es de quien mejor parte cráneos y preña mozas.",
  "Síle de Tansarville": "A la Logia le falta humildad. Nuestra sed de poder aún puede ser nuestra ruina.",
  Dethmold: "Una vez hice que un prisionero vomitara sus propias entrañas... Ah, qué tiempos.",
  "Siegfried of Denesle": "Estamos en el mismo bando, brujo. Algún día te darás cuenta.",
  "Emiel Regis Rohellec Terzieff": "Los hombres, al menos los educados, me llamarían monstruo. Un bicho que bebe sangre.",
  Vesemir: "Si te van a ahorcar, pide agua. Puede pasar cualquier cosa antes de que la traigan.",
  "Zoltan Chivay": "La vida sin viejos camaradas y sin trago es como una mujer sin trasero.",
  "Bovine Defense Force": "¡Grrrrr!",
  Albrich: "¿Una bola de fuego? Por supuesto. Lo que desee Su Majestad Imperial.",
  "Assire var Anahid": "Los magos nilfgaardianos sí tienen elección: sumisión servil, o la horca.",
  "Black Infantry Archer": "Apunto a la rodilla. Siempre.",
  "Cahir Mawr Dyffryn aep Ceallach": "Los ojos le brillaron bajo el yelmo alado. El fuego relució en la hoja de su espada.",
  Cynthia: "El talento de Cynthia puede ser mortal. Hay que llevarla con correa corta.",
  "Fringilla Vigo": "La magia es el bien supremo. Trasciende todas las fronteras y divisiones.",
  "Heavy Zerrikanian Fire Scorpion": "No es lo mejor para tomar ciudades, pero arrasarlas se le da de maravilla.",
  Morteisen: "Ningún piquero nordling ni lancero enano puede aspirar a vencer a una caballería entrenada.",
  Puttkammer: "Aprendí mucho en la Academia Militar de Braibant. A pelar patatas, por ejemplo.",
  Rainfarn: "Morirás tan dolorosamente como aquel patético traidor de Windhalm.",
  "Renuald aep Matsen": "Dicen que la Impera no teme a nada. Falso. Renuald les mete un miedo de muerte.",
  "Rotten Mangonel": "El olor a podrido me trae recuerdos de la infancia.",
  "Siege Engineer": "Bien manejado, un protractor puede ser un arma mortal.",
  Sweers: "¡Y las manos quietas con la chica! Seamos lo que seamos, no somos salvajes.",
  Vanhemar: "Para ser un mago del fuego, no es muy... extravagante.",
  Vreemde: "La disciplina es el arma más mortífera del Imperio.",
  "Zerrikanian Fire Scorpion": "El desierto de Zerrikania fue un jardín exuberante. Hasta que llegaron estos.",
  Botchling: "Reconoce tus errores y entiérralos como es debido, o volverán para atormentarte.",
  "Celaeno Harpy": "Las arpías comunes se alimentan de carroña. Las arpías celaeno... se alimentan de sueños.",
  Cockatrice: "Nacido de un huevo puesto por un gallo... si te crees esas bobadas de campesino.",
  "Earth Elemental": "¿Cómo se lucha contra un elemental de tierra? No se lucha. Se corre. Tan rápido como se pueda.",
  Endrega: "¡El nido! Acabad con el nido, o esos bastardos no pararán de salir.",
  Fiend: "Un demonio se parece un poco a un ciervo. Un ciervo enorme y malvado.",
  "Fire Elemental": "El fuego es tan delicioso.",
  Foglet: "La niebla llega con pasitos de gato. Los espectros de la niebla llegan sobre los cuerpos de sus víctimas.",
  Forktail: "Colas de tenedor... ¡Bah! Las colas de esos cabrones parecen más cuchillas.",
  Frightener: "«¿Qué he hecho?», gritó el mago, aterrado de su propia creación.",
  Gargoyle: "Pesadillas de antiguos escultores, a las que unos magos aburridos dieron vida.",
  "Grave Hag": "Esas lenguas largas sirven para sorber el tuétano y para azotar a la presa.",
  Griffin: "A los grifos les gusta jugar con la presa. Se la comen viva, a trozos.",
  Harpy: "Hay muchas especies de arpía, y todas son cleptómanas.",
  "Ice Giant": "Huí una sola vez en mi vida. Del gigante de hielo. Y no me avergüenzo ni un poco.",
  "Plague Maiden": "Los enfermos deliran sobre una mujer cubierta de pústulas, rodeada de manadas de ratas rabiosas...",
  Werewolf: "Los lobos no son tan malos como dicen. Los hombres lobo, en cambio, son peores.",
  Wyvern: "Imagina un cruce entre una serpiente alada y una pesadilla. Los guivernos son peores.",
  "Ciaran aep Easnillien": "El camino a la libertad está pavimentado de sangre, no de tinta.",
  "Barclay Els": "¿Que nuestro hidromiel huele a meados? Fácil de arreglar: te rompo esa puta nariz.",
  "Dennis Cranmer": "Sé cumplir órdenes, así que métete tus consejos por el conducto del carbón.",
  "Dol Blathanna Archer": "Da un paso más, dh'oine. Te quedaría mejor una flecha entre los ojos.",
  "Dol Blathanna Scout": "Rastrean como sabuesos, corren como ciervos y matan como bastardos sin corazón.",
  "Filavandrel aen Fidhail": "Aunque ahora seamos pocos y estemos dispersos, nuestro corazón arde más que nunca.",
  "Ida Emean aep Sivney": "Soy una Sabia. Mi poder está en poseer el conocimiento. No en compartirlo.",
  "Mahakaman Defender": "Os lo digo yo: nacimos para la batalla, y les damos directo a las rodillas.",
  Riordain: "Míralos a los ojos, disfruta de su terror. Luego remata.",
  Toruviel: "Con gusto te mataría de cerca, mirándote a los ojos... Pero apestas, humano.",
  "Vrihedd Brigade Recruit": "El odio arde más que cualquier fuego y corta más hondo que cualquier hoja.",
  "Vrihedd Brigade Veteran": "«¿Vrihedd? ¿Qué significa?» «Problemas.»",
  Yaevinn: "Somos las gotas de lluvia que juntas forman una tormenta feroz.",
  "Blueboy Lugos": "Estoy a punto de vomitar de aburrimiento.",
  "Clan Brokva Archer": "Así que aciertas a un blanco en movimiento a doscientos pasos. Yo también. En plena tormenta.",
  "Clan Heymaey Skald": "Las hazañas del clan Heymaey pasarán a la historia.",
  "Clan Tordarroch Armorsmith": "Os espera una paliza.",
  "Donar an Hindar": "He reunido a todos los jarls. Ahora expón tu caso.",
  "Holger Blackhand": "Brindemos por el emperador de Nilfgaard: ¡que se le quede floja para siempre!",
  "Madman Lugos": "¡WAAAAAAAAAAAAAGH!",
  Svanrige: "El emperador también lo tomó por un rey accidental. Al principio.",
  Udalryk: "¡Haaaargh! ¡Conmigo, si tenéis pelotas!",
};

function cardFlavor(name) {
  if (LANG !== "es" || name == null) return "";
  var key = String(name).replace(/\s+/g, " ").trim();
  return FLAVOR_ES[key] || "";
}

function cardLabel(name) {
  if (name == null) return "";
  var key = String(name).replace(/\s+/g, " ").trim();
  if (LANG === "es" && CARD_ES[key]) return CARD_ES[key];
  return key;
}

function cardFaceFromData(data) {
  if (!data) return { name: "", desc: "" };
  if (data.desc !== undefined && data.abilities) {
    var live = String(data.desc || "").trim();
    return { name: cardLabel(data.name), desc: live || cardFlavor(data.name) };
  }
  var abilities = data.ability ? data.ability.split(" ").filter(Boolean) : [];
  var hero = abilities[0] === "hero";
  if (hero) abilities = abilities.slice(1);
  var row = data.deck === "weather" ? data.deck : data.row;
  var desc = row === "agile" ? abField("agile", "description") : "";
  for (var i = abilities.length - 1; i >= 0; i--) desc += abField(abilities[i], "description");
  if (hero) desc += abField("hero", "description");
  desc = desc.trim();
  if (!desc) desc = cardFlavor(data.name);
  return { name: cardLabel(data.name), desc: desc };
}

function paintLargeCard(elem, source) {
  if (!elem) return;
  elem._cardFace = source || null;
  var plate = elem.querySelector(":scope > .card-es");
  if (LANG !== "es" || !source || source.faction === "faction") {
    if (plate) plate.remove();
    return;
  }
  var face = cardFaceFromData(source);
  if (!plate || plate.children.length < 2) {
    if (plate) plate.remove();
    plate = document.createElement("div");
    plate.className = "card-es";
    plate.innerHTML = '<div class="card-es-name"></div><div class="card-es-desc"></div>';
    elem.appendChild(plate);
  }
  plate.children[0].textContent = face.name;
  plate.children[1].textContent = face.desc;
}

function repaintLargeCards() {
  document.querySelectorAll(".card-lg, .pack-card, #card-leader > div").forEach(function (elem) {
    if (elem._cardFace) paintLargeCard(elem, elem._cardFace);
  });
}

function displayName(name) {
  if (name === "you") return t("you");
  if (name === "Oponent" || name === "Opponent") return t("opponent");
  return name;
}

var RULES = {
  en: [
    {
      h: "The match",
      items: [
        "Each player has 2 gems. Losing a round removes one. Lose both and you lose the battle.",
        "If both players lose their last gem on the same round, the battle is a draw. Replay with the same decks, or go back and change them.",
        "Each player draws 10 cards, then may redraw up to 2.",
        "The first player is chosen at random. The other player starts round 2, and the first player starts round 3.",
        "On your turn, play one card or pass. Hold Space to pass. The round ends when both players have passed.",
        "If you have no cards left, you pass automatically.",
        "The higher total strength wins the round.",
      ],
    },
    {
      h: "The deck",
      items: [
        "One leader. The leader ability is used once from the leader slot.",
        "At least 22 unit cards.",
        "At most 10 special cards. Weather cards count toward that limit.",
        "Heroes are unit cards and count toward the 22.",
      ],
    },
    {
      h: "Rows and strength",
      items: [
        "Cards play on their row: close combat, ranged, or siege.",
        "Agile cards can go to close combat or ranged, and they stay there.",
        "A hero keeps its printed strength. Weather and row effects do not change it, and Scorch cannot destroy it.",
        "Weather sets every other card on that row to 1. Tight Bond, Morale, and Commander's Horn are applied after that, so a weathered card can rise above 1.",
      ],
    },
    {
      h: "Special cards",
      items: [
        "Biting Frost sets close combat to 1. Impenetrable Fog sets ranged to 1. Torrential Rain sets siege to 1.",
        "Skellige Storm sets ranged and siege to 1.",
        "Clear Weather removes every weather effect.",
        "Commander's Horn doubles the row. A second horn on the same row does not double it again.",
        "Scorch destroys the strongest non-hero unit on the battlefield. Every unit tied for that strength is destroyed.",
        "Decoy swaps with one of your units and returns that unit to your hand.",
        "Mardroeme transforms every Berserker on its row.",
      ],
    },
    {
      h: "Unit abilities",
      items: [
        "Spy: the card is placed on your opponent's side and you draw 2 cards.",
        "Medic: play one non-hero unit from your discard pile.",
        "Muster: every card of the same name in your deck or your hand is played at once.",
        "Morale: other units on the row gain +1. Several Morale cards stack.",
        "Tight Bond: cards that share a name on the same row have their strength multiplied by how many of them are there.",
        "Some units scorch only one enemy row, and only if that row's total is 10 or more.",
        "Avenger: when the card leaves the battlefield, it summons a new unit in its place.",
      ],
    },
    {
      h: "Factions",
      items: [
        "Northern Realms: if you won the previous round, you draw a card when the next round starts.",
        "Nilfgaard: you win a round that ends in a tie.",
        "Monsters: one random unit stays on your side after each round.",
        "Scoia'tael: you choose who plays first. If both players are Scoia'tael, the first player is chosen at random.",
        "Skellige: at the start of round 3, two random units return from your graveyard.",
      ],
    },
  ],
  es: [
    {
      h: "La partida",
      items: [
        "Cada jugador tiene 2 gemas. Perder una ronda quita una. Quien pierde las dos pierde la batalla.",
        "Si ambos pierden la última gema en la misma ronda, la batalla queda en empate. Se puede repetir con los mismos mazos o volver a cambiarlos.",
        "Cada jugador roba 10 cartas y después puede cambiar hasta 2.",
        "El primer jugador se elige al azar. El otro empieza la ronda 2, y el primero empieza la ronda 3.",
        "En tu turno juegas una carta o pasas. Mantén Espacio para pasar. La ronda termina cuando los dos han pasado.",
        "Si no te quedan cartas, pasas automáticamente.",
        "Gana la ronda quien tenga más fuerza.",
      ],
    },
    {
      h: "El mazo",
      items: [
        "Un líder. Su habilidad se usa una vez desde el hueco de líder.",
        "Al menos 22 cartas de unidad.",
        "Como máximo 10 cartas especiales. Las de clima cuentan para ese límite.",
        "Los héroes son cartas de unidad y cuentan para las 22.",
      ],
    },
    {
      h: "Filas y fuerza",
      items: [
        "Cada carta se juega en su fila: cuerpo a cuerpo, a distancia o asedio.",
        "Una carta ágil puede ir a cuerpo a cuerpo o a distancia, y se queda ahí.",
        "Un héroe conserva la fuerza impresa. El clima y los efectos de fila no la cambian, y Abrasamiento no puede destruirlo.",
        "El clima deja en 1 al resto de cartas de esa fila. Vínculo firme, Moral y Cuerno del comandante se aplican después, así que una carta bajo clima puede subir de 1.",
      ],
    },
    {
      h: "Cartas especiales",
      items: [
        "Escarcha mordiente deja el cuerpo a cuerpo en 1. Niebla impenetrable deja a distancia en 1. Lluvia torrencial deja el asedio en 1.",
        "Tormenta de Skellige deja a distancia y asedio en 1.",
        "Clima despejado quita todos los efectos de clima.",
        "Cuerno del comandante duplica la fila. Un segundo cuerno en la misma fila no la duplica otra vez.",
        "Abrasamiento destruye la unidad no héroe más fuerte del campo. Si hay varias con esa fuerza, las destruye todas.",
        "Señuelo se intercambia con una de tus unidades y esa unidad vuelve a tu mano.",
        "Mardroeme transforma a todos los berserkers de su fila.",
      ],
    },
    {
      h: "Habilidades de unidad",
      items: [
        "Espía: la carta se coloca en el campo del rival y robas 2 cartas.",
        "Médico: juegas una unidad que no sea héroe de tu pila de descarte.",
        "Reclutamiento: se juegan al instante las cartas del mismo nombre que tengas en el mazo o en la mano.",
        "Moral: las demás unidades de la fila ganan +1. Varias cartas de Moral se acumulan.",
        "Vínculo firme: las cartas del mismo nombre en una fila multiplican su fuerza por cuántas hay.",
        "Algunas unidades queman solo una fila enemiga, y solo si el total de esa fila es 10 o más.",
        "Vengador: cuando la carta sale del campo, invoca otra unidad en su lugar.",
      ],
    },
    {
      h: "Facciones",
      items: [
        "Reinos del Norte: si ganaste la ronda anterior, robas una carta al empezar la siguiente.",
        "Nilfgaard: ganas la ronda que termina en empate.",
        "Monstruos: una unidad al azar se queda en tu campo después de cada ronda.",
        "Scoia'tael: eliges quién juega primero. Si los dos sois Scoia'tael, el primero se elige al azar.",
        "Skellige: al empezar la ronda 3, dos unidades al azar vuelven de tu cementerio.",
      ],
    },
  ],
};

function escHtml(text) {
  return String(text).replace(/[&<>]/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch];
  });
}

function renderRules() {
  var root = document.getElementById("rules-body");
  if (!root) return;
  var sections = RULES[LANG] || RULES.en;
  root.innerHTML = sections
    .map(function (section) {
      return (
        "<section><h3>" +
        escHtml(section.h) +
        "</h3><ul>" +
        section.items
          .map(function (item) {
            return "<li>" + escHtml(item) + "</li>";
          })
          .join("") +
        "</ul></section>"
      );
    })
    .join("");
}

var AID = {
  en: {
    factionsTitle: "Faction abilities",
    rowsTitle: "Rows",
    abilitiesTitle: "Abilities",
    factions: [
      ["img/icons/deck_shield_realms.png", "Northern Realms", "Draw a card whenever you win a round."],
      ["img/icons/deck_shield_nilfgaard.png", "Nilfgaard", "Win any round that ends in a draw."],
      ["img/icons/deck_shield_monsters.png", "Monsters", "One random unit stays after each round."],
      ["img/icons/deck_shield_scoiatael.png", "Scoia'tael", "Decide who goes first."],
      ["img/icons/deck_shield_skellige.png", "Skellige", "Round 3: two random units return from the graveyard."],
    ],
    rows: [
      ["img/icons/card_row_close.png", "Close combat", "Melee row."],
      ["img/icons/card_row_ranged.png", "Ranged", "Ranged row."],
      ["img/icons/card_row_siege.png", "Siege", "Siege row."],
      ["img/icons/card_row_agile.png", "Agile", "Close combat or ranged. It cannot move once placed."],
    ],
    abilities: [
      ["img/icons/power_hero.png", "Hero", "Not affected by any ability."],
      ["img/icons/card_ability_spy.png", "Spy", "Play on the opponent's side and draw 2 cards."],
      ["img/icons/card_ability_medic.png", "Medic", "Play one non-hero unit from your discard pile."],
      ["img/icons/card_ability_muster.png", "Muster", "Play every card of the same name from your deck."],
      ["img/icons/card_ability_morale.png", "Morale boost", "+1 to every other unit on the row."],
      ["img/icons/card_ability_bond.png", "Tight bond", "Strength is multiplied by the number of copies of that name on the row."],
      ["img/icons/card_ability_scorch.png", "Row scorch", "If the opposite row totals 10 or more, destroy its strongest non-hero units."],
      ["img/icons/card_ability_horn.png", "Commander's Horn", "Double the row. Only once per row."],
      ["img/icons/card_ability_decoy.png", "Decoy", "Swap with one of your units. The decoy stays, with strength 0."],
      ["img/icons/card_ability_frost.png", "Biting Frost", "Close combat units are set to 1."],
      ["img/icons/card_ability_fog.png", "Impenetrable Fog", "Ranged units are set to 1."],
      ["img/icons/card_ability_rain.png", "Torrential Rain", "Siege units are set to 1."],
      ["img/icons/card_ability_clear.png", "Clear Weather", "Remove every weather effect."],
      ["img/icons/card_ability_storm.png", "Skellige Storm", "Ranged and siege units are set to 1."],
      ["img/icons/card_ability_mardroeme.png", "Mardroeme", "Transform the Berserkers on this row."],
      ["img/icons/card_ability_berserker.png", "Berserker", "Transforms when a Mardroeme is on its row."],
      ["img/icons/card_ability_avenger.png", "Summon", "When it leaves the battlefield, a new unit takes its place."],
    ],
  },
  es: {
    factionsTitle: "Habilidad de facción",
    rowsTitle: "Filas",
    abilitiesTitle: "Habilidades",
    factions: [
      ["img/icons/deck_shield_realms.png", "Reinos del Norte", "Roba una carta cada vez que ganas una ronda."],
      ["img/icons/deck_shield_nilfgaard.png", "Nilfgaard", "Gana la ronda que termina en empate."],
      ["img/icons/deck_shield_monsters.png", "Monstruos", "Una unidad al azar se queda tras cada ronda."],
      ["img/icons/deck_shield_scoiatael.png", "Scoia'tael", "Decide quién empieza."],
      ["img/icons/deck_shield_skellige.png", "Skellige", "Ronda 3: vuelven 2 unidades al azar del cementerio."],
    ],
    rows: [
      ["img/icons/card_row_close.png", "Cuerpo a cuerpo", "Fila de combate cercano."],
      ["img/icons/card_row_ranged.png", "A distancia", "Fila de distancia."],
      ["img/icons/card_row_siege.png", "Asedio", "Fila de asedio."],
      ["img/icons/card_row_agile.png", "Ágil", "Cuerpo a cuerpo o a distancia. No se mueve una vez colocada."],
    ],
    abilities: [
      ["img/icons/power_hero.png", "Héroe", "No le afecta ninguna habilidad."],
      ["img/icons/card_ability_spy.png", "Espía", "Se juega en el campo rival y robas 2 cartas."],
      ["img/icons/card_ability_medic.png", "Médico", "Juega una unidad del descarte que no sea héroe."],
      ["img/icons/card_ability_muster.png", "Reclutamiento", "Juega las cartas del mismo nombre que haya en el mazo."],
      ["img/icons/card_ability_morale.png", "Subida de moral", "+1 a las demás unidades de la fila."],
      ["img/icons/card_ability_bond.png", "Vínculo firme", "La fuerza se multiplica por las copias de ese nombre en la fila."],
      ["img/icons/card_ability_scorch.png", "Abrasamiento de fila", "Si la fila de enfrente suma 10 o más, destruye sus unidades más fuertes que no sean héroes."],
      ["img/icons/card_ability_horn.png", "Cuerno del comandante", "Duplica la fila. Solo una vez por fila."],
      ["img/icons/card_ability_decoy.png", "Señuelo", "Cámbialo por una unidad tuya. El señuelo se queda, con fuerza 0."],
      ["img/icons/card_ability_frost.png", "Escarcha mordiente", "Las unidades de cuerpo a cuerpo quedan en 1."],
      ["img/icons/card_ability_fog.png", "Niebla impenetrable", "Las unidades a distancia quedan en 1."],
      ["img/icons/card_ability_rain.png", "Lluvia torrencial", "Las unidades de asedio quedan en 1."],
      ["img/icons/card_ability_clear.png", "Clima despejado", "Quita todos los efectos de clima."],
      ["img/icons/card_ability_storm.png", "Tormenta de Skellige", "Las unidades a distancia y de asedio quedan en 1."],
      ["img/icons/card_ability_mardroeme.png", "Mardroeme", "Transforma a los berserkers de la fila."],
      ["img/icons/card_ability_berserker.png", "Berserker", "Se transforma si hay un Mardroeme en su fila."],
      ["img/icons/card_ability_avenger.png", "Invocación", "Al salir del campo, otra unidad ocupa su lugar."],
    ],
  },
};

function aidCells(rows) {
  return rows
    .map(function (row) {
      return (
        '<div class="aid-item"><img src="' +
        escHtml(row[0]) +
        '" alt=""><div><strong>' +
        escHtml(row[1]) +
        "</strong><span>" +
        escHtml(row[2]) +
        "</span></div></div>"
      );
    })
    .join("");
}

function renderAid() {
  var root = document.getElementById("aid-body");
  if (!root) return;
  var aid = AID[LANG] || AID.en;
  root.innerHTML =
    "<h3>" +
    escHtml(aid.factionsTitle) +
    '</h3><div class="aid-grid">' +
    aidCells(aid.factions) +
    "</div><h3>" +
    escHtml(aid.rowsTitle) +
    '</h3><div class="aid-grid">' +
    aidCells(aid.rows) +
    "</div><h3>" +
    escHtml(aid.abilitiesTitle) +
    '</h3><div class="aid-grid">' +
    aidCells(aid.abilities) +
    "</div>";
}

function openAid() {
  document.getElementById("aid-modal").classList.remove("hide");
}

function closeAid() {
  document.getElementById("aid-modal").classList.add("hide");
}

var noticeWait = null;

function gameNotice(message, confirm) {
  var box = document.getElementById("game-notice");
  var yes = document.getElementById("game-notice-yes");
  var no = document.getElementById("game-notice-no");
  if (noticeWait) noticeWait(false);
  document.getElementById("game-notice-text").textContent = message;
  yes.textContent = confirm ? t("yes") : t("notice_ok");
  no.textContent = t("no");
  no.classList.toggle("hide", !confirm);
  box.classList.remove("hide");
  yes.focus();
  return new Promise(function (resolve) {
    noticeWait = function (ok) {
      noticeWait = null;
      box.classList.add("hide");
      resolve(!!ok);
    };
  });
}

function gameAlert(message) {
  return gameNotice(message, false);
}

function gameConfirm(message) {
  return gameNotice(message, true);
}

function openRules() {
  document.getElementById("rules-modal").classList.remove("hide");
}

function closeRules() {
  document.getElementById("rules-modal").classList.add("hide");
}

function applyI18n() {
  document.documentElement.lang = LANG === "es" ? "es" : "en-US";
  document.body.classList.toggle("lang-es", LANG === "es");
  document.title = t("title");
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  var toggle = document.getElementById("lang-toggle");
  if (toggle) toggle.textContent = LANG === "es" ? "EN" : "ES";
  if (typeof paintFullscreen === "function") paintFullscreen();
  if (typeof createdSessionId !== "undefined" && createdSessionId) {
    var sessionBtn = document.querySelector("#session-id .copy-btn");
    if (sessionBtn) sessionBtn.textContent = t("session") + " " + createdSessionId;
  }
  if (typeof refreshLocalized === "function") refreshLocalized();
  if (typeof repaintLargeCards === "function") repaintLargeCards();
  renderRules();
  renderAid();
}

function setLang(lang) {
  LANG = lang === "es" ? "es" : "en";
  localStorage.setItem("gwent-lang", LANG);
  applyI18n();
}

function toggleLang() {
  setLang(LANG === "es" ? "en" : "es");
}

(function checkI18n() {
  var missing = [];
  Object.keys(TEXTS.en).forEach(function (key) {
    if (TEXTS.es[key] === undefined) missing.push(key);
  });
  ["factions", "rows", "abilities"].forEach(function (key) {
    if (AID.en[key].length !== AID.es[key].length) missing.push("aid:" + key);
  });
  if (RULES.en.length !== RULES.es.length) missing.push("rules-sections");
  RULES.en.forEach(function (section, i) {
    if (!RULES.es[i] || RULES.es[i].items.length !== section.items.length)
      missing.push("rules:" + i);
  });
  Object.keys(FACTION_ES).forEach(function (key) {
    if (!factions[key]) missing.push("faction:" + key);
  });
  Object.keys(ability_dict).forEach(function (key) {
    if (ability_dict[key].description && !(AB_ES[key] && AB_ES[key].description))
      missing.push("ability:" + key);
  });
  if (missing.length) console.error("i18n missing", missing);
})();

document.getElementById("lang-toggle").addEventListener("click", toggleLang);

function fullscreenOn() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function paintFullscreen() {
  var btn = document.getElementById("full-toggle");
  if (!btn) return;
  btn.classList.toggle("is-full", fullscreenOn());
  btn.setAttribute("aria-label", fullscreenOn() ? t("full_exit") : t("full_enter"));
  if (typeof placeAccount === "function") placeAccount();
}

function toggleFullscreen() {
  var root = document.documentElement;
  if (fullscreenOn()) {
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.webkitCancelFullScreen;
    if (exit) exit.call(document);
    return;
  }
  var ask = root.requestFullscreen || root.webkitRequestFullscreen || root.webkitRequestFullScreen;
  if (!ask) return;
  var pending = ask.call(root);
  if (pending && pending.catch) pending.catch(function () {});
}

document.getElementById("full-toggle").addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", paintFullscreen);
document.addEventListener("webkitfullscreenchange", paintFullscreen);
paintFullscreen();
document.getElementById("rules-open").addEventListener("click", openRules);
document.getElementById("rules-close").addEventListener("click", closeRules);
document.getElementById("rules-modal").addEventListener("click", function (event) {
  if (event.target.id === "rules-modal") closeRules();
});
document.getElementById("aid-open").addEventListener("click", openAid);
document.getElementById("aid-close").addEventListener("click", closeAid);
document.getElementById("aid-modal").addEventListener("click", function (event) {
  if (event.target.id === "aid-modal") closeAid();
});
document.getElementById("game-notice-yes").addEventListener("click", function () {
  if (noticeWait) noticeWait(true);
});
document.getElementById("game-notice-no").addEventListener("click", function () {
  if (noticeWait) noticeWait(false);
});
document.getElementById("game-notice").addEventListener("click", function (event) {
  if (event.target.id === "game-notice" && noticeWait) noticeWait(false);
});
document.addEventListener("keydown", function (event) {
  if (event.key !== "Escape") return;
  var pack = document.getElementById("pack-show");
  if (pack && !pack.classList.contains("hide")) {
    document.getElementById("pack-done").click();
    return;
  }
  if (noticeWait) {
    noticeWait(false);
    return;
  }
  if (!document.getElementById("rules-modal").classList.contains("hide")) closeRules();
  if (!document.getElementById("aid-modal").classList.contains("hide")) closeAid();
});
applyI18n();
