# **MongoDB Optimization Guide for 10,000+ Concurrent Users**

## **🗄️ Database Architecture Strategy**

### **1. Sharding Strategy**
```javascript
// Enable sharding for collections with high write volume
sh.enableSharding("iabtm")
sh.shardCollection("iabtm.optimizedmessages", { "groupId": 1, "createdAt": -1 })
sh.shardCollection("iabtm.optimizedusers", { "email": 1 })
sh.shardCollection("iabtm.optimizedaudiorooms", { "groupId": 1 })
```

### **2. Replica Set Configuration**
```javascript
// 3-node replica set for high availability
// Primary: Write operations
// Secondary 1: Read operations (readPreference: 'secondaryPreferred')
// Secondary 2: Backup and analytics
```

## **📊 Indexing Strategy**

### **Critical Indexes for Performance**

#### **Users Collection**
```javascript
// Primary lookup indexes
db.optimizedusers.createIndex({ "email": 1 }, { unique: true, sparse: true })
db.optimizedusers.createIndex({ "isOnline": 1, "lastSeen": -1 })
db.optimizedusers.createIndex({ "role": 1, "isOnline": 1 })

// Text search index
db.optimizedusers.createIndex({
    "name": "text",
    "profileName": "text",
    "attributes.currentSelf": "text",
    "attributes.imagineSelf": "text"
}, {
    weights: {
        name: 10,
        profileName: 8,
        "attributes.currentSelf": 5,
        "attributes.imagineSelf": 5
    },
    name: "user_search_index"
})

// Compound indexes for common queries
db.optimizedusers.createIndex({ "friends": 1, "isOnline": 1 })
db.optimizedusers.createIndex({ "subscription.plan": 1, "subscription.status": 1 })
db.optimizedusers.createIndex({ "createdAt": -1, "role": 1 })
```

#### **Messages Collection**
```javascript
// Primary query indexes
db.optimizedmessages.createIndex({ "group": 1, "createdAt": -1 })
db.optimizedmessages.createIndex({ "recipient": 1, "createdAt": -1 })
db.optimizedmessages.createIndex({ "sender": 1, "createdAt": -1 })

// Partial indexes for better performance
db.optimizedmessages.createIndex(
    { "group": 1, "createdAt": -1 },
    { partialFilterExpression: { "deleted": false } }
)

db.optimizedmessages.createIndex(
    { "recipient": 1, "createdAt": -1 },
    { partialFilterExpression: { "deleted": false } }
)

// Text search index
db.optimizedmessages.createIndex({
    "content": "text",
    "metadata.tags": "text"
}, {
    weights: {
        content: 10,
        "metadata.tags": 5
    },
    name: "message_search_index"
})

// Geospatial index
db.optimizedmessages.createIndex({ "metadata.location": "2dsphere" })

// Reaction and delivery indexes
db.optimizedmessages.createIndex({ "reactions.userId": 1, "createdAt": -1 })
db.optimizedmessages.createIndex({ "deliveryStatus.readBy.userId": 1, "createdAt": -1 })
db.optimizedmessages.createIndex({ "threadId": 1, "createdAt": 1 })
```

#### **Audio Rooms Collection**
```javascript
// Primary query indexes
db.optimizedaudiorooms.createIndex({ "groupId": 1, "status": 1 })
db.optimizedaudiorooms.createIndex({ "status": 1, "createdAt": -1 })
db.optimizedaudiorooms.createIndex({ "createdBy": 1, "createdAt": -1 })

// Participant queries
db.optimizedaudiorooms.createIndex({ "participants.userId": 1, "status": 1 })
db.optimizedaudiorooms.createIndex({ "currentParticipants": 1, "status": 1 })

// Partial indexes for active rooms
db.optimizedaudiorooms.createIndex(
    { "groupId": 1, "status": 1 },
    { partialFilterExpression: { "status": { $in: ["live", "connecting"] } } }
)

// Text search for room discovery
db.optimizedaudiorooms.createIndex({
    "name": "text",
    "description": "text",
    "metadata.tags": "text"
}, {
    weights: {
        name: 10,
        description: 5,
        "metadata.tags": 3
    },
    name: "room_search_index"
})

// Geospatial index
db.optimizedaudiorooms.createIndex({ "metadata.location": "2dsphere" })
```

