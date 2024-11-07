const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        role_id TEXT NOT NULL,
        created_by TEXT NOT NULL, 
        expires_at DATETIME
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        accepted_tos BOOLEAN NOT NULL DEFAULT 0,
        time_joined DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS invite_members (
        invite_id INTEGER,
        member_id TEXT,
        PRIMARY KEY (invite_id, member_id),
        FOREIGN KEY(invite_id) REFERENCES invites(id),
        FOREIGN KEY(member_id) REFERENCES members(id)
    )`);
});

module.exports = db;