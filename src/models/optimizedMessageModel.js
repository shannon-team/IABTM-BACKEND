import mongoose from 'mongoose';

// Optimized Message Schema for 10,000+ Concurrent Users
const optimizedMessageSchema = new mongoose.Schema({
    // Message identification
    messageId: {
        type: String,
        unique: true,
        index: true,
        default: function() {
            return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    },
    
    // Message content
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000 // Prevent extremely long messages
    },
    
    // Message metadata
    messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'audio', 'video', 'system', 'reaction'],
        default: 'text',
        index: true
    },
    
    // Media information (for non-text messages)
    media: {
        url: String,
        fileName: String,
        fileSize: Number,
        mimeType: String,
        duration: Number, // for audio/video
        thumbnail: String,
        metadata: mongoose.Schema.Types.Mixed
    },
    
    // Sender information
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OptimizedUser',
        required: true,
        index: true
    },
    
    // Recipient information (for direct messages)
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OptimizedUser',
        default: null,
        index: true
    },
    
    // Group information (for group messages)
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OptimizedGroup',
        default: null,
        index: true
    },
    
    // Message threading and replies
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OptimizedMessage',
        default: null,
        index: true
    },
    threadId: {
        type: String,
        default: null,
        index: true
    },
    
    // Message status and delivery
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read', 'failed'],
        default: 'sent',
        index: true
    },
    
    // Delivery tracking
    deliveryStatus: {
        sent: { type: Boolean, default: true },
        delivered: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        deliveredTo: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'OptimizedUser' },
            deliveredAt: { type: Date, default: Date.now }
        }],
        readBy: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'OptimizedUser' },
            readAt: { type: Date, default: Date.now }
        }]
    },
    
    // Message reactions (embedded for performance)
    reactions: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OptimizedUser',
            required: true
        },
        emoji: {
            type: String,
            required: true,
            maxlength: 10
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Message editing
    edited: {
        type: Boolean,
        default: false,
        index: true
    },
    editedAt: {
        type: Date,
        default: null
    },
    editHistory: [{
        content: String,
        editedAt: { type: Date, default: Date.now }
    }],
    
    // Message deletion
    deleted: {
        type: Boolean,
        default: false,
        index: true
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OptimizedUser',
        default: null
    },
    
    // Message flags and moderation
    flags: {
        isPinned: { type: Boolean, default: false },
        isImportant: { type: Boolean, default: false },
        isSpam: { type: Boolean, default: false },
        isModerated: { type: Boolean, default: false },
        moderationReason: String
    },
    
    // Performance metrics
    metrics: {
        viewCount: { type: Number, default: 0 },
        reactionCount: { type: Number, default: 0 },
        replyCount: { type: Number, default: 0 },
        shareCount: { type: Number, default: 0 }
    },
    
    // Message metadata
    metadata: {
        clientInfo: {
            platform: String,
            version: String,
            userAgent: String
        },
        location: {
            type: { type: String, default: 'Point' },
            coordinates: [Number] // [longitude, latitude]
        },
        tags: [String],
        sentiment: {
            type: String,
            enum: ['positive', 'negative', 'neutral'],
            default: 'neutral'
        },
        sentimentScore: {
            type: Number,
            default: 0,
            min: -1,
            max: 1
        }
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    // Optimize for read-heavy workloads
    readPreference: 'primaryPreferred',
    // Enable optimistic concurrency control
    optimisticConcurrency: true
});

// Compound indexes for optimal query performance
optimizedMessageSchema.index({ group: 1, createdAt: -1 }); // Group messages by time
optimizedMessageSchema.index({ recipient: 1, createdAt: -1 }); // Direct messages by time
optimizedMessageSchema.index({ sender: 1, createdAt: -1 }); // User's sent messages
optimizedMessageSchema.index({ 'deliveryStatus.readBy.userId': 1, createdAt: -1 }); // Read messages
optimizedMessageSchema.index({ threadId: 1, createdAt: 1 }); // Thread messages
optimizedMessageSchema.index({ replyTo: 1, createdAt: 1 }); // Reply chains
optimizedMessageSchema.index({ 'reactions.userId': 1, createdAt: -1 }); // User reactions
optimizedMessageSchema.index({ deleted: 1, createdAt: -1 }); // Non-deleted messages
optimizedMessageSchema.index({ 'flags.isPinned': 1, group: 1 }); // Pinned messages
optimizedMessageSchema.index({ status: 1, createdAt: -1 }); // Message status