## **⚡ Performance Optimization Techniques**

### **1. Connection Pooling**
```javascript
// Optimized connection configuration
const mongooseOptions = {
    maxPoolSize: 50,           // Increased for high concurrency
    minPoolSize: 10,           // Maintain minimum connections
    maxIdleTimeMS: 30000,      // 30 seconds
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    w: 'majority',
    readPreference: 'primaryPreferred',
    readConcern: { level: 'majority' }
};
```

### **2. Query Optimization**
```javascript
// Use lean() for read-only queries
const messages = await OptimizedMessage.find({ group: groupId })
    .populate('sender', 'name profileName profilePicture')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean(); // 10x faster for read-only operations

// Use projection to limit fields
const users = await OptimizedUser.find({ isOnline: true })
    .select('name profileName profilePicture status lastSeen')
    .limit(100)
    .lean();

// Use aggregation for complex queries
const roomStats = await OptimizedAudioRoom.aggregate([
    { $match: { status: 'live' } },
    { $group: {
        _id: null,
        totalRooms: { $sum: 1 },
        totalParticipants: { $sum: '$currentParticipants' },
        avgParticipants: { $avg: '$currentParticipants' }
    }}
]);
```

### **3. Caching Strategy**
```javascript
// Redis caching for frequently accessed data
const cacheConfig = {
    // User presence cache (5 minutes)
    userPresence: { ttl: 300 },
    
    // Group member list cache (10 minutes)
    groupMembers: { ttl: 600 },
    
    // Recent messages cache (2 minutes)
    recentMessages: { ttl: 120 },
    
    // Room participants cache (1 minute)
    roomParticipants: { ttl: 60 }
};

// Cache key patterns
const cacheKeys = {
    userPresence: (userId) => `presence:${userId}`,
    groupMembers: (groupId) => `group:${groupId}:members`,
    recentMessages: (groupId) => `messages:${groupId}:recent`,
    roomParticipants: (roomId) => `room:${roomId}:participants`
};
```

### **4. Write Optimization**
```javascript
// Bulk operations for high-volume writes
const bulkOps = [];
messages.forEach(message => {
    bulkOps.push({
        insertOne: { document: message }
    });
});

if (bulkOps.length > 0) {
    await OptimizedMessage.bulkWrite(bulkOps, { ordered: false });
}

// Use updateOne with upsert for presence updates
await OptimizedUser.updateOne(
    { _id: userId },
    { 
        $set: { 
            isOnline: true, 
            lastSeen: new Date(),
            status: 'online'
        }
    },
    { upsert: false }
);
```

## **🔄 Real-time Data Management**

### **1. Change Streams for Real-time Updates**
```javascript
// Monitor user presence changes
const userPresenceStream = OptimizedUser.watch([
    { $match: { 'fullDocument.isOnline': true } }
]);

userPresenceStream.on('change', (change) => {
    // Broadcast presence update via Socket.IO
    io.emit('user_presence_changed', {
        userId: change.documentKey._id,
        isOnline: change.fullDocument.isOnline,
        lastSeen: change.fullDocument.lastSeen
    });
});

// Monitor new messages
const messageStream = OptimizedMessage.watch([
    { $match: { 'operationType': 'insert' } }
]);

messageStream.on('change', (change) => {
    // Broadcast new message to group members
    const message = change.fullDocument;
    io.to(`group:${message.group}`).emit('new_message', message);
});
```

