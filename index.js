/* Libraries */
const Discord = require("discord.js");

const {
  LogInfo,
  LogError,
  LogDebug
} = require('./lib/helpers');

/**
 * Internal classes
 */
const Silkbot     = require('./lib/classes/silkbot');
const Storage     = require('./lib/classes/storage');

/**
 * Config and settings
 */
const config      = require('./etc/config.json');
const intents     = new Discord.Intents();
intents.add('GUILD_PRESENCES', 'GUILD_MEMBERS');

/**
 * Primary services
 */
const client      = new Discord.Client();
const LocalStore  = new Storage();
const Silky       = new Silkbot(client, config, LocalStore);

/**
 * Initialize Silkbot
 */
(async function() {
  await LocalStore.preloadCache();
  await Silky.init();
  await Silky.login();
})()
  .then()
  .catch(err => {
    LogError('Unable to start Silkbot')
    LogError(err);
    process.exit(1)
  });
