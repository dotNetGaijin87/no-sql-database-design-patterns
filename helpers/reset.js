// ---------------------------------------------------------------------------
// reset.js — tear the onlinestore database back down to empty
// ---------------------------------------------------------------------------
// Run this to drop every collection (data + indexes + the _migrations log) so
// you can re-apply the sequence from src/000 again. (To wipe the Docker data
// volume entirely instead, use `docker compose down -v`.)
// ---------------------------------------------------------------------------

db = db.getSiblingDB('onlinestore');

// dropDatabase() removes all collections and their indexes in one shot. For a
// small teaching database this is exactly what we want; on a real system you
// would never drop a whole database to "reset" it.
const before = db.getCollectionNames();
db.dropDatabase();

print('reset — dropped onlinestore (' + before.length + ' collections: ' +
      before.join(', ') + ')');
