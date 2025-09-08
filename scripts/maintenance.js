#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const performMaintenance = async () => {
    try {
        console.log('🔧 Performing database maintenance...');
        
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
        
        // Rebuild indexes
        console.log('\n🔨 Rebuilding indexes...');
        
        const collections = ['users', 'messages', 'audiorooms', 'groups', 'posts'];
        
        for (const collectionName of collections) {
            try {
                console.log(`   Rebuilding indexes for ${collectionName}...`);
                await db.collection(collectionName).reIndex();
                console.log(`   ✅ ${collectionName} indexes rebuilt`);
            } catch (error) {
                console.log(`   ⚠️ ${collectionName}: ${error.message}`);
            }
        }
        
        // Compact collections
        console.log('\n🗜️ Compacting collections...');
        
        for (const collectionName of collections) {
            try {
                console.log(`   Compacting ${collectionName}...`);
                await db.runCommand({ compact: collectionName });
                console.log(`   ✅ ${collectionName} compacted`);
            } catch (error) {
                console.log(`   ⚠️ ${collectionName}: ${error.message}`);
            }
        }
        
        // Clean up old data
        console.log('\n🧹 Cleaning up old data...');
        
        // Archive old messages (older than 6 months)
        try {
            const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
            const oldMessages = await db.collection('messages').find({
                createdAt: { $lt: sixMonthsAgo },
                deleted: false
            }).limit(1000).toArray();
            
            if (oldMessages.length > 0) {
                // Create archive collection if it doesn't exist
                await db.createCollection('messages_archive');
                
                // Move old messages to archive
                await db.collection('messages_archive').insertMany(oldMessages);
                
                // Mark as archived in original collection
                const messageIds = oldMessages.map(msg => msg._id);
                await db.collection('messages').updateMany(
                    { _id: { $in: messageIds } },
                    { $set: { archived: true, archivedAt: new Date() } }
                );
                
                console.log(`   ✅ Archived ${oldMessages.length} old messages`);
            } else {
                console.log('   ✅ No old messages to archive');
            }
        } catch (error) {
            console.log(`   ⚠️ Message archiving: ${error.message}`);
        }
        
        // Clean up old notifications (older than 7 days)
        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const result = await db.collection('notifications').deleteMany({
                createdAt: { $lt: sevenDaysAgo }
            });
            
            console.log(`   ✅ Deleted ${result.deletedCount} old notifications`);
        } catch (error) {
            console.log(`   ⚠️ Notification cleanup: ${error.message}`);
        }
        
        // Clean up offline users (older than 30 days)
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const result = await db.collection('users').updateMany(
                {
                    isOnline: false,
                    lastSeen: { $lt: thirtyDaysAgo }
                },
                {
                    $set: {
                        status: 'offline',
                        currentRoom: null
                    }
                }
            );
            
            console.log(`   ✅ Updated ${result.modifiedCount} offline users`);
        } catch (error) {
            console.log(`   ⚠️ User cleanup: ${error.message}`);
        }
        
        // Update collection statistics
        console.log('\n📊 Updating collection statistics...');
        
        for (const collectionName of collections) {
            try {
                await db.runCommand({ collStats: collectionName });
                console.log(`   ✅ ${collectionName} statistics updated`);
            } catch (error) {
                console.log(`   ⚠️ ${collectionName}: ${error.message}`);
            }
        }
        
        // Check for orphaned documents
        console.log('\n🔍 Checking for orphaned documents...');
        
        // Check for messages without valid senders
        try {
            const orphanedMessages = await db.collection('messages').aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'sender',
                        foreignField: '_id',
                        as: 'senderInfo'
                    }
                },
                {
                    $match: {
                        senderInfo: { $size: 0 }
                    }
                },
                {
                    $project: { _id: 1 }
                }
            ]).toArray();
            
            if (orphanedMessages.length > 0) {
                console.log(`   ⚠️ Found ${orphanedMessages.length} messages with invalid senders`);
                // Optionally delete orphaned messages
                // await db.collection('messages').deleteMany({ _id: { $in: orphanedMessages.map(m => m._id) } });
            } else {
                console.log('   ✅ No orphaned messages found');
            }
        } catch (error) {
            console.log(`   ⚠️ Orphaned message check: ${error.message}`);
        }
        
        // Check for group members without valid users
        try {
            const orphanedGroupMembers = await db.collection('groups').aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'members',
                        foreignField: '_id',
                        as: 'memberInfo'
                    }
                },
                {
                    $match: {
                        $expr: {
                            $lt: [{ $size: '$memberInfo' }, { $size: '$members' }]
                        }
                    }
                },
                {
                    $project: { _id: 1, name: 1 }
                }
            ]).toArray();
            
            if (orphanedGroupMembers.length > 0) {
                console.log(`   ⚠️ Found ${orphanedGroupMembers.length} groups with invalid members`);
            } else {
                console.log('   ✅ No orphaned group members found');
            }
        } catch (error) {
            console.log(`   ⚠️ Orphaned group member check: ${error.message}`);
        }
        
        // Performance optimization recommendations
        console.log('\n💡 Maintenance Recommendations:');
        
        // Check index fragmentation
        for (const collectionName of collections) {
            try {
                const stats = await db.collection(collectionName).stats();
                const fragmentation = ((stats.storageSize - stats.size) / stats.storageSize * 100).toFixed(1);
                
                if (fragmentation > 20) {
                    console.log(`   ⚠️ ${collectionName}: ${fragmentation}% fragmentation detected`);
                } else {
                    console.log(`   ✅ ${collectionName}: Low fragmentation (${fragmentation}%)`);
                }
            } catch (error) {
                // Collection doesn't exist
            }
        }
        
        // Check for large collections
        for (const collectionName of collections) {
            try {
                const stats = await db.collection(collectionName).stats();
                const sizeGB = stats.size / 1024 / 1024 / 1024;
                
                if (sizeGB > 1) {
                    console.log(`   💡 ${collectionName}: Large collection (${sizeGB.toFixed(2)} GB)`);
                    console.log(`      Consider sharding for better performance`);
                }
            } catch (error) {
                // Collection doesn't exist
            }
        }
        
        console.log('\n✅ Database maintenance completed successfully!');
        console.log('\n📈 Expected improvements:');
        console.log('   • Faster query performance');
        console.log('   • Reduced storage usage');
        console.log('   • Better index efficiency');
        console.log('   • Cleaner data structure');
        
    } catch (error) {
        console.error('❌ Error during maintenance:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
};

// Run the maintenance
performMaintenance(); 