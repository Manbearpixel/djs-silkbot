module.exports = async function(message) {
  const Silkbot = this;
  const { guild, channel } = message;

  try {
    await Silkbot._store.Subscribed.removeSubscription(guild, channel);
    Silkbot.logInfo(`-- Subscribed Total: ${Silkbot._store.Subscribed.size}`);

    return message.reply('Channel has been unsubscribed');
  } catch (err) {
    Silkbot.logError(err);
    
    if (err.message === 'not_found') return message.reply('This channel has no subscriptions');
    else return message.reply('I fucked up, try again');
  }
}
