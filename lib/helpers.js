const xml2js = require('xml2js');
const Discord = require("discord.js");
const momentjs = require('moment-timezone');

const PoweredBy = ['BRRRRRRRRRRRRRRRRR', 'r/wallstreetbets', 'YOUR AD HERE', 'Viagra', 'users like you', 'bees?', 'Obama', 'trades like you', 'JPOW', 'ASS', '"china"', 'Trump', 'The White House', 'dOnAlD tRuMp', 'millennials', 'the INTERNET', 'COVID-19', 'DOW', 'Elon Musk', 'YOUR MOM', 'Disney', 'Netflix', 'Amazon', "Batman's guilty pleasure", 'consumerism', 'consumerists', 'idiots', 'a bigger blacker dick', 'steve', 'COFFEE', 'Starbucks', 'late night shopping', 'lube', '💰💰💰', '💸💸💸', 'Bitcoin', 'Dogecoin'];

const TZ_NY = 'America/New_York';

const asyncParseString = content => {
  return new Promise((resolve, reject) => {
    xml2js.parseString(content, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  })
}

const regexWords = (wordlist) => new RegExp(wordlist.join('|'), 'ig');

const getPoweredBy = () => PoweredBy[Math.floor(Math.random() * PoweredBy.length)];

const generateHaltedEmbed = (halted, quote, levels) => {
  const support   = levels && quote ? levels.filter((val) => Number(val) < Number(quote.last)) : [];
  const resist    = levels && quote ? levels.filter((val) => Number(val) > Number(quote.last)) : [];

  const supportDesc = support.length ? `Support Levels:\n${support.join(', ')}\n` : '';
  const resistDesc  = resist.length ? `Resist Levels:\n${resist.join(', ')}\n` : '';

  const tradeWindow = `**HALTED @${halted.haltedOn}**\n**RESUME @${halted.resumeOn}**`;
  const linkToStock = `[View on Robinhood »](https://robinhood.com/stocks/${halted.symbol})`;

  const description = `${tradeWindow}\n--- --- ---\n${supportDesc}\n${resistDesc}\n${linkToStock}`;

  return new Discord.MessageEmbed()
    .setColor('#ff4242')
    .setTitle(`HALT - ${halted.reasonText}`)
    .setAuthor(`(${halted.symbol}) - ${halted.name.slice(0, 20)}`)
    .setDescription(description)
    .addFields(
      { name: 'Price', value: `$${quote ? quote.last : '$--.--'}`, inline: true },
      { name: 'Open', value: `$${quote ? quote.open : '$--.--'}`, inline: true },
      { name: 'Change', value: `${quote ? quote.changeOpen : '$--.--'}`, inline: true },
      // { name: '\u200B', value: '\u200B' },
      { name: 'Low', value: `$${quote ? quote.low : '$--.--'}`, inline: true },
      { name: 'High', value: `$${quote ? quote.high : '$--.--'}`, inline: true },
      { name: '\u200B', value: '\u200B', inline: true }
    )
    .setFooter(`powered by ${getPoweredBy()}`);
    // .setThumbnail('https://i.imgur.com/wSTFkRM.png')
    // .addField('Inline field title', 'Some value here', true)
    // .setImage('https://i.imgur.com/wSTFkRM.png')
    // .setTimestamp()
    // .setURL('https://discord.js.org/')
    // .setAuthor(`${halted.name} (${halted.symbol})`, 'https://i.imgur.com/wSTFkRM.png', 'https://discord.js.org')
    // .setFooter('Some footer text here', 'https://i.imgur.com/wSTFkRM.png');
}

const LogObj = (level, obj) => console.log(`[${level}]`, obj);

const LogInfo = (message) => {
  if (typeof message === 'object') return LogObj('INFO', message);
  console.log(`[INFO] ${message}`);
}

const LogError = (message) => {
  if (message.stack) {
    const errMsg = `${message.message}\n  ~>  ${message.stack.split('\n')[1]}`;
    return LogError(errMsg);
  }

  if (typeof message === 'object') return LogObject('ERROR', message);
  console.log(`@Silkbot ~ [ERROR] ${message}`);
}

const LogDebug = message => {
  if (typeof message === 'object') return LogObj('DEBUG', message);
  console.log(`[DEBUG] ${message}`);
}

const isWeekday = moment => {
  try {
    return moment.day() > 0 && moment.day() < 6;
  } catch (err) {
    return false;
  }
}

const isMarketOpen = moment => {
  try {
    if (!moment.tz()) moment.tz(TZ_NY);
    return moment.hour() >= 9 && moment.hour() <= 16;
  } catch (err) {
    return false;
  }
}

const isExtendedMarketOpen = moment => {
  try {
    if (!moment.tz()) moment.tz(TZ_NY);
    return  (moment.hour() >= 4 && moment.hour() <= 9) ||
            (moment.hour() >= 16 && moment.hour() <= 20);
  } catch (err) {
    return false;
  }
}

const newYorkMoment = moment => {
  if (!moment) moment = momentjs();
  return moment.tz(TZ_NY);
}

const haltedMoment = (date, time) => {
  return newYorkMoment(momentjs(`${date} ${time} `, 'MM/DD/YYYY hh:mm:ss'));
}

module.exports = {
  asyncParseString,
  regexWords,
  getPoweredBy,
  generateHaltedEmbed,
  isWeekday,
  isMarketOpen,
  isExtendedMarketOpen,
  haltedMoment,
  newYorkMoment,
  LogInfo,
  LogError,
  LogDebug
};
