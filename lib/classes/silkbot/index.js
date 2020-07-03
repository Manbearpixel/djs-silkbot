const moment = require('moment');

const {
  generateHaltedEmbed, isWeekday, newYorkMoment, isMarketOpen
} = require('../../helpers');

const {
  FetchLatestHalt, FetchLatestHalts
} = require('../../trader-api');

const {
  quoteStock
} = require('../../finnhub');

const Commands = require('./commands');
const settings = require('../../../etc/settings.json');

const BotInviteLink = 'https://discord.com/oauth2/authorize?client_id=CLIENT_ID&scope=bot&permissions=PERMISSIONS';

class Silkbot {
  /**
   * Silkbot does things
   * 
   * @param {*} client Discord client
   * @param {*} config JSON Config
   * @param {*} storage Storage with containers
   */
  constructor(client, config, storage) {
    this._client  = client;
    this._config  = config;
    this._store   = storage;

    this.lastHaltedItem = null;
    this.refreshHaltedDelay = (10 * 1000);

    this._client.on('ready', async () =>    this.onReady());
    this._client.on('guildCreate',          this.onGuildCreate);
    this._client.on('guildDelete',          this.onGuildDelete.bind(this));
    this._client.on('disconnect',           this.onDisconnect);
    this._client.on('error',                this.onError);

    this._client.on('message', async m => this.checkMessageCommands(m));
    this._client.on('message', async m => this.askingForQuote(m));
    // this._client.on('message', async m => this.monitorPostedEmbed(m));
    this._client.on('message', async m => this.monitorMoons(m));
  }

  toString() {
    return `Silkbot[discord=${this._client.user.tag}]`;
  }

  get [Symbol.toStringTag]() {
    return 'Silkbot';
  }

  get inviteLink() {
    return BotInviteLink
      .replace('CLIENT_ID', this._config.client_id)
      .replace('PERMISSIONS', this._config.permissions);
  }

  static createActivity(status) {
    return {
      activity: {
        name: status,
        type: 'WATCHING'
      }
    }
  }

  logObject(level, obj) {
    console.log(`@Silkbot ~ [${level}]`, obj);
  }

  logError(message) {
    if (message.stack) {
      const errMsg = `${message.message}\n  ~>  ${message.stack.split('\n')[1]}`;
      return this.logError(errMsg);
    }
  
    if (typeof message === 'object') return this.logObject('ERROR', message);
    console.log(`@Silkbot ~ [ERROR] ${message}`);
  }

  logInfo(message) {
    if (typeof message === 'object') return logObject('INFO', message);
    console.log(`@Silkbot ~ [INFO] ${message}`);
  }
  
  logDebug(message) {
    if (typeof message === 'object') return this.logObject('DEBUG', message);
    console.log(`@Silkbot ~ [DEBUG] ${message}`);
  }

  async init() {
    this.lastHaltedItem = this._store.HaltedTrades.first || null;
    return true;
  }

  /**
   * Sets the full presence of the client user
   * type: PLAYING, STREAMING, LISTENING, WATCHING, CUSTOM_STATUS
   * @param {*} status 
   */
  async setPresence(status) {
    try {
      await this._client.user.setPresence(
        Silkbot.createActivity(status)
      );
      this.logInfo('Presence updated');
      return true;
    } catch (err) {
      this.logError(err);
      return false;
    }
  }

  /**
   * Sets the status of the client user. (online, idle, invisible, dnd)
   * @param {*} status 
   */
  async setStatus(status) {
    try {
      await this._client.user.setStatus('online');
      this.logInfo('Status updated');
      return true;
    } catch (err) {
      this.logError(err);
      return false;
    }
  }

  /**
   * Changing usernames in Discord is heavily rate limited, with only 2 requests every hour. Use this sparingly!
   * @param {*} nickname 
   */
  async setUsername(nickname) {
    try {
      await this._client.user.setUsername(nickname);
      this.logInfo('Username updated');
      return true;
    } catch (err) {
      this.logError(err);
      return false;
    }
  };

