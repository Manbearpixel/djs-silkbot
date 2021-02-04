module.exports = async function(args) {
  const Silkbot = this;
  const message = args.shift();
  const { guild, channel } = message;

  try {
    Silkbot.logInfo(`-- `);
    console.log(args);
    console.log(message.content);
    const roleMessage = await message.channel.send(args.join(' '));
    await roleMessage.react('👍');
  
    return;
  } catch (err) {
    Silkbot.logError(err);
    
    // if (err.message === 'subscription_exists') return message.reply('This channel already is subscribed');
    // else return message.reply('I fucked up, try again');
  }
}
