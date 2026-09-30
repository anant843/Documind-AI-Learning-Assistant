import mongoose from "mongoose";

let mongoServer = null;

const connectDB = async () => {
    if (process.env.MONGO_URI) {
        try {
            const conn = await mongoose.connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 2500,
                connectTimeoutMS: 2500,
            });
            console.log(`MongoDB connected: ${conn.connection.host}`);
            return;
        } catch (error) {
            console.warn(`Could not connect to configured MONGO_URI: ${error.message}`);
            console.warn("Falling back to local in-memory MongoDB server...");
        }
    } else {
        console.log("No MONGO_URI provided in .env. Initializing local in-memory MongoDB...");
    }

    try {
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB connected (in-memory): ${conn.connection.host}`);
        console.log("Tip: Add a valid MONGO_URI in backend/.env to persist data across server restarts.");
    } catch (error) {
        console.error(`Error connecting to in-memory MongoDB: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;