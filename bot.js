// ========================================
// HAUPT-BOT DATEI - bot.js
// ========================================

const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { initializeDatabase } = require('./database/database');
const messageHandler = require('./handlers/messageHandler');
const callbackHandler = require('./handlers/callbackHandler');

// Bot initialisieren
const bot = new TelegramBot(config.BOT_TOKEN, {
  polling: {
    interval: 2000,
    autoStart: true,
    params: {
      timeout: 5,
      limit: 1,
      allowed_updates: ['message', 'callback_query']
    }
  }
});

// Globale Bot-Daten
global.botData = {
  bot: bot,
  db: null,
  awaitingInput: new Map(),
  pendingMessages: new Map()
};

// Duplikat-Schutz
const processedMessages = new Set();
const processedCallbacks = new Set();

setInterval(() => {
  processedMessages.clear();
  processedCallbacks.clear();
}, 30000);

// Message Handler mit Duplikat-Schutz
bot.on('message', async (msg) => {
  const messageKey = `${msg.message_id}_${msg.chat.id}_${msg.date}`;
  
  if (processedMessages.has(messageKey)) {
    return;
  }
  
  processedMessages.add(messageKey);
  
  try {
    await messageHandler(msg);
  } catch (error) {
    console.error('❌ Message Handler Error:', error);
  }
});

// Callback Handler mit Duplikat-Schutz
bot.on('callback_query', async (query) => {
  const callbackKey = `${query.id}_${query.data}`;
  
  if (processedCallbacks.has(callbackKey)) {
    return;
  }
  
  processedCallbacks.add(callbackKey);
  
  try {
    await callbackHandler(query);
  } catch (error) {
    console.error('❌ Callback Handler Error:', error);
  }
});

// Bot starten
async function startBot() {
  try {
    console.log('🚀 Neuer Modularer Teacher Bot startet...');
    
    // Datenbank initialisieren
    global.botData.db = await initializeDatabase();
    console.log('✅ Datenbank verbunden');
    
    // Bot-Info
    const me = await bot.getMe();
    console.log('✅ Bot verbunden:', me.first_name, `(@${me.username})`);
    console.log('🔗 Registrierungs-Link:', `https://t.me/${me.username}?start=register`);
    
    console.log('🎉 Bot erfolgreich gestartet!');
    console.log('📋 Verwende /menu für das Hauptmenü');
    
  } catch (error) {
    console.error('❌ Fehler beim Starten:', error);
    process.exit(1);
  }
}

// Error Handling
bot.on('polling_error', (error) => {
  console.error('❌ Polling Error:', error.message);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Bot wird gestoppt...');
  await bot.stopPolling();
  if (global.botData.db) {
    await global.botData.db.close();
  }
  process.exit(0);
});

// Bot starten
startBot();