// Partial indexes for better performance
optimizedMessageSchema.index(
    { group: 1, createdAt: -1 },
    { partialFilterExpression: { deleted: false } }
);

optimizedMessageSchema.index(
    { recipient: 1, createdAt: -1 },
    { partialFilterExpression: { deleted: false } }
);

// Text search index for message content
optimizedMessageSchema.index({
    content: 'text',
    'metadata.tags': 'text'
}, {
    weights: {
        content: 10,
        'metadata.tags': 5
    },
    name: 'message_search_index'
});

// Geospatial index for location-based queries
optimizedMessageSchema.index({ 'metadata.location': '2dsphere' });

// TTL index for old messages (optional - for data retention)
// optimizedMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 1 year

// Pre-save middleware for validation
optimizedMessageSchema.pre('save', function(next) {
    // Ensure either recipient or group is present, but not both
    if (!this.recipient && !this.group) {
        return next(new Error('Message must have either a recipient or group'));
    }
    if (this.recipient && this.group) {
        return next(new Error('Message cannot have both recipient and group'));
    }
    
    // Set threadId for replies
    if (this.replyTo && !this.threadId) {
        this.threadId = this.replyTo.toString();
    }
    
    // Update metrics
    this.metrics.reactionCount = this.reactions ? this.reactions.length : 0;
    
    next();
});

// Instance methods
optimizedMessageSchema.methods.addReaction = async function(userId, emoji) {
    // Remove existing reaction from this user
    this.reactions = this.reactions.filter(r => r.userId.toString() !== userId.toString());
    
    // Add new reaction
    this.reactions.push({ userId, emoji });
    this.metrics.reactionCount = this.reactions.length;
    
    return this.save();
};

optimizedMessageSchema.methods.removeReaction = async function(userId) {
    this.reactions = this.reactions.filter(r => r.userId.toString() !== userId.toString());
    this.metrics.reactionCount = this.reactions.length;
    
    return this.save();
};

optimizedMessageSchema.methods.markAsRead = async function(userId) {
    const existingRead = this.deliveryStatus.readBy.find(r => r.userId.toString() === userId.toString());
    if (!existingRead) {
        this.deliveryStatus.readBy.push({ userId, readAt: new Date() });
        this.deliveryStatus.read = true;
        this.status = 'read';
    }
    
    return this.save();
};

optimizedMessageSchema.methods.editMessage = async function(newContent, userId) {
    // Store edit history
    this.editHistory.push({
        content: this.content,
        editedAt: new Date()
    });
    
    // Update content
    this.content = newContent;
    this.edited = true;
    this.editedAt = new Date();
    
    return this.save();
};

// Static methods for common queries
optimizedMessageSchema.statics.getGroupMessages = function(groupId, limit = 50, skip = 0) {
    return this.find({
        group: groupId,
        deleted: false
    })
    .populate('sender', 'name profileName profilePicture')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

optimizedMessageSchema.statics.getDirectMessages = function(user1Id, user2Id, limit = 50, skip = 0) {
    return this.find({
        $or: [
            { sender: user1Id, recipient: user2Id },
            { sender: user2Id, recipient: user1Id }
        ],
        deleted: false
    })
    .populate('sender', 'name profileName profilePicture')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

optimizedMessageSchema.statics.getUnreadCount = function(userId, groupId = null) {
    const query = {
        'deliveryStatus.readBy.userId': { $ne: userId },
        deleted: false
    };
    
    if (groupId) {
        query.group = groupId;
    } else {
        query.recipient = userId;
    }
    
    return this.countDocuments(query);
};

optimizedMessageSchema.statics.searchMessages = function(query, groupId = null, limit = 20) {
    const searchQuery = {
        $text: { $search: query },
        deleted: false
    };
    
    if (groupId) {
        searchQuery.group = groupId;
    }
    
    return this.find(searchQuery)
    .populate('sender', 'name profileName profilePicture')
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();
};

// Virtual for reaction summary
optimizedMessageSchema.virtual('reactionSummary').get(function() {
    const summary = {};
    this.reactions.forEach(reaction => {
        summary[reaction.emoji] = (summary[reaction.emoji] || 0) + 1;
    });
    return summary;
});

// Ensure virtuals are included
optimizedMessageSchema.set('toJSON', { virtuals: true });
optimizedMessageSchema.set('toObject', { virtuals: true });

const OptimizedMessage = mongoose.model('OptimizedMessage', optimizedMessageSchema);

export default OptimizedMessage; 