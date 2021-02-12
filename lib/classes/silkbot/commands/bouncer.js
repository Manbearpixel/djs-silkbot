/** @function
 * @name Bouncer
 * @example <caption>Usage of Bouncer</caption>
 * silk bouncer <RoleMention>
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
    const channelMessage = `This Discord community is protected by a bouncer.\nIn order to join the conversation, you must first verify you're a person. React to this message and I'll send you a DM with a question you'll have to answer.\n\nIf you're successful, you'll be assigned to <@&${role.id}>. If you fail three times you'll have to wait a little while before trying again. To retry, you'll have to remove your reaction and react again.`;
    const broadcast = await message.channel.send(channelMessage);
    await broadcast.react('👋');
    Silkbot.logInfo(`Setup Bouncer for [${guild.name}]
      Role:     ${role.name}
      Message:  ${message.content}
    `);
  } catch (err) {
    Silkbot.logError(`Unable to setup bouncer.
      Guild:    ${guild.name}
      Channel:  ${channel.name}
      Role:     ${role.name}
      Error:    ${err.message}
    `);
  }
}
