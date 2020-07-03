const request = require('request');
const config  = require("../etc/config.json");

const quoteStock = symbol => {
  const _opts = {
    url: `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${config.finnhub_api}`,
    json: true
  };

  return new Promise((resolve, reject) => {
    request(_opts, (err, res, body) => {
      if (err || res.statusCode !== 200) return reject(err ? err.message : `Bad Code: ${res.statusCode}`);
      if (!Object.keys(body).length || !body.c || !body.o || !body.h || !body.l) return reject(`empty_response`);
      
      const quote = {
        last:   Number(body.c.toFixed(2)),
        open:   Number(body.o.toFixed(2)),
        high:   Number(body.h.toFixed(2)),
        low:    Number(body.l.toFixed(2))
      };

      quote['changeOpen'] = ((quote.last - quote.open) / quote.open * 100).toFixed(3) + '%';

      resolve(quote);
    });
  });
}

const patternStock = symbol => {
  const resolution = 'D'; // 1,5,15,30,60,D,W,M
  const url = `https://finnhub.io/api/v1/scan/pattern?resolution=${resolution}&symbol=${symbol}&token=${config.finnhub_api}`;

  const _opts = {
    url,
    json: true
  };

  return new Promise((resolve, reject) => {
    request(_opts, (err, res, body) => {
      if (err || res.statusCode !== 200) return reject(err ? err.message : `Bad Code: ${res.statusCode}`);;

      resolve(body);
    });
  });
}

const keyLevels = symbol => {
  const resolution = 'D'; // 1,5,15,30,60,D,W,M
  const url = `https://finnhub.io/api/v1/scan/support-resistance?resolution=${resolution}&symbol=${symbol}&token=${config.finnhub_api}`;

  const _opts = {
    url,
    json: true,
    timeout: 5 * 1000,
  };

  return new Promise((resolve, reject) => {
    request(_opts, (err, res, body) => {
      if (err || res.statusCode !== 200) return reject(err ? err.message : `Bad Code: ${res.statusCode}`);

      const { levels } = body;
      if (!levels || !levels.length || !Array.isArray(levels)) return resolve([]);
      
      resolve(levels.map(level => {
        return `${level.toFixed(2)}`
      }));
    });
  });
}

module.exports = {
  quoteStock,
  patternStock,
  keyLevels
};
