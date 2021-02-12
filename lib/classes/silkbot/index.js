const moment = require('moment');

const {
  generateHaltedEmbed, isWeekday, newYorkMoment, isMarketOpen, generateMathProblem, emojiAnswer
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

    this._client.on('ready', async () =>      this.onReady());
    this._client.on('guildCreate',            this.onGuildCreate.bind(this));
    this._client.on('guildDelete', async g => this.onGuildDelete(g));
    this._client.on('disconnect',             this.onDisconnect);
    this._client.on('error',                  this.onError);

    this._client.on('messageReactionAdd', async (r, u) =>     this.messageReactionAdd(r, u));
    this._client.on('messageReactionRemove', async (r, u) =>  this.messageReactionRemove(r, u));

    this._client.on('message', async m => this.checkMessageCommands(m));
    this._client.on('message', async m => this.askingForQuote(m));
    // this._client.on('message', async m => this.debugDiscordMessage(m)); //debug
    // this._client.on('message', async m => this.monitorPostedEmbed(m));
    // this._client.on('message', async m => this.monitorMoons(m));
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
  };

  debugDiscordMessage(message) {
    const { author, channel, content = ''} = message;

    const { prefix }  = settings;
    const args        = content.slice(prefix.length).trim().split(/ +/g);
    const command     = args.shift().toLowerCase();
    const guild       = message.guild ? message.guild : {};

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
    });
  };
  
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

    // preload silkbot messages in each guild
    const channelMessages = [];
    this._client.guilds.cache.forEach(g => {
      g.channels.cache.forEach(c => {
        if (c.type != 'text') return;
        if (!c.viewable) return;
        if (!/role/ig.test(c.name)) return;
        channelMessages.push(c.messages.fetch({ limit: 5 }));
      });
    });

    const silkbotPosts = await channelMessages.reduce((postsPromise, channelPosts) => {
      return postsPromise.then(async (posts) => {
        try {
          const filtered = (await channelPosts)
            .filter(m => m.author.id == this._client.user.id)
            .map(m => `${m.mentions.roles ? m.mentions.roles.first() : ''}::${m.content}`);
          posts.push(filtered);
          return Promise.resolve(posts.flat());
        } catch (err) {
          this.logError('Failed fetching posts from a channel');
        }
      })
    }, Promise.resolve([]));

    this.logInfo(`Loaded ${silkbotPosts.length} messages.`);

    // expire verification messages
    this._store.Verifications.cache.forEach(async v => {
      try {
        const userGuild   = await this._client.guilds.cache.get(v.guild.id);
        const guildMember = await userGuild.members.cache.get(v.member.id);
        const dmChannel   = await guildMember.createDM();
        const dmMessages  = await dmChannel.messages.fetch();
        this.logInfo(`Expiring verifications for ${v.guild.name}#${v.member.name}`);
        dmMessages.forEach(async m => await this.expireVerificationMessage(dmChannel, m, v.guild));
      } catch (err) {
        this.logError(`Failed expiring verifications for ${v.guild.name}#${v.member.name}. Error ${err.message}`);
      }
    });

    // setup market halt watcher
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
      const func = Commands[command.toLowerCase()];
      return (func.constructor.name === 'AsyncFunction')
        ? await func.call(this, [message, args.join(' ')])
        : func.call(this, [message, args.join(' ')]);
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

  async messageReactionRemove(reaction, user) {
    const { emoji, message } = reaction;
    const { mentions, guild } = message;

    if (user.bot) return;
    if (!message.author.bot) return;
    if (message.author.id !== this._client.user.id) return;

    const mentionedRole = mentions.roles.first();
    if (!mentionedRole) {
      this.logError(`Could not find role in Silkbot post.`);
      return;
    }

    this.logInfo(`event@messageReactionRemove\n
      Emoji:    ${emoji.name}
      Role:     ${mentionedRole.name}
      Guild:    ${guild.name}
      Channel:  ${message.channel.name}
      User:     ${user.username}
    `);

    // const testMember = await guild.members.fetch('404456926836031488');
    // const member = guild.member(testMember.user);
    const member = await guild.members.fetch(user.id);
    if (!member) {
      this.logError(`Could not find member in Guild.`);
      return;
    }

    // ignore reaction removal for bouncer protocol
    if (/bouncer/ig.test(message.content)) return;

    try {
      const memberHasRole = member.roles.cache.some(r => r.id == mentionedRole.id);
      if (memberHasRole) {
        await member.roles.remove(mentionedRole);
        const dm = await member.createDM();
        dm.send(`You have been removed from the role "${mentionedRole.name}" within the guild "${guild.name}".`);
        this.logInfo(`Removed ${member.user.username} from role "${mentionedRole.name}"`);
      }
    } catch (err) {
      this.logError(`Failed removing user from role!\n
      User:   ${member.user.username} (${member.displayName})
      Role:   ${mentionedRole.name}
      Error:  ${err.message}

      Manageable? ${member.manageable}
      Roles? ${member.roles.cache.map(r => r.name).join(', ')}
      `);

      const dm = await member.createDM();
      dm.send(`We were unable to remove you from the role "${mentionedRole.name}" within the guild "${guild.name}" at this time. Please try again later.`);
    }
  };

  async expireVerificationMessage(channel, message, guild = {}) {
    if (message.author.id !== this._client.user.id) return false;
    if (!/guild verification/ig.test(message.content)) return false;
    await message.delete();
    await channel.send(`Verification attempt **expired** for Guild: ${guild.name}.`);
    return true;
  };

  async successfulVerificationMessage(channel, message, guild = {}) {
    if (message.author.id !== this._client.user.id) return false;
    if (!/guild verification/ig.test(message.content)) return false;
    await message.delete();
    await channel.send(`Verification **completed** for Guild: ${guild.name}.`);
    return true;
  };

  async invalidVerificationMessage(channel, message, guild = {}) {
    if (message.author.id !== this._client.user.id) return false;
    if (!/guild verification/ig.test(message.content)) return false;
    await message.delete();
    await channel.send(`Verification attempt **failed** for Guild: ${guild.name}.`);
    return true;
  };

  async bouncerReaction(reaction, guildMember) {
    const { message } = reaction;
    const { mentions, guild } = message;
    const mentionedRole = mentions.roles.first();
    const memberHasRole = guildMember.roles.cache.some(r => r.id == mentionedRole.id);

    this.logInfo(`event@bouncerReaction\n
      Role:     ${mentionedRole.name}
      Has Role? ${memberHasRole}
      Guild:    ${guild.name}
      User:     ${guildMember.user.username}
    `);

    const dmChannel = await guildMember.createDM();
    if (memberHasRole) {
      await dmChannel.send(`Verification for ${guild.name} **not required**. You are already verified in that server.`);
      return;
    }

    if (!this._store.Verifications.isMemberPendingVerification(guild, guildMember)) {
      await this._store.Verifications.createVerification(guild, mentionedRole, guildMember);
    }

    const vIdx = this._store.Verifications.verificationIndex(guild, guildMember);
    const verificationRef = this._store.Verifications.getItemRef(vIdx);
    // verificationRef.meta.totalAttempts = 0;

    // expire previous attempt
    const dmMessages  = await dmChannel.messages.fetch();
    await dmMessages.reduce((previous, message) => {
      return previous.then(p => this.expireVerificationMessage(dmChannel, message, verificationRef.guild))
    }, Promise.resolve([]));

    // validate totalAttempts and lastAttempt time
    if (verificationRef.meta.totalAttempts < 3) {
      verificationRef.meta.totalAttempts++;
      verificationRef.meta.lastAttempt = Date.now();
      verificationRef.meta.answer = -1;
      await this._store.Verifications.save();
    } else {
      const minsSinceAttempt = moment().diff(moment(verificationRef.meta.lastAttempt), 'minute');
      if (minsSinceAttempt >= 30) {
        verificationRef.meta.totalAttempts = 1;
        verificationRef.meta.lastAttempt = Date.now();
        verificationRef.meta.answer = -1;
        await this._store.Verifications.save();
      } else {
        await dmChannel.send(`MAX ATTEMPTS REACHED.\nYou've reached max verification attempts for ${verificationRef.guild.name}. Please wait ${30-minsSinceAttempt} minutes until you can try again.`)
        return;
      }
    }

    const generateMessage = (guild, verif) => `GUILD VERIFICATION\nGuild: ${guild.name}\nPlease react with the correct answer to the following Math Problem:\n\n\`${verif.n1} ${verif.arithmetic} ${verif.n2} = ?\`\n\n`;
    
    try {
      const consensus = generateMathProblem();
      verificationRef.meta.answer = consensus.answer;
      await this._store.Verifications.save();
      const vMessage = await dmChannel.send(generateMessage(guild, consensus));
      await '0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣'.split(' ')
        .reduce((previous, emoji) => previous.then(() => vMessage.react(emoji)), Promise.resolve([]));
    } catch (err) {
      this.logError(`GUILD VERIFICATION CREATION ...
      User:         ${verificationRef.member.name}
      Guild:        ${verificationRef.guild.name}
      Attempts:     ${verificationRef.meta.totalAttempts}
      Last Attempt: ${moment(verificationRef.meta.lastAttempt).format('YYYY-MM-DD HH:mm')}
      Error:        ${err.message}`);
    }
  };

  async messageReactionAdd(reaction, user) {
    const { emoji, message } = reaction;
    const { mentions, guild } = message;

    if (user.bot) return;
    if (!message.author.bot) return;
    if (message.author.id !== this._client.user.id) return;
    if (message.channel.type === 'dm') {
      if (/guild verification/ig.test(message.content)) {
        const record      = this._store.Verifications.memberVerifications(user)[0];
        const dmChannel   = await user.createDM();
        const dmMessages  = await dmChannel.messages.fetch();

        try {
          const userAnswer = emojiAnswer(emoji.name);
          await this._store.Verifications.validateVerification(user, userAnswer);

          const realGuild   = await this._client.guilds.fetch(record.guild.id);
          const guildMember = await realGuild.members.fetch(record.member.id);
          const guildRole   = await realGuild.roles.fetch(record.role.id);
          await guildMember.roles.add(guildRole);

          // validate previous attempt
          await dmMessages.reduce((previous, m) => {
            return previous.then(p => this.successfulVerificationMessage(dmChannel, m, record.guild))
          }, Promise.resolve([]));
        } catch (err) {
          this.logError(`GUILD VERIFICATION VALIDATION ...
          User:         ${user.username}
          Guild:        ${record.guild.name}
          Attempts:     ${record.meta.totalAttempts}
          Last Attempt: ${moment(record.meta.lastAttempt).format('YYYY-MM-DD HH:mm')}
          Error:        ${err.message}`);

          // expire previous attempt
          await dmMessages.reduce((previous, m) => {
            return previous.then(p => this.invalidVerificationMessage(dmChannel, m, record.guild))
          }, Promise.resolve([]));
        }
        return;
      }
    }

    const mentionedRole = mentions.roles.first();
    if (!mentionedRole) {
      this.logError(`Could not find role in Silkbot post.`);
      return;
    }

    this.logInfo(`event@messageReactionAdd\n
      Emoji:    ${emoji.name}
      Role:     ${mentionedRole.name}
      Guild:    ${guild.name}
      Channel:  ${message.channel.name}
      User:     ${user.username}
    `);

    // const testMember = await guild.members.fetch('404456926836031488');
    // const member = guild.member(testMember.user);
    const member = await guild.members.fetch(user.id);
    if (!member) {
      this.logError(`Could not find member in Guild.`);
      return;
    }

    if (/bouncer/ig.test(message.content)) {
      try { await this.bouncerReaction(reaction, member); }
      catch (err) { this.logError(`Unable to handle bouncer reaction ... ${err.message}`); }
      return;
    }

    try {
      const memberHasRole = member.roles.cache.some(r => r.id == mentionedRole.id);
      if (memberHasRole) {
        const dm = await member.createDM();
        dm.send(`You aready have the role "${mentionedRole.name}" within the guild "${guild.name}".`);
        this.logInfo(`Did not add ${member.user.username} to "${mentionedRole.name}"`);
      } else {
        await member.roles.add(mentionedRole);
        const dm = await member.createDM();
        dm.send(`You have been assigned the role "${mentionedRole.name}" within the guild "${guild.name}".`);
        this.logInfo(`Added ${member.user.username} to role "${mentionedRole.name}"`);
      }
    } catch (err) {
      this.logError(`Failed adding user to role!\n
      User:   ${member.user.username} (${member.displayName})
      Role:   ${mentionedRole.name}
      Error:  ${err.message}

      Manageable? ${member.manageable}
      Roles? ${member.roles.cache.map(r => r.name).join(', ')}
      `);

      const dm = await member.createDM();
      dm.send(`We were unable to assign you to the role "${mentionedRole.name}" within the guild "${guild.name}" at this time. Please try again later.`);
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
  async onGuildDelete(guild) {
    this.logInfo(`Bot [BOOTED FROM GUILD]\n
    Name:    ${guild.name} (id: ${guild.id})\n`);
    await this._store.Subscribed.removeGuildSubscriptions(guild);
    this.logInfo('Removed Guild Subscriptions');
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
