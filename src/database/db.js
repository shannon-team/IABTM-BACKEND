import mongoose from "mongoose"
import { DB_NAME } from "../../constants.js"

const connectDB = async () => {
    try {
        // Check if MONGODB_URL is provided
        if (!process.env.MONGODB_URL) {
            console.error("MONGODB_URL is not defined in environment variables");
            console.log("Please create a .env file with MONGODB_URL=mongodb://localhost:27017");
            return false; // Don't exit, just return false
        }

        // Build connection string with better options
        let connectionString;
        
        if (process.env.MONGODB_URL.includes('mongodb+srv://')) {
            // MongoDB Atlas connection
            if (process.env.MONGODB_URL.includes('?')) {
                // URL already has query parameters
                connectionString = `${process.env.MONGODB_URL}/${DB_NAME}`;
            } else {
                // URL doesn't have query parameters, add them
                connectionString = `${process.env.MONGODB_URL}/${DB_NAME}?retryWrites=true&w=majority&maxPoolSize=5&serverSelectionTimeoutMS=30000&socketTimeoutMS=30000&connectTimeoutMS=30000&family=4`;
            }
        } else {
            // Local MongoDB connection
            connectionString = `${process.env.MONGODB_URL}/${DB_NAME}`;
        }

        console.log("🔌 Attempting to connect to MongoDB...");
        console.log("📡 Connection string (sanitized):", connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
        
        // Optimized connection configuration for 10,000+ concurrent users
        const connectionInstance = await mongoose.connect(connectionString, {
            maxPoolSize: 50,           // Increased for high concurrency
            minPoolSize: 10,           // Maintain minimum connections
            maxIdleTimeMS: 30000,      // 30 seconds
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            retryWrites: true,
            w: 'majority',
            family: 4, // Force IPv4
            heartbeatFrequencyMS: 10000,
            readPreference: 'primaryPreferred',
            readConcern: { level: 'majority' },
            // Buffer commands for better performance
            bufferCommands: true
        });

        console.log(`✅ MongoDB connected successfully on ${connectionInstance.connection.host}`);
        console.log(`📊 Database: ${DB_NAME}`);
        
        // Handle connection events with better error handling
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err.message);
            // Don't exit the process, let it try to reconnect
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected - attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB reconnected successfully');
        });

        mongoose.connection.on('close', () => {
            console.log('🔒 MongoDB connection closed');
        });

        // Add graceful shutdown handling
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('🔒 MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                console.error('Error closing MongoDB connection:', err);
                process.exit(1);
            }
        });

        return true; // Connection successful
    } catch (error) {
        console.error("❌ MongoDB connection error:", error.message);
        console.log("🔧 Please check your MONGODB_URL in .env file");
        console.log("💡 For local MongoDB: MONGODB_URL=mongodb://localhost:27017");
        console.log("💡 For MongoDB Atlas: MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net");
        
        // Don't exit immediately, let the application handle the error
        // Set up automatic reconnection
        setTimeout(() => {
            console.log("🔄 Attempting to reconnect to MongoDB...");
            connectDB();
        }, 5000); // Retry after 5 seconds
        
        return false; // Connection failed
    }
}

export default connectDB 