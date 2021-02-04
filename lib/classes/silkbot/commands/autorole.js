/** @function
 * @name Autorole
 * @example <caption>Usage of Autorole</caption>
 * silk autorole Some message here including <RoleMention>
 * 
 * @param {*} args [Message, rawMessageContent]
 */
module.exports = async function(args) {
  const Silkbot = this;
  const message = args.shift();
  const { guild, channel } = message;
  const role = message.mentions.roles.first();

  try {
    await message.delete();
    const roleMessage = await message.channel.send(args.join(' '));
    await roleMessage.react('👍');
    Silkbot.logInfo(`Setup Autorole for [${guild.name}#${channel.name}
      Role:     ${role.name}
      Message:  ${message.content}
    `);
  } catch (err) {
    Silkbot.logError(`Unable to setup autorole.
      Guild:    ${guild.name}
      Channel:  ${channel.name}
      Role:     ${role.name}
      Error:    ${err.message}
    `);
  }
}
