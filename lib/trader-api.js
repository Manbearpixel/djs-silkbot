const Request = require('request');

const Halted = require('./classes/halted');
const {
  asyncParseString
} = require('./helpers');
const {
  quoteStock,
  // patternStock,
  keyLevels
} = require('./finnhub');

/**
 * Fetches, parses, and returns the latest 5 halted trades available
 */
const FetchLatestHalts = () => {
  const url = 'http://www.nasdaqtrader.com/rss.aspx?feed=tradehalts';
  const _opts = {
    url,
    method:         'GET',
    timeout:        10 * 1000,
    followRedirect: true
  };

  return new Promise((resolve, reject) => {

    Request(_opts, async (err, res, body) => {
      if (err || res.statusCode !== 200) return reject(err ? err.message : `Bad Code: ${res.statusCode}`);

      const { rss }   = await asyncParseString(body);
      const channel   = rss.channel.shift();
      const published = channel.pubDate;
      const items     = channel.item;

      return resolve(items.slice(0, 5).map(item => new Halted(item)));
    });
  });
}

const detailedHalt = async (halted) => {
  let quote = null;
  try {
    quote = await quoteStock(halted.symbol);
  } catch (err) {
    console.log(`-- Failed fetching quote for ${halted.symbol}`);
  }

  let levels = null;
  try {
    levels = await keyLevels(halted.symbol);
  } catch (err) {
    console.log(`-- Failed fetching levels for ${halted.symbol}`);
  }

  resolve({
    halted,
    quote,
    levels
  });
}

const FetchLatestHalt = previousHaltedItem => {
  const url = 'http://www.nasdaqtrader.com/rss.aspx?feed=tradehalts';
  const _opts = {
    url,
    method:         'GET',
    timeout:        10 * 1000,
    followRedirect: true
  };

  return new Promise((resolve, reject) => {

    Request(_opts, async (err, res, body) => {
      if (err || res.statusCode !== 200) return reject(err ? err.message : `Bad Code: ${res.statusCode}`);

      const { rss } = await asyncParseString(body);
      const channel   = rss.channel.shift();
      const published = channel.pubDate;
      const items     = channel.item;
      const latest    = new Halted(items.shift());

      if (previousHaltedItem && 
          previousHaltedItem.halted.symbol === latest.symbol &&
          Number(previousHaltedItem.halted.timestamp) >= Number(latest.timestamp)) {
        return reject('no_change');
      }

      if (latest.resumeOn === '' || !latest.resumeOn) {
        latest.resumeOn = '---'
        // return reject('resume_not_available');
      }

      let quote = null;
      try {
        quote = await quoteStock(latest.symbol);
        // console.log('got quote');
        // console.dir(quote);
      } catch (err) {
        console.log(`-- Failed fetching quote for ${latest.symbol}`);
      }

      let levels = null;
      try {
        levels = await keyLevels(latest.symbol);
        // console.log('got levels');
        // console.dir(levels);
      } catch (err) {
        console.log(`-- Failed fetching levels for ${latest.symbol}`);
      }

      resolve({
        halted: latest,
        quote,
        levels
      });
    });
  });
};

module.exports = {
  FetchLatestHalt,
  FetchLatestHalts
}
