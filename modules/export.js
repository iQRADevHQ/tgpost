// ========================================
// EXPORT - modules/export.js
// ========================================

const fs = require('fs').promises;
const path = require('path');

class Export {
  static async exportData(chatId, messageId, exportType) {
    try {
      const { db } = require('../database/database');
      let data, filename, headers;

      switch (exportType) {
        case 'teachers':
          data = await db.listTeachers();
          headers = ['Name', 'Lehrer_ID', 'Username', 'User_ID', 'Registriert'];
          filename = `lehrerliste_${this.getDateString()}.csv`;
          data = data.map(t => [
            t.name,
            t.teacher_id,
            t.username || '',
            t.user_id,
            new Date(t.registered_at).toLocaleDateString('de-DE')
          ]);
          break;

        case 'messages':
          data = await db.getMessages(100);
          headers = ['Text', 'Gesendet_von', 'User_ID', 'Gesendet_am', 'Message_ID'];
          filename = `nachrichten_${this.getDateString()}.csv`;
          data = data.map(m => [
            m.text.replace(/"/g, '""'),
            m.sent_by,
            m.sent_by_user_id,
            new Date(m.sent_at).toLocaleString('de-DE'),
            m.message_id
          ]);
          break;

        case 'admins':
          const admins = await db.listAdmins('admin');
          const superAdmins = await db.listAdmins('super-admin');
          headers = ['Name', 'Username', 'User_ID', 'Typ', 'Hinzugefuegt'];
          filename = `adminliste_${this.getDateString()}.csv`;
          data = [
            ...admins.map(a => [a.name || '', a.username || '', a.user_id, 'Admin', new Date(a.added_at).toLocaleDateString('de-DE')]),
            ...superAdmins.map(a => [a.name || '', a.username || '', a.user_id, 'Super-Admin', new Date(a.added_at).toLocaleDateString('de-DE')])
          ];
          break;

        case 'confirmations':
          const confirmations = await global.botData.db.all(`
            SELECT rc.*, m.text as message_text, t.name as teacher_name 
            FROM read_confirmations rc 
            LEFT JOIN messages m ON rc.message_id = m.message_id 
            LEFT JOIN teachers t ON rc.user_id = t.user_id 
            ORDER BY rc.confirmed_at DESC LIMIT 1000
          `);
          headers = ['Lehrer_Name', 'Lehrer_ID', 'Nachricht', 'Bestaetigt_am', 'Message_ID'];
          filename = `lesebestaetigung_${this.getDateString()}.csv`;
          data = confirmations.map(c => [
            c.teacher_name || 'Unbekannt',
            c.teacher_id || '',
            (c.message_text || '').substring(0, 100).replace(/"/g, '""'),
            new Date(c.confirmed_at).toLocaleString('de-DE'),
            c.message_id
          ]);
          break;

        default:
          throw new Error('Unbekannter Export-Typ');
      }

      if (data.length === 0) {
        await global.botData.bot.editMessageText(
          `📊 EXPORT: ${exportType.toUpperCase()}\n\n` +
          `❌ Keine Daten vorhanden.\n\n` +
          `Es gibt noch keine Einträge zum Exportieren.`,
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Zurück', callback_data: 'export_data' }]
              ]
            }
          }
        );
        return;
      }

      // CSV erstellen
      const csvContent = [
        headers.join(','),
        ...data.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Datei speichern
      const filepath = path.join(process.cwd(), filename);
      await fs.writeFile(filepath, csvContent, 'utf8');

      // Datei senden
      await global.botData.bot.sendDocument(chatId, filepath, {
        caption: `📊 ${exportType.toUpperCase()} EXPORT\n\n` +
                `📄 ${filename}\n` +
                `📊 ${data.length} Einträge\n` +
                `📅 Erstellt: ${new Date().toLocaleString('de-DE')}`
      });

      // Original-Nachricht löschen
      try {
        await global.botData.bot.deleteMessage(chatId, messageId);
      } catch (e) {}

      // Datei löschen
      try {
        await fs.unlink(filepath);
      } catch (e) {}

    } catch (error) {
      console.error('❌ Export-Fehler:', error);
      await global.botData.bot.editMessageText(
        `❌ EXPORT FEHLER\n\n` +
        `Fehler beim Erstellen der ${exportType}-Datei.\n\n` +
        `Details: ${error.message}`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Zurück', callback_data: 'export_data' }]
            ]
          }
        }
      );
    }
  }

  static async createDatabaseBackup(chatId, messageId) {
    try {
      const config = require('../config');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `backup_${timestamp}.db`;
      const backupPath = path.join(process.cwd(), backupFilename);

      // Datenbank-Datei kopieren
      await fs.copyFile(config.DATABASE.filename, backupPath);

      // Backup senden
      await global.botData.bot.sendDocument(chatId, backupPath, {
        caption: `💾 DATENBANK BACKUP\n\n` +
                `📄 ${backupFilename}\n` +
                `📅 Erstellt: ${new Date().toLocaleString('de-DE')}\n\n` +
                `Backup enthält:\n` +
                `• Alle Lehrer\n` +
                `• Alle Nachrichten\n` +
                `• Alle Admins\n` +
                `• Alle Lesebestätigungen`
      });

      // Original-Nachricht löschen
      try {
        await global.botData.bot.deleteMessage(chatId, messageId);
      } catch (e) {}

      // Backup-Datei löschen
      try {
        await fs.unlink(backupPath);
      } catch (e) {}

    } catch (error) {
      console.error('❌ Backup-Fehler:', error);
      await global.botData.bot.editMessageText(
        `❌ BACKUP FEHLER\n\n` +
        `Fehler beim Erstellen des Backups.\n\n` +
        `Details: ${error.message}`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Zurück', callback_data: 'system' }]
            ]
          }
        }
      );
    }
  }

  static getDateString() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD
  }
}

module.exports = Export;
