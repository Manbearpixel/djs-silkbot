const Cache = require('./cache');

const CACHE_ID = 'halts';

/**
 * A Halted Trade storage which will contain information of all halted trades.
 * @class
 * @classdesc Storage of Halted Trades.
 */
class Halted extends Cache {
  constructor(storage) {
    super(storage);
    this._cacheId = CACHE_ID;
  }

  toString() {
    return `Halted[id=${this.id};size=${this.size}]`;
  }

  get [Symbol.toStringTag]() {
    return 'Halted';
  }

  get first() {
    return this._cache[0];
  }

  static isMatchingHalted(item, compare) {
    if (item.halted) item = item.halted;
    if (compare.halted) compare = compare.halted;

    if (item.symbol !== compare.symbol) return false;
    return Number(item.timestamp) === Number(compare.timestamp);
  }

  storedItemToString(ref) {
    return `${ref.halted.symbol}@${ref.halted.date}T${ref.halted.time}`;
  }

  findMatchingHalt(haltedTrade) {
    return this._cache.find(item => Halted.isMatchingHalted(haltedTrade, item));
  }
}

module.exports = Halted;
