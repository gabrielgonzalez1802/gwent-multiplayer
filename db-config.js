const fs = require("fs");
const path = require("path");

function dbConfig() {
  const file = path.join(__dirname, "db.json");
  const fromFile = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const port = Number(fromFile.port || process.env.GWENT_DB_PORT || 3306);
  const database = fromFile.database || process.env.GWENT_DB_NAME || "gwent";
  if (!Number.isFinite(port) || port < 1 || port > 65535) throw new Error("db puerto");
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error("db nombre");
  return {
    host: fromFile.host || process.env.GWENT_DB_HOST || "localhost",
    port: port,
    user: fromFile.user || process.env.GWENT_DB_USER || "root",
    password: fromFile.password != null ? String(fromFile.password) : (process.env.GWENT_DB_PASSWORD || ""),
    database: database,
    ssl: !!fromFile.ssl,
  };
}

const DB = dbConfig();

function mysqlOptions(withDatabase) {
  const opt = { host: DB.host, port: DB.port, user: DB.user, password: DB.password };
  if (withDatabase) opt.database = DB.database;
  if (DB.ssl) opt.ssl = {};
  return opt;
}

module.exports = { DB: DB, mysqlOptions: mysqlOptions };
