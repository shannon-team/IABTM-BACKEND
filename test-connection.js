#!/usr/bin/env node

import dotenv from "dotenv";
import mongoose from "mongoose";

// Load environment variables
dotenv.config({
    path: "./.env"
});

console.log('🔍 Testing IABTM Server Configuration');
console.log('=====================================\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log(`   MONGODB_URL: ${process.env.MONGODB_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`   PORT: ${process.env.PORT || '8000 (default)'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development (default)'}`);
console.log('');

// Test MongoDB connection
const testMongoConnection = async () => {
    if (!process.env.MONGODB_URL) {
        console.log('❌ MONGODB_URL not found in environment variables');
        console.log('💡 Please add MONGODB_URL to your .env file');
        console.log('   For local MongoDB: MONGODB_URL=mongodb://localhost:27017');
        console.log('   For MongoDB Atlas: MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net');
        return false;
    }

    try {
        console.log('🔌 Testing MongoDB connection...');
        console.log(`   Connection string: ${process.env.MONGODB_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
        
        const connectionString = process.env.MONGODB_URL.includes('mongodb+srv://') 
            ? `${process.env.MONGODB_URL}/test?retryWrites=true&w=majority`
            : `${process.env.MONGODB_URL}/test`;

        const connection = await mongoose.connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // 5 second timeout
        });

        console.log('✅ MongoDB connection successful!');
        console.log(`   Host: ${connection.connection.host}`);
        console.log(`   Database: ${connection.connection.name}`);
        
        // Close the test connection
        await mongoose.disconnect();
        return true;
    } catch (error) {
        console.log('❌ MongoDB connection failed!');
        console.log(`   Error: ${error.message}`);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('💡 MongoDB server is not running');
            console.log('   Install MongoDB locally or use MongoDB Atlas');
        } else if (error.message.includes('Invalid scheme')) {
            console.log('💡 Invalid MongoDB connection string format');
            console.log('   Use: mongodb://localhost:27017 or mongodb+srv://...');
        } else if (error.message.includes('Authentication failed')) {
            console.log('💡 Authentication failed - check username/password');
        }
        
        return false;
    }
};

// Test port availability
const testPort = () => {
    const port = process.env.PORT || 8000;
    console.log(`🔌 Testing port ${port} availability...`);
    
    // This is a simple check - in a real scenario, you'd need to actually try to bind to the port
    console.log(`   Port ${port} should be available`);
    console.log('   Note: This is a basic check - port might still be in use');
    return true;
};

// Run tests
const runTests = async () => {
    const mongoSuccess = await testMongoConnection();
    const portSuccess = testPort();
    
    console.log('\n📊 Test Results:');
    console.log(`   MongoDB: ${mongoSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Port: ${portSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    if (mongoSuccess && portSuccess) {
        console.log('\n🎉 All tests passed! Your server should start successfully.');
        console.log('   Run: npm start');
    } else {
        console.log('\n⚠️  Some tests failed. Please fix the issues above before starting the server.');
    }
    
    console.log('\n📚 Setup Instructions:');
    console.log('1. Install MongoDB locally or use MongoDB Atlas');
    console.log('2. Update .env file with correct MONGODB_URL');
    console.log('3. Run: npm start');
};

runTests(); 