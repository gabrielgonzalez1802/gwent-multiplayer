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
    cpu_principiante: "Beginner",
    cpu_facil: "Easy",
    cpu_normal: "Normal",
    cpu_dificil: "Hard",
    cpu_experto: "Expert",
    cpu_demencia: "Madness",
    online_play: "Online",
    create_game: "Create Game",
    join_game: "Join Game",
    session_code: "Session code",
    join: "Join",
    ready: "Ready",
    cancel: "Cancel",
    session: "Session:",
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
    cpu_principiante: "Principiante",
    cpu_facil: "Fácil",
    cpu_normal: "Normal",
    cpu_dificil: "Difícil",
    cpu_experto: "Experto",
    cpu_demencia: "Demencia",
    online_play: "En línea",
    create_game: "Crear partida",
    join_game: "Unirse",
    session_code: "Código",
    join: "Entrar",
    ready: "Listo",
    cancel: "Cancelar",
    session: "Sesión:",
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
};

function cardLabel(name) {
  if (name == null) return "";
  if (LANG === "es" && CARD_ES[name]) return CARD_ES[name];
  return String(name).replace(/\s+/g, " ").trim();
}

function cardFaceFromData(data) {
  if (!data) return { name: "", desc: "" };
  if (data.desc !== undefined && data.abilities) {
    return { name: cardLabel(data.name), desc: String(data.desc || "").trim() };
  }
  var abilities = data.ability ? data.ability.split(" ").filter(Boolean) : [];
  var hero = abilities[0] === "hero";
  if (hero) abilities = abilities.slice(1);
  var row = data.deck === "weather" ? data.deck : data.row;
  var desc = row === "agile" ? abField("agile", "description") : "";
  for (var i = abilities.length - 1; i >= 0; i--) desc += abField(abilities[i], "description");
  if (hero) desc += abField("hero", "description");
  return { name: cardLabel(data.name), desc: desc.trim() };
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
  if (!plate) {
    plate = document.createElement("div");
    plate.className = "card-es";
    plate.innerHTML = '<div class="card-es-name"></div><div class="card-es-desc"></div>';
    elem.appendChild(plate);
  }
  plate.children[0].textContent = face.name;
  plate.children[1].textContent = face.desc;
}

function repaintLargeCards() {
  document.querySelectorAll(".card-lg, #card-leader > div").forEach(function (elem) {
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
document.addEventListener("keydown", function (event) {
  if (event.key !== "Escape") return;
  if (!document.getElementById("rules-modal").classList.contains("hide")) closeRules();
  if (!document.getElementById("aid-modal").classList.contains("hide")) closeAid();
});
applyI18n();
