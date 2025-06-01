// ========================================
// KONFIGURATION - config.js
// ========================================

module.exports = {
  // Bot-Konfiguration
  BOT_TOKEN: '7362146858:AAHsvtIlSg-lgsaLegGNphrJWhEYWL0bAY4',
  CHANNEL_ID: '-1002540350107', // Ihr Kanal
  
  // Ur-Super-Admins (fest im Code)
  UR_SUPER_ADMINS: ['5079710300', '600764777'],
  
  // Datenbank
  DATABASE: {
    filename: './teacher_bot.db'
  },
  
  // Berechtigungen
  PERMISSIONS: {
    UR_SUPER_ADMIN: 'ur-super-admin',
    SUPER_ADMIN: 'super-admin',
    ADMIN: 'admin',
    TEACHER: 'teacher',
    NONE: 'none'
  },
  
  // Limits
  LIMITS: {
    TEACHER_NAME_MIN_LENGTH: 2,
    TEACHER_NAME_MAX_LENGTH: 50,
    MESSAGE_MAX_LENGTH: 4000
  },
  
  // Validierung
  VALIDATION: {
    TEACHER_ID_PATTERN: /^ID_\d+$/,
    USER_ID_PATTERN: /^\d+$/
  }
};