  /**
   * Creates a session with Discord
   */
  async login() {
    try {
      await this._client.login(this._config.token);
      this.logInfo('Session created');
      return true;
    } catch (err) {
      this.logError(err);
      return false;
    }
  }

  debugDiscordMessage(message) {
    const { author, guild, channel, content = ''} = message;

    const { prefix }  = settings;
    const args        = message.content.slice(prefix.length).trim().split(/ +/g);
    const command     = args.shift().toLowerCase();

    this.logDebug({
      bot:      author.bot,
      user:     author.username,
      userId:   author.id,

      guild:    guild.name,
      members:  guild.memberCount,

      channel:    channel.name,
      channelId:  channel.id,
      
      message: content,
      cleaned: message.cleanContent,
      command
      // args
    });
  }

  async fetchMarketHalts() {
    this.logInfo('Fetching market halts');

    const latestHalts = await FetchLatestHalts();
    for (let halted of latestHalts) {
      const haltedTradeRef = this._store.HaltedTrades.findMatchingHalt(halted);
      if (!haltedTradeRef) continue;
      // haltedTradeRef.halted.reasonCode = 'ELSE';
    }

    await this._store.HaltedTrades.save();

    try {

      const latestHalt = await FetchLatestHalt(this.lastHaltedItem);
      this.logInfo('Latest trade halt pulled');
      this.logDebug(latestHalt);

      await this._store.HaltedTrades.unshiftToCache(latestHalt);

      this.lastHaltedItem = latestHalt;
      const { halted, quote, levels } = latestHalt;
      
      const pushErrors = [];
      for (let sub of this._store.Subscribed.cache) {
        const channel = await this._client.channels.fetch(sub.channel.id, true)
        this.logInfo(`-- Pushing notice to ${channel.guild.name}#${channel.name}`);
        
        try {
          const embededMsg = generateHaltedEmbed(halted, quote, levels);
          const pushedMsg = this._client.channels.cache.get(sub.channel.id).send(embededMsg);
        } catch (err) {
          const e = `Failed pushing halt to: ${sub.guild.name}#${sub.channel.name}. Error: (${err.message ? err.message : ''})`;
          pushErrors.push(e);
          this.logError(`${sub.guild.name}#${sub.channel.name}`);
          this.logError(err);
          this.lastHaltedItem = null;
        }
      }

      if (pushErrors.length) {
        this.logError(`-- Errors:\n\t- ${pushErrors.join('\n\t- ')}`);
      }

      return true;
    } catch (err) {
      this.logError('Failed fetching market halts');
      this.logError(err);
      return false;
    }
  }
  
  // This event will run if the bot starts, and logs in, successfully.
  async onReady() {
    const guildList = this._client.guilds.cache.map(guild => guild.name);
    const subscriberList = this._store.Subscribed.cache.map(sub => `${sub.guild.name}#${sub.channel.name}`);
    const latestHaltDesc = this.lastHaltedItem
      ? this._store.HaltedTrades.storedItemToString(this.lastHaltedItem)
      : '';

    this.logInfo(`event@onReady\n
    Logged in as:   ${this._client.user.tag}
    Monitoring:     (${this._client.guilds.cache.size}) Guilds 
        -> ${guildList.join('\n\t-> ')}

    Latest Halt:
        -> ${latestHaltDesc || 'N/A'}
      
    Subscribed:     (${this._store.Subscribed.size}) Channels 
        -> ${subscriberList.join('\n\t-> ')}\n`);

    await this.setPresence('The Markets');
    this.logInfo(`Bot invite link: ${this.inviteLink}\n`);

    this._client.setInterval(async () => {
      const now = newYorkMoment();
      if (!isWeekday(now)) return;
      if (!isMarketOpen(now)) return;

      this.logInfo(`Ping [HALTED] – ${now.format('YYYY-MM-DD hh:mm')}`);
      const fetchSuccess = await this.fetchMarketHalts();

      if (fetchSuccess) return this.logInfo('Halted Trade Updated');
      return this.logError('No Halted Trade');
    }, this.refreshHaltedDelay);
  };

