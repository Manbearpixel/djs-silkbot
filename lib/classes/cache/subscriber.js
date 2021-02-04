const Cache = require('./cache');

const CACHE_ID = 'subs';

/**
 * A Subscriber storage which will contain information of all subscribed channels.
 * @class
 * @classdesc Storage of Subscribed channels.
 */
class Subscriber extends Cache {
  constructor(storage) {
    super(storage);
    this._cacheId = CACHE_ID;
  }

  toString() {
    return `Subscriber[id=${this.id};size=${this.size}]`;
  }

  get [Symbol.toStringTag]() {
    return 'Subscriber';
  }

  storedItemToString(ref) {
    return `${ref.guild.name}#${ref.channel.name}`;
  }

  isChannelSubscribed(channel) {
    return this._cache.some((sub, idx) => {
      return sub.channel.id === channel.id
    });
  }
  
  channelIndex(channel) {
    return this._cache.findIndex((sub, idx) => {
      return sub.channel.id === channel.id
    });
  }
  
  guildIndex(guild) {
    return this._cache.findIndex((sub, idx) => {
      return sub.guild.id === guild.id
    });
  }

  buildSubscriber(guild, channel) {
    return {
      guild: {
        name: guild.name,
        id: guild.id
      },
      channel: {
        name: channel.name,
        id: channel.id
      }
    }
  }

  async guildSubscriptions(guild) {
    return this._cache.filter((sub, idx) => {
      return sub.guild.id === guild.id
    });
  }

  async removeGuildSubscriptions(guild) {
    const subs = await this.guildSubscriptions(guild);
    for (let idx = 0; idx < subs.length; idx++) {
      const sub = subs[idx];
      await this.removeSubscription(sub.guild, sub.channel);
    }
  }
  
  async createSubscription(guild, channel) {
    if (this.isChannelSubscribed(channel)) throw new Error('subscription_exists');

    await this.pushToCache(this.buildSubscriber(guild, channel));
    return this.save();
  }

  async removeSubscription(guild, channel) {
    if (!this.isChannelSubscribed(channel)) throw new Error('not_found');

    const subIdx = this.channelIndex(channel);
    return await this.removeFromCache(subIdx);
  }
}

module.exports = Subscriber;
