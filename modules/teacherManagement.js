// ========================================
// TEACHER MANAGEMENT - modules/teacherManagement.js
// ========================================

class TeacherManagement {
  static async showTeacherList(chatId, messageId) {
    try {
      const { db } = require('../database/database');
      const teachers = await db.listTeachers();
      
      if (teachers.length === 0) {
        await global.botData.bot.editMessageText(
          `📋 LEHRERLISTE:\n\n` +
          `❌ Noch keine Lehrer registriert.\n\n` +
          `Registrierungs-Link:\n` +
          `https://t.me/${(await global.botData.bot.getMe()).username}?start=register`,
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Zurück', callback_data: 'teacher_management' }],
                [{ text: '🏠 Hauptmenü', callback_data: 'main_menu' }]
              ]
            }
          }
        );
        return;
      }

      let listText = `📋 LEHRERLISTE:\n\n`;
      listText += `👥 ${teachers.length} Lehrer registriert:\n\n`;
      
      teachers.forEach((teacher, index) => {
        const username = teacher.username ? `@${teacher.username}` : 'Kein Username';
        listText += `${index + 1}. ${teacher.name} (${teacher.teacher_id})\n`;
        listText += `   Username: ${username}\n`;
        listText += `   Registriert: ${new Date(teacher.registered_at).toLocaleDateString('de-DE')}\n\n`;
      });

      listText += `Verwaltung:\n`;
      listText += `• Bearbeiten: Über Lehrermanagement-Menü\n`;
      listText += `• Löschen: Über Lehrermanagement-Menü`;

      await global.botData.bot.editMessageText(listText, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Zurück', callback_data: 'teacher_management' }],
            [{ text: '🏠 Hauptmenü', callback_data: 'main_menu' }]
          ]
        }
      });

    } catch (error) {
      console.error('❌ Lehrerliste-Fehler:', error);
      await global.botData.bot.editMessageText(
        `❌ Fehler beim Laden der Lehrerliste.\n\nDetails: ${error.message}`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Zurück', callback_data: 'teacher_management' }]
            ]
          }
        }
      );
    }
  }

  static async handleEditTeacher(chatId, messageId, userId, permission, username) {
    await global.botData.bot.editMessageText(
      `✏️ LEHRER BEARBEITEN\n\n` +
      `Gib die Lehrer-ID ein (z.B. ID_34):\n\n` +
      `Verwende /teachers um alle IDs zu sehen.\n\n` +
      `Abbrechen: /cancel`,
      { chat_id: chatId, message_id: messageId }
    );

    global.botData.awaitingInput.set(userId, {
      type: 'edit_teacher',
      permission: permission,
      username: username
    });
  }

  static async handleDeleteTeacher(chatId, messageId, userId, permission, username) {
    await global.botData.bot.editMessageText(
      `🗑️ LEHRER LÖSCHEN\n\n` +
      `Gib die Lehrer-ID ein (z.B. ID_34):\n\n` +
      `⚠️ Diese Aktion kann nicht rückgängig gemacht werden!\n\n` +
      `Abbrechen: /cancel`,
      { chat_id: chatId, message_id: messageId }
    );

    global.botData.awaitingInput.set(userId, {
      type: 'delete_teacher',
      permission: permission,
      username: username
    });
  }

  static async showRegistrationLink(chatId, messageId) {
    try {
      const botInfo = await global.botData.bot.getMe();
      const registrationLink = `https://t.me/${botInfo.username}?start=register`;
      
      const { db } = require('../database/database');
      const stats = await db.getStats();

      await global.botData.bot.editMessageText(
        `🔗 REGISTRIERUNGSLINK:\n\n` +
        `${registrationLink}\n\n` +
        `📋 VERWENDUNG:\n` +
        `1. Link in WhatsApp-Gruppe teilen\n` +
        `2. Lehrer klicken auf Link\n` +
        `3. Bot führt durch Registrierung\n` +
        `4. Automatische Benachrichtigung an Admins\n\n` +
        `📊 Aktuell registriert: ${stats.teachers} Lehrer\n\n` +
        `📱 WHATSAPP-TEXT:\n` +
        `🎓 LEHRER-REGISTRIERUNG\n\n` +
        `Bitte registriert euch für wichtige Schulnachrichten:\n` +
        `${registrationLink}\n\n` +
        `✅ Einfach auf Link klicken\n` +
        `✅ Lehrer-ID eingeben\n` +
        `✅ Namen eingeben\n` +
        `✅ Fertig!`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Zurück', callback_data: 'teacher_management' }],
              [{ text: '🏠 Hauptmenü', callback_data: 'main_menu' }]
            ]
          }
        }
      );

    } catch (error) {
      console.error('❌ Link-Fehler:', error);
      await global.botData.bot.editMessageText(
        `❌ Fehler beim Generieren des Links.\n\nDetails: ${error.message}`,
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Zurück', callback_data: 'teacher_management' }]
            ]
          }
        }
      );
    }
  }
}

module.exports = TeacherManagement;
