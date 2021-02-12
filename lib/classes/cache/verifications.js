const Cache = require('./cache');

const CACHE_ID = 'verifications';

/**
 * A Verification storage which will contain information of all pending verifications.
 * @class
 * @classdesc Storage of pending verifications.
 */
class Verification extends Cache {
  constructor(storage) {
    super(storage);
    this._cacheId = CACHE_ID;
  }

  toString() {
    return `Verification[id=${this.id};size=${this.size}]`;
  }

  get [Symbol.toStringTag]() {
    return 'Verification';
  }

  storedItemToString(ref) {
    return `${ref.guild.name}#${ref.member.name}`;
  }

  isMemberPendingVerification(guild, member) {
    return this._cache.some(ver => {
      return  ( ver.guild.id === guild.id || ver.guild.name === guild.name ) &&
              ver.member.id === member.id
    });
  }

  memberVerifications(member) {
    return this._cache.filter(ver => {
      return ver.member.id === member.id;
    });
  }

  verificationIndex(guild, member) {
    return this._cache.findIndex(ver => {
      return  ( ver.guild.id === guild.id || ver.guild.name === guild.name ) &&
              ver.member.id === member.id
    });
  }

  fetchVerification(guild, member) {
    return this._cache.find(ver => {
      return  ( ver.guild.id === guild.id || ver.guild.name === guild.name ) &&
              ver.member.id === member.id
    });
  }

  async validateVerification(member, answer) {
    if (!this.memberVerifications(member)) throw new Error('no_pending_verifications');

    const validated = this.memberVerifications(member).find(ver => Number(ver.meta.answer) === Number(answer));
    if (!validated) throw new Error('invalid_answer');

    await this.removeVerification(validated.guild, member);
    return true;
  }

  buildVerification(guild, role, member, meta = {}) {
    const { lastAttempt = Date.now(), totalAttempts = 0, answer = -1 } = meta;
    return {
      guild: {
        name: guild.name,
        id: guild.id
      },
      role: {
        name: role.name,
        id: role.id
      },
      member: {
        name: member.user.username,
        id: member.id
      },
      meta: {
        lastAttempt,
        totalAttempts,
        answer
      }
    }
  }
  
  async createVerification(guild, role, member) {
    if (this.isMemberPendingVerification(guild, member)) throw new Error('verification_pending');

    return await this.pushToCache(this.buildVerification(guild, role, member));
  }

  async removeVerification(guild, member) {
    if (!this.isMemberPendingVerification(guild, member)) throw new Error('verification_not_found');

    const verIdx = this.verificationIndex(guild, member);
    return await this.removeFromCache(verIdx);
  }
}

module.exports = Verification;