  // Runs on every message (DM or TextChannel)
  // usecase: <prefix> <command> <arg1> <arg2...>
  async checkMessageCommands(message) {
    const { author, content = ''} = message;

    if (author.bot || !content || !content.length) return;

    // this.debugDiscordMessage(message);

    // ignore messages not starting with prefix
    const { prefix } = settings;
    const prefixRegex = new RegExp(prefix, 'ig');
    if (content.search(prefixRegex) !== 0) return;
    
    const args    = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (Commands.hasOwnProperty(command.toLowerCase())) {
      args.unshift(message);
      const func = Commands[command.toLowerCase()];
      return (func.constructor.name === 'AsyncFunction')
        ? await func.apply(this, args)
        : func.apply(this, args);
    }

    this.logInfo(`Unmapped command!
      Command: ${command}
      Args: ${args}\n`);
  }

  // Runs on every message (DM or TextChannel)
  // usecase: q SYMB
  async askingForQuote(message) {
    const { author, content = ''} = message;

    if (author.bot || !content.length) return;

    // ensure user is wanting to get a price quote
    if (content.search(/q\W/ig) !== 0) return;

    const stock = content.slice(1).trim().toUpperCase();

    try {
      const quote = await quoteStock(stock);
      this.logInfo(`-- got quote for ${stock}\n`);
      await message.react('👍');
      
      const reply = await message.reply(`Latest quotes for \`${stock}\` ...\nOpen: \`$${quote.open}\`, Latest: \`$${quote.last}\`, Low: \`$${quote.low}\`, High: \`$${quote.high}\`\nChange since open: \`${quote.changeOpen}\``);
      
      if (parseFloat(quote.changeOpen) > 0 ) reply.react('📈');
      else if (parseFloat(quote.changeOpen) < 0 ) reply.react('📉');
    } catch (err) {
      this.logInfo(`-- CAUGHT quote error for $${stock} ...\n${err.message ? err.message : err}`);
      await message.react('👎');
    }
  };

  // Runs on every message (DM or TextChannel)
  // usecase: current bot posts embeded message
  async monitorPostedEmbed(message) {
    const { author, guild, channel, content = ''} = message;

    // ignore other bot messages
    if (author.bot && !author.equals(client.user)) return;
    // test out embeded message editing
    // if (message.embeds.length) {
    //   const prevEmbed = message.embeds[0];
    //   const newEmbed = new Discord.MessageEmbed(prevEmbed);
    //   const mid = message.id;

    //   setTimeout(() => {
    //     newEmbed.setTitle('New title!');
    //     newEmbed.setDescription('Something else!');
    //     // message.edit(newEmbed);
    //     // console.log('pushed edit!')

    //     message.channel.messages.fetch(mid)
    //       .then((foundMsg) => {
    //         foundMsg.edit(newEmbed)
    //         console.log('pushed edit!')
    //       }).catch(console.log)
    //   }, 5000)
    // }
    return;
  }

  // Runs on every message (DM or TextChannel)
  // usecase: stonk gonna mooooooon
  async monitorMoons(message) {
    const { author, content = ''} = message;
    if (author.bot || !content.length) return;

    if (content.search(/mo{4,}n/ig) >= 0) {
      await message.react('🐄');
      await message.react('🇲');
      await message.react('🇴');
      await message.react('🅾️');
      return;
    }
  }

  // This event triggers when the bot joins a guild.
  onGuildCreate(guild) {
    this.logInfo(`Bot [JOINED GUILD]\n
    Name:    ${guild.name} (id: ${guild.id})
    Members: ${guild.memberCount}\n`);
  }

  // this event triggers when the bot is removed from a guild.
  onGuildDelete(guild) {
    this.logInfo(`Bot [BOOTED FROM GUILD]\n
    Name:    ${guild.name} (id: ${guild.id})\n`);
  }

  onDisconnect(e) {
    const reason  = (e.reason) ? e.reason : e;
    const code    = (e.code) ? e.code : 'xxx';
  
    this.logInfo(`Disconnect\n
    Reason:   ${reason}
    Code:     ${code}\n`);
  }

  onError(e) {
    this.logError(e);
  }
}

module.exports = Silkbot;
