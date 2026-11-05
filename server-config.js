function clampInt(raw, lo, hi, fallback) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

// Salas en vivo a la vez: 10..25 (defecto 20). Env: GWENT_MAX_SESSIONS
const MAX_SESSIONS = clampInt(process.env.GWENT_MAX_SESSIONS, 10, 25, 20);

// Login idle: 5..120 min (defecto 30). Env: GWENT_LOGIN_TTL_MIN
const LOGIN_TTL_MIN = clampInt(process.env.GWENT_LOGIN_TTL_MIN, 5, 120, 30);
const LOGIN_TTL_MS = LOGIN_TTL_MIN * 60 * 1000;

// Lobby sin partida: se borra tras el mismo idle para liberar cupo.
const LOBBY_IDLE_MS = LOGIN_TTL_MS;

(function () {
  if (MAX_SESSIONS < 10 || MAX_SESSIONS > 25) throw new Error("max sesiones");
  if (LOGIN_TTL_MIN < 5 || LOGIN_TTL_MIN > 120) throw new Error("login ttl");
})();

module.exports = {
  MAX_SESSIONS: MAX_SESSIONS,
  LOGIN_TTL_MIN: LOGIN_TTL_MIN,
  LOGIN_TTL_MS: LOGIN_TTL_MS,
  LOBBY_IDLE_MS: LOBBY_IDLE_MS,
};
