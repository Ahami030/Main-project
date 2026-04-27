import mongoose from "mongoose";

const cached: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } = 
  global as any;

export const connectMongoDB = async () => {
  if (cached.conn) return cached.conn; // ✅ ใช้ connection เดิม

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI!).then((m) => {
      console.log("Connected to MongoDB"); // จะขึ้นแค่ครั้งเดียว
      return m;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};