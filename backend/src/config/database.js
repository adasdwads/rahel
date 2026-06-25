const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { databasePath } = require('./env');

const dataDirectory = path.dirname(databasePath);

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const db = new Database(databasePath);
db.pragma('foreign_keys = ON');

module.exports = db;