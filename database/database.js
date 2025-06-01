// ========================================
// DATENBANK - database/database.js
// ========================================

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const config = require('../config');

async function initializeDatabase() {
  try {
    const db = await open({
      filename: config.DATABASE.filename,
      driver: sqlite3.Database
    });
    
    // Alle Tabellen erstellen
    await createTables(db);
    
    return db;
  } catch (error) {
    console.error('❌ Datenbank Fehler:', error);
    throw error;
  }
}

async function createTables(db) {
  // Admins
  await db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      username TEXT,
      name TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      added_by TEXT
    )
  `);

  // Super-Admins
  await db.exec(`
    CREATE TABLE IF NOT EXISTS super_admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      username TEXT,
      name TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      added_by TEXT
    )
  `);

  // Lehrer
  await db.exec(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      username TEXT,
      teacher_id TEXT UNIQUE,
      name TEXT,
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Nachrichten
  await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT UNIQUE NOT NULL,
      text TEXT NOT NULL,
      sent_by TEXT,
      sent_by_user_id TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Lesebestätigungen
  await db.exec(`
    CREATE TABLE IF NOT EXISTS read_confirmations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      teacher_id TEXT,
      confirmed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id)
    )
  `);
  
  console.log('✅ Alle Tabellen erstellt');
}

// Database Operations
const db = {
  // Admins
  async addAdmin(userInfo, addedBy, type = 'admin') {
    const table = type === 'admin' ? 'admins' : 'super_admins';
    return await global.botData.db.run(
      `INSERT INTO ${table} (user_id, username, added_by) VALUES (?, ?, ?)`,
      [userInfo.userId, userInfo.username || null, addedBy]
    );
  },

  async getAdmin(userId, type = 'admin') {
    const table = type === 'admin' ? 'admins' : 'super_admins';
    return await global.botData.db.get(
      `SELECT * FROM ${table} WHERE user_id = ?`,
      [userId]
    );
  },

  async listAdmins(type = 'admin') {
    const table = type === 'admin' ? 'admins' : 'super_admins';
    return await global.botData.db.all(
      `SELECT * FROM ${table} ORDER BY added_at DESC`
    );
  },

  async deleteAdmin(userId, type = 'admin') {
    const table = type === 'admin' ? 'admins' : 'super_admins';
    return await global.botData.db.run(
      `DELETE FROM ${table} WHERE user_id = ?`,
      [userId]
    );
  },

  // Lehrer
  async addTeacher(userId, username, teacherId, name) {
    return await global.botData.db.run(
      'INSERT INTO teachers (user_id, username, teacher_id, name) VALUES (?, ?, ?, ?)',
      [userId.toString(), username, teacherId, name]
    );
  },

  async getTeacher(field, value) {
    return await global.botData.db.get(
      `SELECT * FROM teachers WHERE ${field} = ?`,
      [value]
    );
  },

  async listTeachers() {
    return await global.botData.db.all(
      'SELECT * FROM teachers ORDER BY registered_at DESC'
    );
  },

  async updateTeacher(teacherId, name, username) {
    return await global.botData.db.run(
      'UPDATE teachers SET name = ?, username = ? WHERE teacher_id = ?',
      [name, username, teacherId]
    );
  },

  async deleteTeacher(teacherId) {
    return await global.botData.db.run(
      'DELETE FROM teachers WHERE teacher_id = ?',
      [teacherId]
    );
  },

  async searchTeachers(searchTerm) {
    return await global.botData.db.all(
      `SELECT * FROM teachers WHERE 
       name LIKE ? OR 
       teacher_id LIKE ? OR 
       username LIKE ? 
       ORDER BY registered_at DESC`,
      [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm.replace('@', '')}%`]
    );
  },

  // Nachrichten
  async addMessage(messageId, text, sentBy, sentByUserId) {
    return await global.botData.db.run(
      'INSERT INTO messages (message_id, text, sent_by, sent_by_user_id) VALUES (?, ?, ?, ?)',
      [messageId, text, sentBy, sentByUserId.toString()]
    );
  },

  async getMessages(limit = 10) {
    return await global.botData.db.all(
      'SELECT * FROM messages ORDER BY sent_at DESC LIMIT ?',
      [limit]
    );
  },

  async getLastMessage() {
    return await global.botData.db.get(
      'SELECT * FROM messages ORDER BY sent_at DESC LIMIT 1'
    );
  },

  async searchMessages(searchTerm, limit = 10) {
    return await global.botData.db.all(
      'SELECT * FROM messages WHERE text LIKE ? ORDER BY sent_at DESC LIMIT ?',
      [`%${searchTerm}%`, limit]
    );
  },

  // Lesebestätigungen
  async addReadConfirmation(messageId, userId, teacherId) {
    return await global.botData.db.run(
      'INSERT OR REPLACE INTO read_confirmations (message_id, user_id, teacher_id) VALUES (?, ?, ?)',
      [messageId, userId.toString(), teacherId]
    );
  },

  async getReadConfirmations(messageId) {
    return await global.botData.db.all(
      `SELECT rc.*, t.name, t.teacher_id 
       FROM read_confirmations rc 
       LEFT JOIN teachers t ON rc.user_id = t.user_id 
       WHERE rc.message_id = ?`,
      [messageId]
    );
  },

  async getReadStatus(messageId) {
    const allTeachers = await this.listTeachers();
    const readConfirmations = await this.getReadConfirmations(messageId);
    
    const readTeachers = readConfirmations.filter(rc => rc.name);
    const readUserIds = readConfirmations.map(rc => rc.user_id);
    const unreadTeachers = allTeachers.filter(t => !readUserIds.includes(t.user_id));
    
    return {
      total: allTeachers.length,
      read: readTeachers,
      unread: unreadTeachers,
      readCount: readTeachers.length,
      unreadCount: unreadTeachers.length
    };
  },

  // Statistiken
  async getStats() {
    const adminCount = await global.botData.db.get('SELECT COUNT(*) as count FROM admins');
    const superAdminCount = await global.botData.db.get('SELECT COUNT(*) as count FROM super_admins');
    const teacherCount = await global.botData.db.get('SELECT COUNT(*) as count FROM teachers');
    const messageCount = await global.botData.db.get('SELECT COUNT(*) as count FROM messages');
    
    return {
      admins: adminCount.count,
      superAdmins: superAdminCount.count,
      teachers: teacherCount.count,
      messages: messageCount.count
    };
  }
};

module.exports = {
  initializeDatabase,
  db
};
