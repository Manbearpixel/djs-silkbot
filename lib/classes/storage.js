const Level = require('level');
const Subscriber = require('./cache/subscriber');
const Halted = require('./cache/halted');
const Verifications = require('./cache/verifications');

class Storage {
  constructor() {
    this._store = Level('cache');
    this.subscribed     = new Subscriber(this._store);
    this.halted         = new Halted(this._store);
    this.verifications  = new Verifications(this._store);
  }

  get Subscribed() {
    return this.subscribed;
  }

  get HaltedTrades() {
    return this.halted;
  }

  get Verifications() {
    return this.verifications;
  }

  toString() {
    return `Storage[subscribed=${this.Subscribed.size};halted=${this.HaltedTrades.size};verifications=${this.Verifications.size}]`;
  }

  get [Symbol.toStringTag]() {
    return 'Storage';
  }

  /**
   * Preloads the local cache of each storage container
   */
  async preloadCache() {
    await this.subscribed.fetch();
    await this.halted.fetch();
    await this.verifications.fetch();
    return true;
  }
}

module.exports = Storage;
