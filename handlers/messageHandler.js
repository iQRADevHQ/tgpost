// ========================================
// MESSAGE HANDLER - handlers/messageHandler.js
// ========================================

const config = require('../config');
const { checkPermissions } = require('../modules/userManagement');
const registration = require('../modules/registration');
const menuHandler = require('./menuHandler');

async function messageHandler(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text || '';
  const username = msg.from.username || '';
  
  console.log(`📨 ${username} (${userId}): ${text}`);
  
  try {
    // Registrierung
    if (text.startsWith('/start register')) {
      await registration.handleRegistrationStart(chatId, userId, username);
      return;
    }

    // Hauptmenü
    if (text === '/start' || text === '/menu') {
      const permission = await checkPermissions(userId);
      if (permission !== config.PERMISSIONS.NONE) {
        await menuHandler.showMainMenu(chatId, permission, username);
      } else {
        await handleUnauthorizedUser(chatId, userId, username);
      }
      return;
    }

    // Eingabe verarbeiten
    if (global.botData.awaitingInput.has(userId)) {
      await handleUserInput(chatId, userId, text, username);
      return;
    }

    // Schnellbefehle
    const permission = await checkPermissions(userId);
    
    if (permission === config.PERMISSIONS.NONE) {
      await handleUnauthorizedUser(chatId, userId, username);
      return;
    }

    await handleQuickCommands(chatId, userId, text, permission, username);
    
  } catch (error) {
    console.error('❌ Message Handler Error:', error);
    await global.botData.bot.sendMessage(chatId, 
      'Ein Fehler ist aufgetreten. Verwende /menu für das Hauptmenü.'
    );
  }
}

async function handleUnauthorizedUser(chatId, userId, username) {
  const { db } = require('../database/database');
  const teacher = await db.getTeacher('user_id', userId.toString());
  
  if (teacher) {
    await global.botData.bot.sendMessage(chatId, 
      `Hallo ${teacher.name}!\n\n` +
      `Du bist als Lehrer registriert.\n` +
      `Für Admin-Funktionen wende dich an die Schulleitung.`
    );
  } else {
    await global.botData.bot.sendMessage(chatId, 
      `Keine Berechtigung!\n\n` +
      `Bist du Lehrer? Registriere dich:\n` +
      `https://t.me/${(await global.botData.bot.getMe()).username}?start=register\n\n` +
      `Für Admin-Zugang wende dich an die Schulleitung.\n` +
      `User-ID: ${userId}`
    );
  }
}

async function handleUserInput(chatId, userId, text, username) {
  const inputData = global.botData.awaitingInput.get(userId);
  
  if (inputData.type === 'teacher_registration') {
    await registration.handleRegistrationInput(chatId, userId, text, username, inputData);
  } else if (inputData.type === 'send_message') {
    await handleMessageInput(chatId, userId, text, inputData);
  } else if (inputData.type === 'search_message') {
    await handleSearchInput(chatId, userId, text, inputData);
  }
}

async function handleMessageInput(chatId, userId, text, inputData) {
  if (text.toLowerCase() === '/cancel') {
    global.botData.awaitingInput.delete(userId);
    await menuHandler.showMainMenu(chatId, inputData.permission, inputData.username);
    return;
  }

  // Nachricht-Vorschau zeigen
  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Senden', callback_data: `send_message_${userId}` },
        { text: '✏️ Bearbeiten', callback_data: `edit_message_${userId}` },
        { text: '❌ Abbrechen', callback_data: `cancel_message_${userId}` }
      ],
      [
        { text: '🔙 Zurück zum Hauptmenü', callback_data: 'main_menu' }
      ]
    ]
  };

  global.botData.pendingMessages.set(userId, {
    text: text,
    username: inputData.username,
    permission: inputData.permission
  });

  await global.botData.bot.sendMessage(chatId,
    `📋 NACHRICHT-VORSCHAU:\n\n` +
    `${text}\n\n` +
    `Länge: ${text.length} Zeichen\n\n` +
    `Was möchtest du tun?`,
    { reply_markup: keyboard }
  );

  global.botData.awaitingInput.delete(userId);
}

