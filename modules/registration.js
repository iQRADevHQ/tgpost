// ========================================
// REGISTRIERUNG - modules/registration.js
// ========================================

const config = require('../config');
const { db } = require('../database/database');

class Registration {
  static async handleRegistrationStart(chatId, userId, username) {
    try {
      console.log(`🎓 Registrierung für User ${userId} (${username})`);

      // Bereits registriert?
      const existingTeacher = await db.getTeacher('user_id', userId.toString());
      
      if (existingTeacher) {
        await global.botData.bot.sendMessage(chatId, 
          `✅ Bereits registriert!\n\n` +
          `Name: ${existingTeacher.name}\n` +
          `Nummer: ${existingTeacher.teacher_id.replace('ID_', '')}\n` +
          `Seit: ${new Date(existingTeacher.registered_at).toLocaleDateString('de-DE')}\n\n` +
          `Du erhältst bereits alle Nachrichten!`
        );
        return;
      }

      // Neue Registrierung
      await global.botData.bot.sendMessage(chatId, 
        `🎓 LEHRER-REGISTRIERUNG\n\n` +
        `Schritt 1 von 2:\n` +
        `Bitte gib deine Lehrer-Nummer ein.\n\n` +
        `Nur die Zahl eingeben:\n` +
        `• 34 ✅\n` +
        `• 12 ✅\n` +
        `• 156 ✅\n\n` +
        `NICHT eingeben:\n` +
        `• ID_34 ❌\n` +
        `• Lehrer 34 ❌\n\n` +
        `Abbrechen mit: /cancel`
      );

      global.botData.awaitingInput.set(userId, { 
        type: 'teacher_registration', 
        step: 1, 
        username: username 
      });

    } catch (error) {
      console.error('❌ Registrierungsfehler:', error);
      await global.botData.bot.sendMessage(chatId, 
        `❌ Registrierungsfehler\n\n` +
        `Ein technischer Fehler ist aufgetreten.\n` +
        `Bitte versuche es später erneut.\n\n` +
        `User-ID für Admins: ${userId}`
      );
    }
  }

  static async handleRegistrationInput(chatId, userId, text, username, inputData) {
    
    // SCHRITT 1: Lehrer-Nummer
    if (inputData.step === 1) {
      if (text.toLowerCase() === '/cancel') {
        global.botData.awaitingInput.delete(userId);
        await global.botData.bot.sendMessage(chatId, 
          `❌ Registrierung abgebrochen\n\n` +
          `Du kannst jederzeit erneut registrieren.`
        );
        return;
      }

      const cleanInput = text.trim();
      
      if (!/^\d+$/.test(cleanInput)) {
        await global.botData.bot.sendMessage(chatId, 
          `❌ Ungültige Eingabe!\n\n` +
          `Bitte nur eine Zahl eingeben.\n\n` +
          `Beispiele: 34, 12, 156\n\n` +
          `Erneut versuchen oder /cancel:`
        );
        return;
      }

      const teacherId = `ID_${cleanInput}`;
      
      // Prüfe Duplikat
      try {
        const existingTeacher = await db.getTeacher('teacher_id', teacherId);
        
        if (existingTeacher) {
          await global.botData.bot.sendMessage(chatId, 
            `⚠️ Nummer bereits vergeben!\n\n` +
            `Nummer ${cleanInput} ist registriert für:\n` +
            `${existingTeacher.name}\n\n` +
            `Andere Nummer eingeben oder /cancel:`
          );
          return;
        }
      } catch (dbError) {
        console.error('❌ DB-Fehler:', dbError);
        await global.botData.bot.sendMessage(chatId, 
          `❌ Datenbankfehler\n\nBitte erneut versuchen.`
        );
        return;
      }

      // Weiter zu Schritt 2
      inputData.teacher_id = teacherId;
      inputData.teacher_number = cleanInput;
      inputData.step = 2;
      global.botData.awaitingInput.set(userId, inputData);

      await global.botData.bot.sendMessage(chatId, 
        `✅ Nummer akzeptiert: ${cleanInput}\n\n` +
        `Schritt 2 von 2:\n` +
        `Bitte gib deinen Namen ein.\n\n` +
        `Beispiele:\n` +
        `• U. Abdurrahman\n` +
        `• Frau Schmidt\n` +
        `• Ahmed Mustafa\n\n` +
        `Abbrechen: /cancel`
      );
    }
    
    // SCHRITT 2: Name
    else if (inputData.step === 2) {
      if (text.toLowerCase() === '/cancel') {
        global.botData.awaitingInput.delete(userId);
        await global.botData.bot.sendMessage(chatId, 
          `❌ Registrierung abgebrochen`
        );
        return;
      }

      const teacherName = text.trim();
      
      if (teacherName.length < config.LIMITS.TEACHER_NAME_MIN_LENGTH || 
          teacherName.length > config.LIMITS.TEACHER_NAME_MAX_LENGTH) {
        await global.botData.bot.sendMessage(chatId, 
          `❌ Name ungültig!\n\n` +
          `Länge: ${config.LIMITS.TEACHER_NAME_MIN_LENGTH}-${config.LIMITS.TEACHER_NAME_MAX_LENGTH} Zeichen\n` +
          `Deine Eingabe: ${teacherName.length} Zeichen\n\n` +
          `Erneut eingeben:`
        );
        return;
      }

      // Speichern
      try {
        await db.addTeacher(userId, username, inputData.teacher_id, teacherName);

        await global.botData.bot.sendMessage(chatId, 
          `🎉 REGISTRIERUNG ERFOLGREICH!\n\n` +
          `Name: ${teacherName}\n` +
          `Nummer: ${inputData.teacher_number}\n` +
          `Lehrer-ID: ${inputData.teacher_id}\n` +
          `Username: ${username ? '@' + username : 'Nicht gesetzt'}\n\n` +
          `Du erhältst ab sofort alle wichtigen Nachrichten!\n\n` +
          `✅ Aktiviere Benachrichtigungen für diesen Chat.`
        );

        global.botData.awaitingInput.delete(userId);

        // Admins benachrichtigen
        await this.notifyAdmins(userId, teacherName, inputData.teacher_id, username);

      } catch (error) {
        console.error('❌ Speicher-Fehler:', error);
        
        let errorMsg = `❌ Registrierung fehlgeschlagen!\n\n`;
        
        if (error.message.includes('UNIQUE constraint failed')) {
          errorMsg += `Du bist bereits registriert.\nVerwende /start um zu prüfen.`;
        } else {
          errorMsg += `Technischer Fehler.\nBitte an Admins wenden.\nUser-ID: ${userId}`;
        }
        
        await global.botData.bot.sendMessage(chatId, errorMsg);
        global.botData.awaitingInput.delete(userId);
      }
    }
  }

  static async notifyAdmins(userId, teacherName, teacherId, username) {
    try {
      for (const adminId of config.UR_SUPER_ADMINS) {
        if (adminId !== userId.toString()) {
          await global.botData.bot.sendMessage(adminId, 
            `🎓 Neue Lehrer-Registrierung\n\n` +
            `Name: ${teacherName}\n` +
            `Lehrer-ID: ${teacherId}\n` +
            `Username: ${username ? '@' + username : 'Kein Username'}\n` +
            `User-ID: ${userId}\n` +
            `Zeit: ${new Date().toLocaleString('de-DE')}`
          );
        }
      }
    } catch (error) {
      console.error('❌ Admin-Benachrichtigung fehlgeschlagen:', error);
    }
  }
}

module.exports = Registration;
