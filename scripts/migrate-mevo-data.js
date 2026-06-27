/**
 * Copy mevo_chat database from source cluster to target cluster.
 *
 * Usage:
 *   node scripts/migrate-mevo-data.js "<TARGET_MONGODB_URI>"
 *
 * Source URI is read from MONGODB_URI in .env (current/old cluster).
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');

const COLLECTIONS = ['users', 'conversations', 'messages', 'calllogs'];

const sourceUri = process.env.MONGODB_URI;
const targetUri = process.argv[2] || process.env.TARGET_MONGODB_URI;

if (!sourceUri) {
  console.error('Missing MONGODB_URI in .env');
  process.exit(1);
}

if (!targetUri) {
  console.error('Usage: node scripts/migrate-mevo-data.js "<TARGET_MONGODB_URI>"');
  process.exit(1);
}

const maskUri = (uri) => uri.replace(/:([^:@/]+)@/, ':***@');

const migrate = async () => {
  console.log('Source:', maskUri(sourceUri));
  console.log('Target:', maskUri(targetUri));

  const sourceConn = mongoose.createConnection(sourceUri);
  const targetConn = mongoose.createConnection(targetUri);

  await Promise.all([
    sourceConn.asPromise(),
    targetConn.asPromise(),
  ]);

  console.log('Connected to both clusters.\n');

  for (const name of COLLECTIONS) {
    const sourceCol = sourceConn.db.collection(name);
    const targetCol = targetConn.db.collection(name);

    const docs = await sourceCol.find({}).toArray();
    await targetCol.deleteMany({});

    if (docs.length === 0) {
      console.log(`  ${name}: 0 documents (skipped)`);
      continue;
    }

    await targetCol.insertMany(docs, { ordered: false });
    console.log(`  ${name}: ${docs.length} documents copied`);
  }

  await sourceConn.close();
  await targetConn.close();

  console.log('\nMigration complete.');
};

migrate().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
