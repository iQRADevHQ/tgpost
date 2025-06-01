// ========================================
// USER MANAGEMENT - modules/userManagement.js
// ========================================

const config = require('../config');

class UserManagement {
  static async checkPermissions(userId) {
    const userIdStr = userId.toString();
    
    // Ur-Super-Admin
    if (config.UR_SUPER_ADMINS.includes(userIdStr)) {
      return config.PERMISSIONS.UR_SUPER_ADMIN;
    }
    
    try {
      const { db } = require('../database/database');
      
      // Super-Admin
      const superAdmin = await db.getAdmin(userIdStr, 'super-admin');
      if (superAdmin) return config.PERMISSIONS.SUPER_ADMIN;
      
      // Admin
      const admin = await db.getAdmin(userIdStr, 'admin');
      if (admin) return config.PERMISSIONS.ADMIN;
      
      // Lehrer
      const teacher = await db.getTeacher('user_id', userIdStr);
      if (teacher) return config.PERMISSIONS.TEACHER;
      
    } catch (error) {
      console.error('❌ Berechtigungsprüfung-Fehler:', error);
    }
    
    return config.PERMISSIONS.NONE;
  }

  static async handleAddAdmin(chatId, messageId, userId, permission, username, type) {
    await global.botData.bot.editMessageText(
      `➕ ${type === 'admin' ? 'ADMIN' : 'SUPER-ADMIN'} HINZUFÜGEN\n\n` +
      `Gib Username oder User-ID ein:\n\n` +
      `Beispiele:\n` +
      `• @username\n` +
      `• 123456789\n\n` +
      `Abbrechen: /cancel`,
      { chat_id: chatId, message_id: messageId }
    );

    global.botData.awaitingInput.set(userId, {
      type: `add_${type.replace('-', '_')}`,
      permission: permission,
      username: username
    });
  }

  static async handleDeleteAdmin(chatId, messageId, userId, permission, username, type) {
    await global.botData.bot.editMessageText(
      `➖ ${type === 'admin' ? 'ADMIN' : 'SUPER-ADMIN'} LÖSCHEN\n\n` +
      `Gib Username oder User-ID ein:\n\n` +
      `Beispiele:\n` +
      `• @username\n` +
      `• 123456789\n\n` +
      `Abbrechen: /cancel`,
      { chat_id: chatId, message_id: messageId }
    );

    global.botData.awaitingInput.set(userId, {
      type: `delete_${type.replace('-', '_')}`,
      permission: permission,
      username: username
    });
  }

  static async showAdminList(chatId, messageId, type) {
    try {
      const { db } = require('../database/database');
      const admins = await db.listAdmins(type);
      const title = type === 'admin' ? 'ADMIN-LISTE' : 'SUPER-ADMIN-LISTE';
      
      if (admins.length === 0) {
        await global.botData.bot.editMessageText(
          `📋 ${title}:\n\n` +
          `❌ Keine ${type === 'admin' ? 'Admins' : 'Super-Admins'} registriert.\n\n` +
          `Hinzufügen über das Usermanagement-Menü.`,
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Zurück', callback_data: 'user_management' }],
                [{ text: '🏠 Hauptmenü', callback_data: 'main_menu' }]
              ]
            }
          }
        );
        return;
      }

      let listText = `📋 ${title}:\n\n`;
      listText += `👥 ${admins.length} ${type === 'admin' ? 'Admin(s)' : 'Super-Admin(s)'} registriert:\n\n`;
      
      admins.forEach((admin, index) => {
        const username = admin.username ? `@${admin.username}` : 'Kein Username';
        listText += `${index + 1}. ${username}\n`;
        listText += `   User-ID: ${admin.user_id}\n`;
        listText += `   Seit: ${new Date(admin.added_at).toLocaleDateString('de-DE')}\n\n`;
      });

      await global.botData.bot.editMessageText(listText, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Zurück', callback_data: 'user_management' }],
            [{ text: '🏠 Hauptmenü', callback_data: 'main_menu' }]
          ]
        }
      });

    } catch (error) {
      console.error('❌ Admin-Liste-Fehler:', error);
      await global.botData.bot.editMessageText(
        `❌ Fehler beim Laden der ${type === 'admin' ? 'Admin' : 'Super-Admin'}-Liste.\n\nDetails: ${error.message}`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Zurück', callback_data: 'user_management' }]
            ]
          }
        }
      );
    }
  }
}

module.exports = UserManagement;