async function handleSearchInput(chatId, userId, text, inputData) {
  if (text.toLowerCase() === '/cancel') {
    global.botData.awaitingInput.delete(userId);
    await menuHandler.showMessageStatusMenu(chatId);
    return;
  }

  if (/^\d+$/.test(text)) {
    // Nummer eingegeben - Nachricht auswählen
    const messageNumber = parseInt(text);
    const messages = inputData.messages;
    
    if (messageNumber > 0 && messageNumber <= messages.length) {
      const selectedMessage = messages[messageNumber - 1];
      await showMessageStatus(chatId, selectedMessage.message_id);
    } else {
      await global.botData.bot.sendMessage(chatId, 
        `Ungültige Nummer. Bitte wähle 1-${messages.length} oder /cancel`
      );
      return;
    }
  } else {
    // Suchbegriff eingegeben
    const { db } = require('../database/database');
    const searchResults = await db.searchMessages(text, 10);
    
    if (searchResults.length === 0) {
      await global.botData.bot.sendMessage(chatId, 
        `Keine Nachrichten gefunden für "${text}"\n\n` +
        `Versuche einen anderen Begriff oder /cancel`
      );
      return;
    }

    let message = `🔍 SUCHERGEBNISSE für "${text}":\n\n`;
    searchResults.forEach((msg, index) => {
      const shortText = msg.text.length > 80 ? msg.text.substring(0, 80) + '...' : msg.text;
      message += `${index + 1}. ${shortText}\n`;
      message += `   ${new Date(msg.sent_at).toLocaleDateString('de-DE')}\n\n`;
    });
    
    message += `Schreibe die Nummer für Status-Details:`;
    
    await global.botData.bot.sendMessage(chatId, message);
    
    inputData.messages = searchResults;
    global.botData.awaitingInput.set(userId, inputData);
    return;
  }

  global.botData.awaitingInput.delete(userId);
}

async function showMessageStatus(chatId, messageId) {
  const { db } = require('../database/database');
  
  const message = await db.getMessages().then(msgs => 
    msgs.find(m => m.message_id === messageId)
  );
  
  if (!message) {
    await global.botData.bot.sendMessage(chatId, 'Nachricht nicht gefunden.');
    return;
  }

  const readStatus = await db.getReadStatus(messageId);
  
  let statusText = `📊 NACHRICHTENSTATUS:\n\n`;
  statusText += `📝 Nachricht: ${message.text.substring(0, 200)}${message.text.length > 200 ? '...' : ''}\n`;
  statusText += `📅 Gesendet: ${new Date(message.sent_at).toLocaleString('de-DE')}\n`;
  statusText += `👤 Von: ${message.sent_by}\n\n`;
  
  statusText += `📈 ÜBERSICHT:\n`;
  statusText += `✅ Bestätigt: ${readStatus.readCount}/${readStatus.total}\n`;
  statusText += `❌ Nicht bestätigt: ${readStatus.unreadCount}/${readStatus.total}\n\n`;
  
  if (readStatus.read.length > 0) {
    statusText += `✅ BESTÄTIGT:\n`;
    readStatus.read.forEach(teacher => {
      statusText += `• ${teacher.name} (${teacher.teacher_id})\n`;
    });
    statusText += `\n`;
  }
  
  if (readStatus.unread.length > 0) {
    statusText += `❌ NICHT BESTÄTIGT:\n`;
    readStatus.unread.forEach(teacher => {
      statusText += `• ${teacher.name} (${teacher.teacher_id})\n`;
    });
  }

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔙 Zurück', callback_data: 'message_status' },
        { text: '🏠 Hauptmenü', callback_data: 'main_menu' }
      ]
    ]
  };

  await global.botData.bot.sendMessage(chatId, statusText, { reply_markup: keyboard });
}

async function handleQuickCommands(chatId, userId, text, permission, username) {
  const commands = {
    '/help': () => menuHandler.showSystemMenu(chatId),
    '/stats': () => showStats(chatId),
    '/teachers': () => menuHandler.showTeacherManagementMenu(chatId),
    '/admins': () => menuHandler.showUserManagementMenu(chatId)
  };

  if (commands[text]) {
    await commands[text]();
  } else {
    await menuHandler.showMainMenu(chatId, permission, username);
  }
}

async function showStats(chatId) {
  const { db } = require('../database/database');
  const stats = await db.getStats();
  
  const statsText = 
    `📊 BOT-STATISTIKEN:\n\n` +
    `👥 BENUTZER:\n` +
    `• Ur-Super-Admins: ${config.UR_SUPER_ADMINS.length}\n` +
    `• Super-Admins: ${stats.superAdmins}\n` +
    `• Admins: ${stats.admins}\n` +
    `• Lehrer: ${stats.teachers}\n\n` +
    `📬 NACHRICHTEN:\n` +
    `• Gesamt gesendet: ${stats.messages}\n\n` +
    `⏰ Aktualisiert: ${new Date().toLocaleString('de-DE')}`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🔙 Zurück zum Hauptmenü', callback_data: 'main_menu' }]
    ]
  };

  await global.botData.bot.sendMessage(chatId, statsText, { reply_markup: keyboard });
}

module.exports = messageHandler;
