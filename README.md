# Silkbot
Specialized Discord bot built for a small stock trading community. While the current purpose is to push Nasdaq Trading Halts as they happen during normal market hours, future features and tools can easily be added to the Silkbot platform.

## Use Silkbot Now!
To invite Silkbot to your Discord community, [click here](ttps://discord.com/oauth2/authorize?client_id=723210061479936090&scope=bot&permissions=93248). As of right now, it just needs to be able to read, send, and manage messages. You'll need special permissions on your Discord Server to be able to invite Silkbot to your community.

Once he has joined your server (thanks!) simply say `silk sub` to subscribe the current channel you sent that command on for Nasdaq Trade Halt notifications. To unsubscribe, say `silk unsub`.

### Other Features
#### Fetch Latest Price Details
To fetch the latest trade quotes for a specific stock type `q SYMB` such as `q TSLA`. It will return the price at opening, highest/lowest of the day, current price, and change since open.

## Internal Notes
#### Silkbot Commands
For more information about adding simple commands to Silkbot, head over to the [Silkbot Command README](lib/classes/silkbot/commands).

#### Silkbot Storage
Currently, LevelDB is used as the internal database. A wrapper for this has been created and explained in the [Silkbot Cache README](lib/classes/cache).

## Contribution Notes
Please reach out to myself Pixel on Discord (Pixxl#0007) if you're interested in contributing more tools, or helping with this project.

## Contributing
I enjoy collaboration and welcome your Pull Requests! Not a developer? Feel free to propose changes, new ideas, and even bugs through the [issues portal](https://github.com/manbearpixel/djs-silkbot/issues). I'll review them as they come in and potentially integrated into future updates.

When collaborating, please hit that Star button, and Fork this repo. Then create a new branch on your forked repository with your changes, and submit a PR.

## Copyright
This source code is distributed under a GNU General Public License v3.0. For more details, please see the [LICENSE File](LICENSE).