### **2. Presence Management**
```javascript
// Heartbeat system for user presence
const updateUserPresence = async (userId, status = 'online', roomId = null) => {
    const update = {
        isOnline: status === 'online',
        status,
        lastSeen: new Date(),
        currentRoom: roomId
    };
    
    if (status === 'online') {
        update['activityMetrics.lastLogin'] = new Date();
        update['$inc'] = { 'activityMetrics.loginCount': 1 };
    }
    
    await OptimizedUser.updateOne(
        { _id: userId },
        update,
        { upsert: false }
    );
};

// Cleanup offline users
const cleanupOfflineUsers = async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    await OptimizedUser.updateMany(
        { 
            isOnline: true, 
            lastSeen: { $lt: fiveMinutesAgo } 
        },
        { 
            $set: { 
                isOnline: false, 
                status: 'offline',
                currentRoom: null 
            } 
        }
    );
};

// Run cleanup every 2 minutes
setInterval(cleanupOfflineUsers, 2 * 60 * 1000);
```

## **📈 Scaling Strategies**

### **1. Horizontal Scaling**
```javascript
// Shard by groupId for message distribution
sh.shardCollection("iabtm.optimizedmessages", { "groupId": 1, "createdAt": -1 })

// Shard by email for user distribution
sh.shardCollection("iabtm.optimizedusers", { "email": 1 })

// Shard by groupId for audio rooms
sh.shardCollection("iabtm.optimizedaudiorooms", { "groupId": 1 })
```

### **2. Read Replicas**
```javascript
// Configure read preferences
const readOptions = {
    readPreference: 'secondaryPreferred',
    readConcern: { level: 'majority' }
};

// Use for analytics and reporting
const analyticsConnection = mongoose.createConnection(mongoUri, {
    ...readOptions,
    maxPoolSize: 20
});
```

### **3. Data Archiving**
```javascript
// Archive old messages to reduce collection size
const archiveOldMessages = async () => {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const oldMessages = await OptimizedMessage.find({
        createdAt: { $lt: threeMonthsAgo },
        deleted: false
    }).limit(1000);
    
    if (oldMessages.length > 0) {
        // Move to archive collection
        await OptimizedMessageArchive.insertMany(oldMessages);
        
        // Mark as archived in original collection
        const messageIds = oldMessages.map(msg => msg._id);
        await OptimizedMessage.updateMany(
            { _id: { $in: messageIds } },
            { $set: { archived: true } }
        );
    }
};
```

## **🔧 Monitoring and Maintenance**

### **1. Performance Monitoring**
```javascript
// Monitor query performance
db.setProfilingLevel(1, { slowms: 100 });

// Check index usage
db.optimizedmessages.getIndexes();
db.optimizedmessages.aggregate([
    { $indexStats: {} }
]);

// Monitor collection stats
db.optimizedmessages.stats();
```

### **2. Regular Maintenance**
```javascript
// Rebuild indexes monthly
db.optimizedmessages.reIndex();
db.optimizedusers.reIndex();
db.optimizedaudiorooms.reIndex();

// Compact collections
db.runCommand({ compact: "optimizedmessages" });
db.runCommand({ compact: "optimizedusers" });
db.runCommand({ compact: "optimizedaudiorooms" });
```

### **3. Health Checks**
```javascript
// Database health check
const checkDatabaseHealth = async () => {
    try {
        // Check connection
        await mongoose.connection.db.admin().ping();
        
        // Check collection sizes
        const stats = await OptimizedMessage.stats();
        console.log(`Messages collection size: ${stats.size} bytes`);
        
        // Check index usage
        const indexStats = await OptimizedMessage.aggregate([
            { $indexStats: {} }
        ]);
        
        return {
            status: 'healthy',
            collections: stats,
            indexes: indexStats
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            error: error.message
        };
    }
};
```

## **🚀 Expected Performance Improvements**

### **With These Optimizations:**
- **Query Performance**: 10-50x faster for common queries
- **Write Performance**: 5-20x faster with bulk operations
- **Memory Usage**: 30-60% reduction with proper indexing
- **Scalability**: Support for 10,000+ concurrent users
- **Real-time Updates**: Sub-100ms latency for presence and messages
- **Search Performance**: Full-text search in <50ms

### **Monitoring Metrics:**
- **Query Response Time**: <100ms for 95% of queries
- **Write Operations**: <50ms for single operations
- **Connection Pool Utilization**: 70-80% under load
- **Index Hit Ratio**: >95% for all collections
- **Memory Usage**: <80% of available RAM
- **Disk I/O**: <70% of available bandwidth 