#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const monitorPerformance = async () => {
    try {
        console.log('📊 Monitoring database performance...');
        
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
        
        // Check database health
        console.log('\n🏥 Database Health Check:');
        
        try {
            await db.admin().ping();
            console.log('   ✅ Database connection: Healthy');
        } catch (error) {
            console.log('   ❌ Database connection: Unhealthy');
            return;
        }
        
        // Check collection statistics
        console.log('\n📊 Collection Statistics:');
        
        const collections = ['users', 'messages', 'audiorooms', 'groups', 'posts'];
        
        for (const collectionName of collections) {
            try {
                const stats = await db.collection(collectionName).stats();
                console.log(`   ${collectionName}:`);
                console.log(`     • Documents: ${stats.count.toLocaleString()}`);
                console.log(`     • Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                console.log(`     • Storage: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
                console.log(`     • Indexes: ${stats.nindexes}`);
                console.log(`     • Avg document size: ${(stats.avgObjSize / 1024).toFixed(2)} KB`);
            } catch (error) {
                console.log(`   ${collectionName}: Collection not found`);
            }
        }
        
        // Check index usage
        console.log('\n🔍 Index Usage Statistics:');
        
        for (const collectionName of collections) {
            try {
                const indexStats = await db.collection(collectionName).aggregate([
                    { $indexStats: {} }
                ]).toArray();
                
                if (indexStats.length > 0) {
                    console.log(`   ${collectionName}:`);
                    indexStats.forEach(index => {
                        const hitRate = index.accesses.ops > 0 
                            ? ((index.accesses.ops / (index.accesses.ops + index.accesses.misses)) * 100).toFixed(1)
                            : 0;
                        console.log(`     • ${index.name}: ${hitRate}% hit rate`);
                    });
                }
            } catch (error) {
                // Index stats not available
            }
        }
        
        // Check slow queries
        console.log('\n🐌 Slow Query Analysis:');
        
        try {
            const slowQueries = await db.collection('system.profile').find({
                millis: { $gt: 100 }
            }).sort({ millis: -1 }).limit(10).toArray();
            
            if (slowQueries.length > 0) {
                console.log('   Recent slow queries (>100ms):');
                slowQueries.forEach(query => {
                    console.log(`     • ${query.op} on ${query.ns}: ${query.millis}ms`);
                });
            } else {
                console.log('   ✅ No slow queries detected');
            }
        } catch (error) {
            console.log('   ⚠️ Profiling not enabled');
        }
        
        // Check connection pool status
        console.log('\n🔌 Connection Pool Status:');
        
        const poolStats = mongoose.connection.pool;
        if (poolStats) {
            console.log(`   • Active connections: ${poolStats.totalConnectionCount}`);
            console.log(`   • Available connections: ${poolStats.availableConnectionCount}`);
            console.log(`   • Pending connections: ${poolStats.pendingConnectionCount}`);
        }
        
        // Performance recommendations
        console.log('\n💡 Performance Recommendations:');
        
        // Check if indexes exist
        const userIndexes = await db.collection('users').indexes();
        const messageIndexes = await db.collection('messages').indexes();
        
        if (userIndexes.length < 8) {
            console.log('   ⚠️ User collection needs more indexes for optimal performance');
        }
        
        if (messageIndexes.length < 12) {
            console.log('   ⚠️ Message collection needs more indexes for optimal performance');
        }
        
        // Check collection sizes
        const userStats = await db.collection('users').stats();
        const messageStats = await db.collection('messages').stats();
        
        if (userStats.count > 10000) {
            console.log('   💡 Consider sharding users collection for better performance');
        }
        
        if (messageStats.count > 100000) {
            console.log('   💡 Consider archiving old messages to reduce collection size');
        }
        
        // Check memory usage
        const memInfo = await db.admin().serverStatus();
        if (memInfo.mem) {
            const memUsageMB = memInfo.mem.resident / 1024 / 1024;
            console.log(`   📈 Memory usage: ${memUsageMB.toFixed(2)} MB`);
            
            if (memUsageMB > 1000) {
                console.log('   ⚠️ High memory usage detected');
            }
        }
        
        console.log('\n✅ Performance monitoring completed');
        
    } catch (error) {
        console.error('❌ Error monitoring performance:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
};

// Run the monitoring
monitorPerformance(); 