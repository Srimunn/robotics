import { MongoClient, Db } from "mongodb";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://itsmesrimun_db_user:1OhNDRTA7o3LoHE0@robodb.xjbfo6v.mongodb.net/?appName=robodb";

const DB_NAME = "robodb";

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

export async function getMongoDb(): Promise<Db | null> {
  if (dbInstance) return dbInstance;

  try {
    if (!client) {
      client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      await client.connect();
    }
    dbInstance = client.db(DB_NAME);
    console.log(`Connected to MongoDB Atlas: ${DB_NAME}`);
    return dbInstance;
  } catch (err) {
    console.warn("MongoDB Atlas connection deferred, using client-side local sync:", err);
    return null;
  }
}

export async function syncCollectionToMongo<T extends { id: string }>(
  collectionName: string,
  items: T[]
): Promise<boolean> {
  try {
    const db = await getMongoDb();
    if (!db) return false;

    const collection = db.collection(collectionName);
    if (items.length === 0) {
      await collection.deleteMany({});
      return true;
    }

    // Upsert items into MongoDB collection
    const operations = items.map((item) => ({
      updateOne: {
        filter: { id: item.id },
        update: { $set: { ...item, updatedAt: new Date().toISOString() } },
        upsert: true,
      },
    }));

    await collection.bulkWrite(operations);
    return true;
  } catch (err) {
    console.warn(`Failed to sync collection ${collectionName} to MongoDB:`, err);
    return false;
  }
}

export async function clearMongoCollection(collectionName: string): Promise<boolean> {
  try {
    const db = await getMongoDb();
    if (!db) return false;
    await db.collection(collectionName).deleteMany({});
    return true;
  } catch (err) {
    console.warn(`Failed to clear MongoDB collection ${collectionName}:`, err);
    return false;
  }
}
