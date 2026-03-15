const Database = require('better-sqlite3');
const db = new Database('medq.db');

// Create the activation codes table
db.exec(`
  CREATE TABLE IF NOT EXISTS codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    is_used INTEGER DEFAULT 0,
    used_by_device TEXT DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    used_at TEXT DEFAULT NULL,
    expires_at TEXT DEFAULT NULL
  )
`);

// Insert some starter codes (you can change these!)
const insertCode = db.prepare(`
  INSERT OR IGNORE INTO codes (code) VALUES (?)
`);

const starterCodes = [
  "MED-2026-ALPHA",
  "MED-2026-BETA",
  "SHABAZ-VIP-001",
  "SHABAZ-VIP-002",
  "SHABAZ-VIP-003"
];

starterCodes.forEach(code => insertCode.run(code));

console.log("✅ Database ready!");

module.exports = db;