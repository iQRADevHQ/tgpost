// ========================================
// MENÜ HANDLER - handlers/menuHandler.js
// ========================================

const config = require('../config');

class MenuHandler {
  // Hauptmenü
  static async showMainMenu(chatId, permission, username) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '📤 Nachricht senden', callback_data: 'send_message' }],
        [{ text: '📊 Nachrichtenstatus', callback_data: 'message_status' }],
        [{ text: '👤 Usermanagement', callback_data: 'user_management' }],
        [{ text: '🎓 Lehrermanagement', callback_data: 'teacher_management' }],
        [{ text: '⚙️ System', callback_data: 'system' }]
      ]
    };

    const permissionNames = {
      [config.PERMISSIONS.UR_SUPER_ADMIN]: 'Ur-Super-Administrator',
      [config.PERMISSIONS.SUPER_ADMIN]: 'Super-Administrator',
      [config.PERMISSIONS.ADMIN]: 'Administrator'
    };

    const menuText = 
      `🤖 TELEGRAM LEHRER-BOT\n\n` +
      `👋 Willkommen, ${username || 'Admin'}!\n` +
      `🔐 Berechtigung: ${permissionNames[permission]}\n\n` +
      `Wähle eine Option:`;

    await global.botData.bot.sendMessage(chatId, menuText, { reply_markup: keyboard });
  }

  // Nachrichtenstatus-Menü
  static async showMessageStatusMenu(chatId) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '📈 Status letzte Nachricht', callback_data: 'last_message_status' }],
        [{ text: '🔍 Suche Nachricht', callback_data: 'search_message' }],
        [{ text: '🔙 Zurück zum Hauptmenü', callback_data: 'main_menu' }]
      ]
    };

    await global.botData.bot.sendMessage(chatId, 
      '📊 NACHRICHTENSTATUS\n\nWas möchtest du prüfen?', 
      { reply_markup: keyboard }
    );
  }

  // Usermanagement-Menü
  static async showUserManagementMenu(chatId) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '➕ Admin hinzufügen', callback_data: 'add_admin' }],
        [{ text: '➖ Admin löschen', callback_data: 'delete_admin' }],
        [{ text: '📋 Admin-Liste', callback_data: 'list_admins' }],
        [{ text: '⭐ Super-Admin hinzufügen', callback_data: 'add_super_admin' }],
        [{ text: '🗑️ Super-Admin löschen', callback_data: 'delete_super_admin' }],
        [{ text: '📊 Super-Admin-Liste', callback_data: 'list_super_admins' }],
        [{ text: '🔙 Zurück zum Hauptmenü', callback_data: 'main_menu' }]
      ]
    };

    await global.botData.bot.sendMessage(chatId, 
      '👤 USERMANAGEMENT\n\nWähle eine Aktion:', 
      { reply_markup: keyboard }
    );
  }

  // Lehrermanagement-Menü
  static async showTeacherManagementMenu(chatId) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '📋 Zeige Lehrerliste', callback_data: 'show_teachers' }],
        [{ text: '✏️ Bearbeite Lehrer', callback_data: 'edit_teacher' }],
        [{ text: '🗑️ Lösche Lehrer', callback_data: 'delete_teacher' }],
        [{ text: '🔗 Registrierungslink anfordern', callback_data: 'get_registration_link' }],
        [{ text: '🔙 Zurück zum Hauptmenü', callback_data: 'main_menu' }]
      ]
    };

    await global.botData.bot.sendMessage(chatId, 
      '🎓 LEHRERMANAGEMENT\n\nWas möchtest du tun?', 
      { reply_markup: keyboard }
    );
  }

  // System-Menü
  static async showSystemMenu(chatId) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '🛠️ Setup Datenbank', callback_data: 'setup_database' }],
        [{ text: '❓ Hilfe & Befehle', callback_data: 'help_commands' }],
        [{ text: '📊 Export Daten', callback_data: 'export_data' }],
        [{ text: '💾 Datenbank Backup', callback_data: 'backup_database' }],
        [{ text: '🔙 Zurück zum Hauptmenü', callback_data: 'main_menu' }]
      ]
    };

    await global.botData.bot.sendMessage(chatId, 
      '⚙️ SYSTEM\n\nWähle eine Option:', 
      { reply_markup: keyboard }
    );
  }

  // Export-Menü
  static async showExportMenu(chatId) {
    const keyboard = {
      inline_keyboard: [
        [{ text: '👥 Lehrerliste', callback_data: 'export_teachers' }],
        [{ text: '💬 Nachrichten-Log', callback_data: 'export_messages' }],
        [{ text: '👤 Admin-Liste', callback_data: 'export_admins' }],
        [{ text: '📈 Lesebestätigungen', callback_data: 'export_confirmations' }],
        [{ text: '🔙 Zurück', callback_data: 'system' }],
        [{ text: '🏠 Hauptmenü', callback_data: 'main_menu' }]
      ]
    };

    await global.botData.bot.sendMessage(chatId, 
      '📊 DATEN EXPORTIEREN\n\nWelche Daten als CSV-Datei?', 
      { reply_markup: keyboard }
    );
  }
}

module.exports = MenuHandler;
