const haltCodes = require('../../etc/halt_codes.json');
const { haltedMoment } = require('../helpers');

class Halted {
  constructor(doc) {
    this.date       = Halted.parseItem(doc['ndaq:HaltDate']);
    this.time       = Halted.parseItem(doc['ndaq:HaltTime']);
    this.symbol     = Halted.parseItem(doc['ndaq:IssueSymbol']);
    this.name       = Halted.parseItem(doc['ndaq:IssueName']);
    this.market     = Halted.parseItem(doc['ndaq:Market']);
    this.reasonCode = Halted.parseItem(doc['ndaq:ReasonCode']);
    this.reasonText = Halted.parseHaltCode(doc['ndaq:ReasonCode']);
    this.haltedOn   = Halted.parseItem(doc['ndaq:ResumptionQuoteTime']);
    this.resumeOn   = Halted.parseItem(doc['ndaq:ResumptionTradeTime']);
    this.moment     = haltedMoment(this.date, this.time);
    this.timestamp  = this.moment.format('X');
  }

  toString() {
    return `Halted[symbol=${this.symbol}]`;
  }

  get [Symbol.toStringTag]() {
    return 'Halted';
  }

  static parseItem(item) {
    if (Array.isArray(item)) {
      let content = [].concat(item).shift();
      return content;
    }
  
    return item;
  }

  static parseHaltCode(item) {
    item = Halted.parseItem(item);
    const idx = Object.keys(haltCodes)
      .find((code) => code.toLowerCase() === `${item}`.toLowerCase());
    
    return idx ? haltCodes[idx] : 'N/A'; 
  }
}

module.exports = Halted;
