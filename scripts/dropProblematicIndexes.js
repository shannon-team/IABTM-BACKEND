#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const dropProblematicIndexes = async () => {
    try {
        console.log('🔧 Dropping problematic indexes...');
        
        // Connect to MongoDB
        const connectionString = process.env.MONGODB_URL || 'mongodb://localhost:27017';
        const dbName = 'iabtm';
        
        let fullConnectionString;
        if (connectionString.includes('mongodb+srv://')) {
            fullConnectionString = connectionString.includes('?') 
                ? `${connectionString}/${dbName}`
                : `${connectionString}/${dbName}?retryWrites=true&w=majority`;
        } else {
            fullConnectionString = `${connectionString}/${dbName}`;
        }
        
        await mongoose.connect(fullConnectionString, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000
        });
        
        console.log('✅ Connected to MongoDB');
        
        const db = mongoose.connection.db;
        
        // Drop problematic geospatial indexes
        try {
            await db.collection('messages').dropIndex('metadata.location_2dsphere');
            console.log('✅ Dropped messages geospatial index');
        } catch (error) {
            console.log('⚠️ Messages geospatial index not found or already dropped');
        }
        
        try {
            await db.collection('audiorooms').dropIndex('metadata.location_2dsphere');
            console.log('✅ Dropped audiorooms geospatial index');
        } catch (error) {
            console.log('⚠️ Audiorooms geospatial index not found or already dropped');
        }
        
        console.log('✅ Problematic indexes dropped successfully');
        
    } catch (error) {
        console.error('❌ Error dropping indexes:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
};

// Run the script
dropProblematicIndexes(); 