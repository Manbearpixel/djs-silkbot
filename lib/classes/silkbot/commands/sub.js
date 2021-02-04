module.exports = async function(args) {
  const Silkbot = this;
  const message = args.shift();
  const { guild, channel } = message;

  try {
    await Silkbot._store.Subscribed.createSubscription(guild, channel);
    Silkbot.logInfo(`-- Subscribed Total: ${Silkbot._store.Subscribed.size}`);

    return message.reply('Channel has been subscribed');
  } catch (err) {
    Silkbot.logError(err);
    
    if (err.message === 'subscription_exists') return message.reply('This channel already is subscribed');
    else return message.reply('I fucked up, try again');
  }
}
