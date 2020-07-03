# Silkbot Cache

The Silkbot Cache is useful for storing simple information. It is best for storing `strings`, `objects`, or an array of either. The base class `Cache` provides useful methods which are exposed to classes that extend it. These will be called *datastores*.

The Silkbot cache is currently configured and assumes that all Datastores are arrays. It uses LevelDB for local fast databasing. This setup requires ZERO dependency setup configuration aside from the initial `npm install` when setting up this project.

If creating a new Datastore, you'll need to also initialize it within `lib/classes/storage.js` within the `preloadCache()` method. This will prepopulate each Datastore with the stored information.

### Current Datastores
#### Halted
Stores a history of Nasdaq Halts detected. This may be useful for archival purposes, but is primarily used to always have a backup of the latest halted trade to ensure any system reboots won't spam the same trade halt.

#### Subscriber
Stores channels that have subscribed to be notified (receive push messages) of Nasdaq Trade Halts. Each subscription should be unique. A guild can have multiple channels subscribed, and multiple channels can share the same name even if they're within the same guild. The underlying identifier of each channel is used for uniqueness.

### Useful Notes
* If a new helpful method is added to a child of `Cache` consider adding it to the base class so all other children can inherit it!
* Each Datastore has internal *data*.
* Cache Helper methods that modify or save the internal *data* will make a deep clone before the action to ensure the original data does not get corrupted or diverge in the process.

### Cache Helper Methods
##### `storedItemToString(ref)`
Used internally to describe the `ref` item. Should be overwritten by extended classes to best describe the contents.

##### `async save()`
Attempts to save the internal data to the local db. Internal data is fed through `JSON.stringify()` before storing.

##### `async fetch()`
Attempts to retrieve the stored data from the local db. Fetched data is fed to `JSON.parse()` before being set to the internal data and returned.

##### `async pushToCache(item)`
Attempts to push `item` to the end of the local datastore array. Will save changes to local db.

##### `async unshiftToCache(item)`
Attempts to add `item` to the front of the local datastore array. Will save changes to local db.

##### `async removeFromCache(index)`
Attempts to remove an item at `index`. Will save changes to local db.
