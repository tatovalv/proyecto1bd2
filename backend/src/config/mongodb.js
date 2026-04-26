import mongoose from "mongoose";

export function getMongoStatus() {
  return mongoose.connection.readyState === 1 ? "connected" : "disconnected";
}

/**
 * @returns {Promise<typeof mongoose | null>}
 */
export async function connectMongo() {
  const uri = (process.env.MONGODB_URI || "").trim();
  if (!uri) return null;
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  return mongoose;
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect().catch(() => {});
}
