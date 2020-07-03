# Silkbot Commands

The Silkbot Commands are individualized commands which can be abstracted into separate js files. This allows for better organization and componentization of the codebase.

Every new command should exist as a `.js` file within this directory (`lib/classes/silkbot/commands/`) and added to the `index.js` to be imported and exported.

With this setup, no other adjustments are needed in the primary `Silkbot` class. Though if required, a command can access the underlying `Silkbot` object via `this` reference.

Each command's exported function will be sent the [Discord Message](https://discord.js.org/#/docs/main/stable/class/Message) object along with any arguments. Each string after the `command` is counted as an `argument`.

### Example Command

##### Incoming Mesage:
```
silk multiply 2 2
```

##### `commands/multiply.js`
```
module.exports = function(message, num, multiplier) {
  const output = Number(num) * Number(multiplier);
  return message.reply(`${num}x${multiplier} = ${output}`);
}
```

##### `commands/index.js`
```
const multiply = require('./multiply.js');
...
module.exports = {
    multiply,
    ...
}
```
