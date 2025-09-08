import mongoose from "mongoose";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: "./.env" });

const DB_NAME = "iabtm";

const testConnection = async () => {
    try {
        console.log('🧪 Testing MongoDB connection...');
        console.log('📡 MONGODB_URL:', process.env.MONGODB_URL ? 'Present' : 'Missing');
        
        if (!process.env.MONGODB_URL) {
            console.error('❌ MONGODB_URL is not defined in environment variables');
            return;
        }

        // Build connection string
        let connectionString;
        
        if (process.env.MONGODB_URL.includes('mongodb+srv://')) {
            // MongoDB Atlas connection
            if (process.env.MONGODB_URL.includes('?')) {
                connectionString = `${process.env.MONGODB_URL}/${DB_NAME}`;
            } else {
                connectionString = `${process.env.MONGODB_URL}/${DB_NAME}?retryWrites=true&w=majority`;
            }
        } else {
            // Local MongoDB connection
            connectionString = `${process.env.MONGODB_URL}/${DB_NAME}`;
        }

        console.log('🔗 Connection string (sanitized):', connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

        // Test connection with different timeouts
        const connectionOptions = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 30000,
            retryWrites: true,
            w: 'majority',
            family: 4,
            bufferCommands: false,
            bufferMaxEntries: 0
        };

        console.log('⏱️ Attempting connection with 30s timeout...');
        
        const connectionInstance = await mongoose.connect(connectionString, connectionOptions);
        
        console.log('✅ MongoDB connected successfully!');
        console.log(`📊 Host: ${connectionInstance.connection.host}`);
        console.log(`📊 Database: ${connectionInstance.connection.name}`);
        console.log(`📊 Port: ${connectionInstance.connection.port}`);
        
        // Test a simple operation
        const collections = await connectionInstance.connection.db.listCollections().toArray();
        console.log(`📋 Collections found: ${collections.length}`);
        
        // Close connection
        await mongoose.connection.close();
        console.log('🔌 Connection closed successfully');
        
    } catch (error) {
        console.error('❌ MongoDB connection test failed:', error.message);
        
        // Provide specific troubleshooting tips
        if (error.message.includes('Server selection timed out')) {
            console.log('\n🔧 Troubleshooting tips for timeout:');
            console.log('1. Check if your IP is whitelisted in MongoDB Atlas');
            console.log('2. Verify your username and password are correct');
            console.log('3. Check if the cluster is running');
            console.log('4. Try connecting from MongoDB Compass to test');
        } else if (error.message.includes('Authentication failed')) {
            console.log('\n🔧 Troubleshooting tips for authentication:');
            console.log('1. Verify your username and password');
            console.log('2. Check if the user has proper permissions');
            console.log('3. Ensure the user exists in the database');
        } else if (error.message.includes('ENOTFOUND')) {
            console.log('\n🔧 Troubleshooting tips for DNS resolution:');
            console.log('1. Check your internet connection');
            console.log('2. Verify the cluster URL is correct');
            console.log('3. Try pinging the cluster hostname');
        }
        
        process.exit(1);
    }
};

// Run the test
testConnection(); 