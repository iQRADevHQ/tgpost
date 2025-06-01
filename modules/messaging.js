// ========================================
// MESSAGING - modules/messaging.js
// ========================================

const menuHandler = require('../handlers/menuHandler');

class Messaging {
  static async sendPendingMessage(chatId, messageId, userId) {
    const pendingMessage = global.botData.pendingMessages.get(userId);
    
    if (!pendingMessage) {
      await global.botData.bot.editMessageText(
        '❌ Nachricht nicht mehr verfügbar.',
        { chat_id: chatId, message_id: messageId }
      );
      return;
    }

    try {
      // Nachricht an Kanal senden mit Lesebestätigung-Button
      const keyboard = {
        inline_keyboard: [
          [{ text: '✅ Gelesen', callback_data: `read_confirmation_${Date.now()}` }]
        ]
      };

      const sentMessage = await global.botData.bot.sendMessage(
        config.CHANNEL_ID,
        pendingMessage.text,
        { reply_markup: keyboard }
      );

      // In Datenbank speichern
      const { db } = require('../database/database');
      await db.addMessage(
        sentMessage.message_id.toString(),
        pendingMessage.text,
        pendingMessage.username,
        userId
      );

      // Bestätigung
      await global.botData.bot.editMessageText(
        `✅ NACHRICHT GESENDET!\n\n` +
        `📬 Message-ID: ${sentMessage.message_id}\n` +
        `📅 Zeit: ${new Date().toLocaleString('de-DE')}\n` +
        `📊 Kanal: Lehrerinfos\n\n` +
        `Die Nachricht ist jetzt für alle Lehrer sichtbar.`,
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

      global.botData.pendingMessages.delete(userId);

    } catch (error) {
      console.error('❌ Sende-Fehler:', error);
      
      let errorMsg = `❌ Senden fehlgeschlagen!\n\n`;
      
      if (error.response?.body?.error_code === 403) {
        errorMsg += `Bot hat keine Berechtigung im Kanal.\nFüge den Bot als Admin hinzu.`;
      } else {
        errorMsg += `Fehler: ${error.message}`;
      }

      await global.botData.bot.editMessageText(errorMsg, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Zurück zum Hauptmenü', callback_data: 'main_menu' }]
          ]
        }
      });
    }
  }

  static async editPendingMessage(chatId, messageId, userId, permission, username) {
    await global.botData.bot.editMessageText(
      `✏️ NACHRICHT BEARBEITEN\n\n` +
      `Sende den neuen Text für deine Nachricht.\n` +
      `Verwende /cancel zum Abbrechen.`,
      { chat_id: chatId, message_id: messageId }
    );

    global.botData.awaitingInput.set(userId, {
      type: 'send_message',
      permission: permission,
      username: username
    });
  }

  static async cancelPendingMessage(chatId, messageId, userId, permission, username) {
    global.botData.pendingMessages.delete(userId);
    
    try {
      await global.botData.bot.deleteMessage(chatId, messageId);
    } catch (e) {}
    
    await menuHandler.showMainMenu(chatId, permission, username);
  }

  static async handleReadConfirmation(query) {
    const userId = query.from.id;
    const username = query.from.username || query.from.first_name || 'Unbekannt';
    const messageId = query.message.message_id.toString();
    
    try {
      // Prüfe ob User ein Lehrer ist
      const { db } = require('../database/database');
      const teacher = await db.getTeacher('user_id', userId.toString());
      
      if (!teacher) {
        await global.botData.bot.answerCallbackQuery(query.id, {
          text: "Du bist nicht als Lehrer registriert.",
          show_alert: true
        });
        return;
      }

      // Speichere Lesebestätigung
      await db.addReadConfirmation(messageId, userId, teacher.teacher_id);

      await global.botData.bot.answerCallbackQuery(query.id, {
        text: `✅ Danke ${teacher.name}! Als gelesen markiert.`,
        show_alert: false
      });

      console.log(`✅ Lesebestätigung: ${teacher.name} (${teacher.teacher_id}) für Message ${messageId}`);

    } catch (error) {
      console.error('❌ Lesebestätigung-Fehler:', error);
      await global.botData.bot.answerCallbackQuery(query.id, {
        text: "Fehler beim Speichern der Bestätigung.",
        show_alert: true
      });
    }
  }

  static async showLastMessageStatus(chatId, messageId) {
    try {
      const { db } = require('../database/database');
      const lastMessage = await db.getLastMessage();
      
      if (!lastMessage) {
        await global.botData.bot.editMessageText(
          `📊 NACHRICHTENSTATUS\n\n` +
          `❌ Noch keine Nachrichten gesendet.\n\n` +
          `Sende die erste Nachricht über das Hauptmenü.`,
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Zurück', callback_data: 'message_status' }],
                [{ text: '🏠 Hauptmenü', callback_data: 'main_menu' }]
              ]
            }
          }
        );
        return;
      }

      const readStatus = await db.getReadStatus(lastMessage.message_id);
      
      let statusText = `📊 STATUS LETZTE NACHRICHT:\n\n`;
      statusText += `📝 Nachricht: ${lastMessage.text.substring(0, 200)}${lastMessage.text.length > 200 ? '...' : ''}\n`;
      statusText += `📅 Gesendet: ${new Date(lastMessage.sent_at).toLocaleString('de-DE')}\n`;
      statusText += `👤 Von: ${lastMessage.sent_by}\n\n`;
      
      statusText += `📈 ÜBERSICHT:\n`;
      statusText += `✅ Bestätigt: ${readStatus.readCount}/${readStatus.total}\n`;
      statusText += `❌ Nicht bestätigt: ${readStatus.unreadCount}/${readStatus.total}\n\n`;
      
      if (readStatus.read.length > 0) {
        statusText += `✅ BESTÄTIGT:\n`;
        readStatus.read.slice(0, 10).forEach(teacher => {
          statusText += `• ${teacher.name} (${teacher.teacher_id})\n`;
        });
        if (readStatus.read.length > 10) {
          statusText += `... und ${readStatus.read.length - 10} weitere\n`;
        }
        statusText += `\n`;
      }
      
      if (readStatus.unread.length > 0) {
        statusText += `❌ NICHT BESTÄTIGT:\n`;
        readStatus.unread.slice(0, 10).forEach(teacher => {
          statusText += `• ${teacher.name} (${teacher.teacher_id})\n`;
        });
        if (readStatus.unread.length > 10) {
          statusText += `... und ${readStatus.unread.length - 10} weitere\n`;
        }
      }

      await global.botData.bot.editMessageText(statusText, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Zurück', callback_data: 'message_status' }],
            [{ text: '🏠 Hauptmenü', callback_data: 'main_menu' }]
          ]
        }
      });

    } catch (error) {
      console.error('❌ Status-Fehler:', error);
      await global.botData.bot.editMessageText(
        `❌ Fehler beim Laden des Status.\n\nDetails: ${error.message}`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Zurück', callback_data: 'message_status' }],
              [{ text: '🏠 Hauptmenü', callback_data: 'main_menu' }]
            ]
          }
        }
      );
    }
  }
}

module.exports = Messaging;
