"use strict";

// Prueba del menu hamburguesa sin navegador.
// Contrato: abrir/cambiar Jugar-Online-Limites-Cuenta NO cierra #nav.
// Solo un click fuera o closeNav() cierra el panel.

function makeEl(id, className) {
  const classes = new Set((className || "").split(/\s+/).filter(Boolean));
  const el = {
    id: id || "",
    className: className || "",
    parentElement: null,
    children: [],
    classList: {
      contains: (name) => classes.has(name),
      add: (name) => {
        classes.add(name);
        el.className = Array.from(classes).join(" ");
      },
      remove: (name) => {
        classes.delete(name);
        el.className = Array.from(classes).join(" ");
      },
      toggle: (name, force) => {
        if (force === true) classes.add(name);
        else if (force === false) classes.delete(name);
        else if (classes.has(name)) classes.delete(name);
        else classes.add(name);
        el.className = Array.from(classes).join(" ");
        return classes.has(name);
      },
    },
    closest: (sel) => {
      let node = el;
      while (node) {
        if (sel === ".menu-drop" && node._kind === "drop") return node;
        if (sel === "#nav" && node.id === "nav") return node;
        if (sel.indexOf("#nav") !== -1 && node.id === "nav") return node;
        node = node.parentElement;
      }
      return null;
    },
    contains: (other) => {
      let node = other;
      while (node) {
        if (node === el) return true;
        node = node.parentElement;
      }
      return false;
    },
  };
  return el;
}

function attach(parent, child) {
  child.parentElement = parent;
  parent.children.push(child);
  return child;
}

function build() {
  const nav = makeEl("nav");
  const panel = makeEl("nav-panel");
  const menu = makeEl("top-menu");
  const tools = makeEl("nav-tools");
  attach(nav, panel);
  attach(panel, menu);
  attach(panel, tools);

  const drops = {};
  ["play", "online-menu", "limits", "account"].forEach((key) => {
    const drop = makeEl(key === "online-menu" ? "online-menu" : "", "menu-drop");
    drop._kind = "drop";
    drop._key = key;
    const btn = makeEl("", "menu-drop-btn");
    attach(menu, drop);
    attach(drop, btn);
    drops[key] = drop;
  });

  const byId = {
    nav: nav,
    "nav-panel": panel,
    "top-menu": menu,
    "nav-tools": tools,
    "online-menu": drops["online-menu"],
  };

  function queryOpenDrops() {
    return menu.children.filter((c) => c._kind === "drop" && c.classList.contains("open"));
  }

  function closeDrops(except) {
    queryOpenDrops().forEach((drop) => {
      if (drop !== except) drop.classList.remove("open");
    });
  }

  function closeNav() {
    nav.classList.remove("open");
    closeDrops();
  }

  function toggleMenuDrop(drop) {
    const was = drop.classList.contains("open");
    closeDrops(drop);
    if (was) drop.classList.remove("open");
    else drop.classList.add("open");
  }

  function openHamburger() {
    nav.classList.add("open");
  }

  function clickSection(key) {
    // Como el handler real: no toca #nav.
    toggleMenuDrop(drops[key]);
  }

  function clickOutside() {
    closeNav();
  }

  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  return {
    nav: nav,
    drops: drops,
    openHamburger: openHamburger,
    clickSection: clickSection,
    clickOutside: clickOutside,
    closeNav: closeNav,
    assert: assert,
    byId: byId,
  };
}

function run() {
  const ui = build();

  ui.openHamburger();
  ui.assert(ui.nav.classList.contains("open"), "hamburguesa abierta");

  ui.clickSection("play");
  ui.assert(ui.nav.classList.contains("open"), "nav sigue tras Jugar");
  ui.assert(ui.drops.play.classList.contains("open"), "Jugar abierto");

  ui.clickSection("account");
  ui.assert(ui.nav.classList.contains("open"), "nav sigue al cambiar a Cuenta");
  ui.assert(ui.drops.account.classList.contains("open"), "Cuenta abierta");
  ui.assert(!ui.drops.play.classList.contains("open"), "Jugar cerrado al cambiar");

  ui.clickSection("limits");
  ui.assert(ui.nav.classList.contains("open"), "nav sigue en Limites");
  ui.assert(ui.drops.limits.classList.contains("open"), "Limites abierto");
  ui.assert(!ui.drops.account.classList.contains("open"), "Cuenta cerrada");

  ui.clickSection("online-menu");
  ui.assert(ui.nav.classList.contains("open"), "nav sigue en Online");
  ui.assert(ui.drops["online-menu"].classList.contains("open"), "Online abierto");

  // Cerrar la misma seccion no tumba el menu.
  ui.clickSection("online-menu");
  ui.assert(ui.nav.classList.contains("open"), "nav sigue al plegar Online");
  ui.assert(!ui.drops["online-menu"].classList.contains("open"), "Online plegado");

  ui.clickSection("play");
  ui.clickOutside();
  ui.assert(!ui.nav.classList.contains("open"), "fuera cierra nav");
  ui.assert(!ui.drops.play.classList.contains("open"), "fuera limpia secciones");

  // Regresion del bug: closeDrops no debe quitar nav.open
  ui.openHamburger();
  ui.clickSection("play");
  ui.drops.play.classList.remove("open"); // solo seccion
  ui.assert(ui.nav.classList.contains("open"), "quitar seccion no cierra nav");

  // El fuente real no debe volver a cerrar #nav desde el click de seccion.
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(path.join(__dirname, "gwent.js"), "utf8");
  const btnBlock = src.match(/#top-menu \.menu-drop-btn[\s\S]*?ensureOnline[\s\S]*?\}\);\n\}\);/);
  if (!btnBlock) throw new Error("no encuentro el handler de menu-drop-btn");
  if (btnBlock[0].indexOf("closeMenus()") !== -1)
    throw new Error("menu-drop-btn vuelve a llamar closeMenus() sin except");
  if (btnBlock[0].indexOf("toggleMenuDrop") === -1)
    throw new Error("menu-drop-btn debe usar toggleMenuDrop");
  if (src.indexOf("function closeDrops") === -1) throw new Error("falta closeDrops");

  const css = fs.readFileSync(path.join(__dirname, "style.css"), "utf8");
  if (css.indexOf("#nav-panel #top-menu") === -1)
    throw new Error("css sin layout de menu en #nav-panel");

  console.log("menu-nav-check ok");
}

run();
