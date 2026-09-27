import mongoose from 'mongoose';

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/eduverse';
const ATLAS_URI = 'mongodb+srv://23it040_db_user:q2zUTOiG8a8Konpp@cluster0.mxbtbyz.mongodb.net/eduverse?retryWrites=true&w=majority&appName=Cluster0';

async function migrate() {
  console.log('====================================================');
  console.log('  EDUVERSE DATABASE MIGRATION TO MONGODB ATLAS');
  console.log('====================================================');

  console.log(`Connecting to Local MongoDB: ${LOCAL_URI}...`);
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('✓ Connected to Local MongoDB successfully.');

  console.log(`Connecting to MongoDB Atlas Cluster: cluster0.mxbtbyz.mongodb.net...`);
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log('✓ Connected to MongoDB Atlas successfully.\n');

  const localDb = localConn.db;
  const atlasDb = atlasConn.db;

  if (!localDb || !atlasDb) {
    throw new Error('Database handle missing on connection.');
  }

  // List all collections in local database
  const collections = await localDb.listCollections().toArray();
  console.log(`Found ${collections.length} collections in local database:\n`);

  let totalMigratedDocs = 0;

  for (const collInfo of collections) {
    const collName = collInfo.name;
    // Skip system collections
    if (collName.startsWith('system.')) continue;

    const localColl = localDb.collection(collName);
    const atlasColl = atlasDb.collection(collName);

    const docCount = await localColl.countDocuments();
    process.stdout.write(`  Migrating [${collName}] (${docCount} docs)... `);

    if (docCount === 0) {
      console.log('Skipped (0 documents).');
      continue;
    }

    // Drop existing collection on Atlas to ensure clean migration
    try {
      await atlasColl.drop();
    } catch (e: any) {
      // Ignore namespace doesn't exist error
    }

    // Batch insert documents
    const batchSize = 500;
    const cursor = localColl.find({});
    let batch: any[] = [];
    let collMigrated = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      batch.push(doc);
      if (batch.length >= batchSize) {
        await atlasColl.insertMany(batch);
        collMigrated += batch.length;
        batch = [];
      }
    }
    if (batch.length > 0) {
      await atlasColl.insertMany(batch);
      collMigrated += batch.length;
    }

    // Copy indexes
    try {
      const indexes = await localColl.indexes();
      for (const idx of indexes) {
        if (idx.name === '_id_') continue;
        const keys = idx.key;
        const options: any = { name: idx.name };
        if (idx.unique) options.unique = true;
        if (idx.sparse) options.sparse = true;
        await atlasColl.createIndex(keys, options);
      }
    } catch (idxErr: any) {
      // non-fatal index warning
    }

    totalMigratedDocs += collMigrated;
    console.log(`✓ DONE (${collMigrated} copied)`);
  }

  console.log('\n====================================================');
  console.log(`✓ Migration Complete! Total documents migrated: ${totalMigratedDocs}`);
  console.log('====================================================\n');

  // Verification step
  console.log('Verification on Atlas:');
  const atlasCollections = await atlasDb.listCollections().toArray();
  for (const c of atlasCollections) {
    const count = await atlasDb.collection(c.name).countDocuments();
    console.log(`  - ${c.name.padEnd(25)} : ${count} docs`);
  }

  await localConn.close();
  await atlasConn.close();
  console.log('\nAll database connections closed.');
}

migrate().catch((err) => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
