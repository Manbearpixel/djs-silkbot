/**
 * The base Cache with internal helper methods and structure for extending storage classes.
 * @class
 * @classdesc Base Cache for extending storage classes.
 */
class Cache {
  constructor(storage) {
    this._store   = storage;
    this._cache   = [];
    this._cacheId = 'DEFAULT'
  }

  toString() {
    return `Cache[id=${this.id};size=${this.size}]`;
  }

  get [Symbol.toStringTag]() {
    return 'Cache';
  }

  /**
   * Property fetchers
   */

  /**
   * The local cache of items
   */
  get cache() {
    return this._cache;
  }

  /**
   * The length of the local cache
   */
  get size() {
    return this._cache.length;
  }
  
  /**
   * The unique identifier of this store
   */
  get id() {
    return this._cacheId;
  }

  /**
   * Returns a `toString` version of a `ref`.
   * Should be overwritten by extending classes to describe their item.
   * 
   * @param {*} ref The item reference
   */
  storedItemToString(ref) {
    return 'default_ref';
  }

  async save() {
    const temp = Cache.deepCloneArr(this._cache);
    console.log(`Saving Storage: ${this._cacheId}`);

    try {
      await this._store.put(this._cacheId, JSON.stringify(temp));
      console.log(`Storage Saved: ${this._cacheId}`);
    } catch (err) {;
      console.log(`ERROR Storage Load [store=${this._cacheId}]`);
      console.log(err);
    }

    return this._cache;
  }

  /**
   * Fetches data from storage with the internal `cacheId`.
   * Reloads internal `cache`.
   * 
   * @returns {array} Local cache of items
   */
  async fetch() {
    this._cache = [];

    console.log(`\nLoading Storage: ${this._cacheId}`);
    try {
      const raw = await this._store.get(this._cacheId);
      const data = JSON.parse(raw);
      for (const item of data) {
        this._cache.push(item);
        // console.log(`-- Loaded item: ${this.storedItemToString(item)}`)
      }
    } catch (err) {;
      console.log(`ERROR Storage Load [store=${this._cacheId}]`);
      console.log(err);
    }

    return this._cache;
  }

  /**
   * Stores a given `item` into the `storage`.
   * Modifies the local `cache`.
   * 
   * @param {*} item The item to save into storage
   */
  async pushToCache(item) {
    const temp = Cache.deepCloneArr(this._cache);

    try {
      temp.push(item);
      await this._store.put(this._cacheId, JSON.stringify(temp));
      console.log(`-- Pushed item: ${this.storedItemToString(item)}`);
      this._cache = temp;
      return this._cache;
    } catch (err) {
      console.log(`ERROR Storage Push [store=${this._cacheId};item=${this.storedItemToString(item)}]`);
      console.log(err);
      return false;
    }
  }

  /**
   * Stores a given `item` into the `storage`.
   * Modifies the local `cache`.
   * 
   * @param {*} item The item to save into storage
   */
  async unshiftToCache(item) {
    const temp = Cache.deepCloneArr(this._cache);

    try {
      temp.splice(0, 0, item);
      await this._store.put(this._cacheId, JSON.stringify(temp));
      console.log(`-- Pushed item: ${this.storedItemToString(item)}`);
      this._cache = temp;
      return this._cache;
    } catch (err) {
      console.log(`ERROR Storage Push [store=${this._cacheId};item=${this.storedItemToString(item)}]`);
      console.log(err);
      return false;
    }
  }

  /**
   * Removes an item at the given `index` from the `storage`.
   * Modifies the local `cache`.
   * 
   * @param {number} index The index at which an item should be removed
   */
  async removeFromCache(index) {
    const temp = Cache.deepCloneArr(this._cache);
    const item = temp[index];

    try {
      temp.splice(index, 1);
      await this._store.put(this._cacheId, JSON.stringify(temp));
      console.log(`-- Removed item: ${this.storedItemToString(item)}`);
      this._cache = temp;
      return this._cache;
    } catch (err) {
      console.log(`ERROR Storage Remove [store=${this._cacheId};item=${this.storedItemToString(item)}]`);
      console.log(err);
      return false;
    }
  }

  /**
   * Static methods
   */

  static deepCloneArr(arr) {
    return JSON.parse(JSON.stringify(arr));
  }
}

module.exports = Cache;
