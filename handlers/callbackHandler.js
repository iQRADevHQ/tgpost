// ========================================
// CALLBACK HANDLER - handlers/callbackHandler.js
// ========================================

const menuHandler = require('./menuHandler');
const { checkPermissions } = require('../modules/userManagement');
const messaging = require('../modules/messaging');
const teacherManagement = require('../modules/teacherManagement');
const userManagement = require('../modules/userManagement');
const exportModule = require('../modules/export');

async function callbackHandler(query) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;
  const userId = query.from.id;
  const username = query.from.username || '';

  console.log(`🔘 Callback: ${data} von ${username} (${userId})`);

  try {
    // Sofort antworten
    await global.botData.bot.answerCallbackQuery(query.id);

    // Berechtigung prüfen
    const permission = await checkPermissions(userId);
    if (permission === 'none' && !data.startsWith('read_confirmation_')) {
      await global.botData.bot.editMessageText(
        'Keine Berechtigung für diese Aktion.',
        { chat_id: chatId, message_id: messageId }
      );
      return;
    }

    // Menü-Navigation
    if (data === 'main_menu') {
      await deleteAndShowMainMenu(chatId, messageId, permission, username);
    }
    else if (data === 'send_message') {
      await handleSendMessage(chatId, messageId, userId, permission, username);
    }
    else if (data === 'message_status') {
      await deleteAndShowMenu(chatId, messageId, () => menuHandler.showMessageStatusMenu(chatId));
    }
    else if (data === 'user_management') {
      await deleteAndShowMenu(chatId, messageId, () => menuHandler.showUserManagementMenu(chatId));
    }
    else if (data === 'teacher_management') {
      await deleteAndShowMenu(chatId, messageId, () => menuHandler.showTeacherManagementMenu(chatId));
    }
    else if (data === 'system') {
      await deleteAndShowMenu(chatId, messageId, () => menuHandler.showSystemMenu(chatId));
    }

    // Nachrichtenstatus
    else if (data === 'last_message_status') {
      await messaging.showLastMessageStatus(chatId, messageId);
    }
    else if (data === 'search_message') {
      await handleSearchMessage(chatId, messageId, userId, permission, username);
    }

    // Nachrichten senden
    else if (data.startsWith('send_message_')) {
      await messaging.sendPendingMessage(chatId, messageId, userId);
    }
    else if (data.startsWith('edit_message_')) {
      await messaging.editPendingMessage(chatId, messageId, userId, permission, username);
    }
    else if (data.startsWith('cancel_message_')) {
      await messaging.cancelPendingMessage(chatId, messageId, userId, permission, username);
    }

    // Lesebestätigung
    else if (data.startsWith('read_confirmation_')) {
      await messaging.handleReadConfirmation(query);
    }

    // Usermanagement
    else if (data === 'add_admin') {
      await userManagement.handleAddAdmin(chatId, messageId, userId, permission, username, 'admin');
    }
    else if (data === 'add_super_admin') {
      await userManagement.handleAddAdmin(chatId, messageId, userId, permission, username, 'super-admin');
    }
    else if (data === 'delete_admin') {
      await userManagement.handleDeleteAdmin(chatId, messageId, userId, permission, username, 'admin');
    }
    else if (data === 'delete_super_admin') {
      await userManagement.handleDeleteAdmin(chatId, messageId, userId, permission, username, 'super-admin');
    }
    else if (data === 'list_admins') {
      await userManagement.showAdminList(chatId, messageId, 'admin');
    }
    else if (data === 'list_super_admins') {
      await userManagement.showAdminList(chatId, messageId, 'super-admin');
    }

    // Lehrermanagement
    else if (data === 'show_teachers') {
      await teacherManagement.showTeacherList(chatId, messageId);
    }
    else if (data === 'edit_teacher') {
      await teacherManagement.handleEditTeacher(chatId, messageId, userId, permission, username);
    }
    else if (data === 'delete_teacher') {
      await teacherManagement.handleDeleteTeacher(chatId, messageId, userId, permission, username);
    }
    else if (data === 'get_registration_link') {
      await teacherManagement.showRegistrationLink(chatId, messageId);
    }

    // System
    else if (data === 'setup_database') {
      await handleSetupDatabase(chatId, messageId);
    }
    else if (data === 'help_commands') {
      await showHelpCommands(chatId, messageId);
    }
    else if (data === 'export_data') {
      await deleteAndShowMenu(chatId, messageId, () => menuHandler.showExportMenu(chatId));
    }
    else if (data === 'backup_database') {
      await exportModule.createDatabaseBackup(chatId, messageId);
    }

    // Export
    else if (data.startsWith('export_')) {
      const exportType = data.replace('export_', '');
      await exportModule.exportData(chatId, messageId, exportType);
    }

    else {
      console.log('❓ Unbekannte Callback-Aktion:', data);
    }

  } catch (error) {
    console.error('❌ Callback Handler Error:', error);
    await global.botData.bot.answerCallbackQuery(query.id, {
      text: 'Ein Fehler ist aufgetreten.',
      show_alert: true
    });
  }
}

async function deleteAndShowMainMenu(chatId, messageId, permission, username) {
  try {
    await global.botData.bot.deleteMessage(chatId, messageId);
  } catch (e) {}
  
  await menuHandler.showMainMenu(chatId, permission, username);
}

async function deleteAndShowMenu(chatId, messageId, menuFunction) {
  try {
    await global.botData.bot.deleteMessage(chatId, messageId);
  } catch (e) {}
  
  await menuFunction();
}

async function handleSendMessage(chatId, messageId, userId, permission, username) {
  try {
    await global.botData.bot.deleteMessage(chatId, messageId);
  } catch (e) {}

  await global.botData.bot.sendMessage(chatId, 
    '📤 NACHRICHT SENDEN\n\nSchreibe deine Nachricht und sende sie ab:'
  );

  global.botData.awaitingInput.set(userId, {
    type: 'send_message',
    permission: permission,
    username: username
  });
}

async function handleSearchMessage(chatId, messageId, userId, permission, username) {
  try {
    await global.botData.bot.deleteMessage(chatId, messageId);
  } catch (e) {}

  await global.botData.bot.sendMessage(chatId, 
    '🔍 NACHRICHT SUCHEN\n\nGib ein Suchwort ein oder /cancel zum Abbrechen:'
  );

  global.botData.awaitingInput.set(userId, {
    type: 'search_message',
    permission: permission,
    username: username
  });
}

async function handleSetupDatabase(chatId, messageId) {
  const { initializeDatabase } = require('../database/database');
  
  try {
    await initializeDatabase();
    
    await global.botData.bot.editMessageText(
      '✅ SETUP ERFOLGREICH!\n\n' +
      'Datenbank wurde eingerichtet:\n' +
      '• Alle Tabellen erstellt\n' +
      '• Verbindung getestet\n' +
      '• Bot ist einsatzbereit!',
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Zurück zum Hauptmenü', callback_data: 'main_menu' }]
          ]
        }
      }
    );
  } catch (error) {
    await global.botData.bot.editMessageText(
      '❌ SETUP FEHLER!\n\n' +
      `Fehler: ${error.message}\n\n` +
      'Bitte prüfe die Konfiguration.',
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Zurück zum Hauptmenü', callback_data: 'main_menu' }]
          ]
        }
      }
    );
  }
}

async function showHelpCommands(chatId, messageId) {
  const helpText = `❓ HILFE & BEFEHLE:

📤 NACHRICHTEN:
• /menu - Hauptmenü öffnen
• /post [Text] - Schnell-Nachricht senden
• /status - Letzter Nachrichtenstatus

📊 NACHRICHTENSTATUS:
• /laststatus - Status letzte Nachricht
• /search - Nachricht suchen für Status

👤 USERMANAGEMENT:
• /addadmin @user - Admin hinzufügen
• /deleteadmin @user - Admin löschen
• /listadmins - Alle Admins anzeigen
• /addsuperadmin @user - Super-Admin hinzufügen
• /deletesuperadmin @user - Super-Admin löschen
• /listsuperadmins - Alle Super-Admins anzeigen

🎓 LEHRERMANAGEMENT:
• /teachers - Lehrerliste anzeigen
• /editteacher ID_XX - Lehrer bearbeiten
• /deleteteacher ID_XX - Lehrer löschen
• /findteacher [Name] - Lehrer suchen
• /getlink - Registrierungslink anfordern

⚙️ SYSTEM:
• /setup - Datenbank einrichten
• /help - Diese Hilfe anzeigen
• /cancel - Aktuelle Aktion abbrechen
• /export - Daten exportieren
• /backup - Datenbank-Backup

🔗 REGISTRIERUNG:
• /start register - Lehrer-Registrierung
• /getlink - Registrierungslink erstellen

🎯 SCHNELLZUGRIFF:
• /menu - Zurück zum Hauptmenü`;

  await global.botData.bot.editMessageText(helpText, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Zurück', callback_data: 'system' }],
        [{ text: '🏠 Hauptmenü', callback_data: 'main_menu' }]
      ]
    }
  });
}

module.exports = callbackHandler;
