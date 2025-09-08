import mongoose from 'mongoose';

// Optimized Audio Room Schema for 10,000+ Concurrent Users
const optimizedAudioRoomSchema = new mongoose.Schema({
    // Room identification
    roomId: {
        type: String,
        unique: true,
        index: true,
        default: function() {
            return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
    },
    
    // Room association
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OptimizedGroup',
        required: true,
        index: true
    },
    
    // Room metadata
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        maxlength: 500
    },
    
    // Room status and lifecycle
    status: {
        type: String,
        enum: ['idle', 'joining', 'connecting', 'live', 'ended', 'error'],
        default: 'idle',
        index: true
    },
    
    // Room creator and management
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OptimizedUser',
        required: true,
        index: true
    },
    startedAt: {
        type: Date,
        default: null
    },
    endedAt: {
        type: Date,
        default: null
    },
    
    // Room capacity and limits
    maxParticipants: {
        type: Number,
        default: 50,
        min: 1,
        max: 1000
    },
    currentParticipants: {
        type: Number,
        default: 0,
        index: true
    },
    
    // Room settings and configuration
    settings: {
        allowAllToSpeak: {
            type: Boolean,
            default: true
        },
        requirePermissionToJoin: {
            type: Boolean,
            default: false
        },
        autoMuteOnJoin: {
            type: Boolean,
            default: false
        },
        enableNoiseSuppression: {
            type: Boolean,
            default: true
        },
        enableEchoCancellation: {
            type: Boolean,
            default: true
        },
        enableAutoGainControl: {
            type: Boolean,
            default: true
        },
        recordingEnabled: {
            type: Boolean,
            default: false
        },
        transcriptionEnabled: {
            type: Boolean,
            default: false
        }
    },
    
    // Room participants (embedded for performance)
    participants: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OptimizedUser',
            required: true
        },
        status: {
            type: String,
            enum: ['joining', 'connected', 'muted', 'speaking', 'disconnected'],
            default: 'joining'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        leftAt: {
            type: Date,
            default: null
        },
        micEnabled: {
            type: Boolean,
            default: true
        },
        speakerEnabled: {
            type: Boolean,
            default: true
        },
        audioLevel: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        isSpeaking: {
            type: Boolean,
            default: false
        },
        lastSpokeAt: {
            type: Date,
            default: null
        },
        permissions: {
            canSpeak: { type: Boolean, default: true },
            canModerate: { type: Boolean, default: false },
            canInvite: { type: Boolean, default: true },
            canRecord: { type: Boolean, default: false }
        },
        metadata: {
            platform: String,
            version: String,
            userAgent: String,
            ipAddress: String,
            location: {
                type: { type: String, default: 'Point' },
                coordinates: [Number]
            }
        }
    }],
    
    // Room activity and metrics
    metrics: {
        totalParticipants: {
            type: Number,
            default: 0
        },
        peakParticipants: {
            type: Number,
            default: 0
        },
        totalDuration: {
            type: Number,
            default: 0 // in seconds
        },
        averageSessionDuration: {
            type: Number,
            default: 0
        },
        messageCount: {
            type: Number,
            default: 0
        },
        recordingDuration: {
            type: Number,
            default: 0
        }
    },
    
    // Room recordings and media
    recordings: [{
        id: String,
        url: String,
        duration: Number,
        size: Number,
        format: String,
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'OptimizedUser' }
    }],
    
    // Room chat messages (for audio room chat)
    chatMessages: [{
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OptimizedMessage'
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OptimizedUser'
        },
        content: String,
        timestamp: { type: Date, default: Date.now }
    }],
    
    // Room moderation and safety
    moderation: {
        isModerated: { type: Boolean, default: false },
        moderators: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'OptimizedUser'
        }],
        bannedUsers: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'OptimizedUser' },
            bannedAt: { type: Date, default: Date.now },
            reason: String,
            bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'OptimizedUser' }
        }],
        reportedIncidents: [{
            reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'OptimizedUser' },
            reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'OptimizedUser' },
            reason: String,
            timestamp: { type: Date, default: Date.now },
            status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' }
        }]
    },
    
    // Room analytics and insights
    analytics: {
        joinRate: { type: Number, default: 0 }, // participants per minute
        leaveRate: { type: Number, default: 0 },
        averageAudioLevel: { type: Number, default: 0 },
        speakingTimeDistribution: mongoose.Schema.Types.Mixed,
        participantRetention: { type: Number, default: 0 },
        qualityMetrics: {
            audioQuality: { type: Number, default: 0 },
            connectionStability: { type: Number, default: 0 },
            latency: { type: Number, default: 0 }
        }
    },
    
    // Room metadata
    metadata: {
        tags: [String],
        category: String,
        language: { type: String, default: 'en' },
        isPublic: { type: Boolean, default: false },
        isFeatured: { type: Boolean, default: false },
        location: {
            type: { type: String, default: 'Point' },
            coordinates: [Number]
        },
        timezone: String
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
    readPreference: 'primaryPreferred'
});

// Compound indexes for optimal query performance
optimizedAudioRoomSchema.index({ groupId: 1, status: 1 }); // Group's active rooms
optimizedAudioRoomSchema.index({ status: 1, createdAt: -1 }); // Active rooms by time
optimizedAudioRoomSchema.index({ createdBy: 1, createdAt: -1 }); // User's created rooms
optimizedAudioRoomSchema.index({ 'participants.userId': 1, status: 1 }); // User's active rooms
optimizedAudioRoomSchema.index({ currentParticipants: 1, status: 1 }); // Room capacity queries
optimizedAudioRoomSchema.index({ 'metadata.isPublic': 1, status: 1 }); // Public rooms
optimizedAudioRoomSchema.index({ 'metadata.isFeatured': 1, status: 1 }); // Featured rooms

// Partial indexes for better performance
optimizedAudioRoomSchema.index(
    { groupId: 1, status: 1 },
    { partialFilterExpression: { status: { $in: ['live', 'connecting'] } } }
);

// Geospatial index for location-based queries
optimizedAudioRoomSchema.index({ 'metadata.location': '2dsphere' });

// Text search index for room discovery
optimizedAudioRoomSchema.index({
    name: 'text',
    description: 'text',
    'metadata.tags': 'text'
}, {
    weights: {
        name: 10,
        description: 5,
        'metadata.tags': 3
    },
    name: 'room_search_index'
});

// Pre-save middleware for validation and metrics
optimizedAudioRoomSchema.pre('save', function(next) {
    // Update current participants count
    this.currentParticipants = this.participants.filter(p => p.status !== 'disconnected').length;
    
    // Update peak participants
    if (this.currentParticipants > this.metrics.peakParticipants) {
        this.metrics.peakParticipants = this.currentParticipants;
    }
    
    // Update total participants
    this.metrics.totalParticipants = Math.max(this.metrics.totalParticipants, this.currentParticipants);
    
    // Update total duration if room is live
    if (this.status === 'live' && this.startedAt) {
        const now = new Date();
        this.metrics.totalDuration = Math.floor((now - this.startedAt) / 1000);
    }
    
    next();
});

// Instance methods
optimizedAudioRoomSchema.methods.addParticipant = async function(userId, userData = {}) {
    const existingParticipant = this.participants.find(p => p.userId.toString() === userId.toString());
    
    if (existingParticipant) {
        // Update existing participant
        existingParticipant.status = 'connected';
        existingParticipant.leftAt = null;
        existingParticipant.joinedAt = new Date();
        Object.assign(existingParticipant, userData);
    } else {
        // Add new participant
        this.participants.push({
            userId,
            joinedAt: new Date(),
            ...userData
        });
    }
    
    return this.save();
};

optimizedAudioRoomSchema.methods.removeParticipant = async function(userId) {
    const participant = this.participants.find(p => p.userId.toString() === userId.toString());
    if (participant) {
        participant.status = 'disconnected';
        participant.leftAt = new Date();
    }
    
    return this.save();
};

optimizedAudioRoomSchema.methods.updateParticipantStatus = async function(userId, status, audioData = {}) {
    const participant = this.participants.find(p => p.userId.toString() === userId.toString());
    if (participant) {
        participant.status = status;
        Object.assign(participant, audioData);
        
        if (status === 'speaking') {
            participant.lastSpokeAt = new Date();
        }
    }
    
    return this.save();
};

optimizedAudioRoomSchema.methods.startRoom = async function() {
    this.status = 'live';
    this.startedAt = new Date();
    return this.save();
};

optimizedAudioRoomSchema.methods.endRoom = async function() {
    this.status = 'ended';
    this.endedAt = new Date();
    
    // Calculate average session duration
    if (this.metrics.totalParticipants > 0) {
        this.metrics.averageSessionDuration = this.metrics.totalDuration / this.metrics.totalParticipants;
    }
    
    return this.save();
};

optimizedAudioRoomSchema.methods.addChatMessage = async function(messageId, sender, content) {
    this.chatMessages.push({
        messageId,
        sender,
        content,
        timestamp: new Date()
    });
    
    this.metrics.messageCount += 1;
    
    // Keep only last 100 messages for performance
    if (this.chatMessages.length > 100) {
        this.chatMessages = this.chatMessages.slice(-100);
    }
    
    return this.save();
};

// Static methods for common queries
optimizedAudioRoomSchema.statics.getActiveRooms = function(limit = 50) {
    return this.find({
        status: { $in: ['live', 'connecting'] }
    })
    .populate('createdBy', 'name profileName profilePicture')
    .populate('participants.userId', 'name profileName profilePicture')
    .sort({ currentParticipants: -1, createdAt: -1 })
    .limit(limit)
    .lean();
};

optimizedAudioRoomSchema.statics.getGroupRooms = function(groupId, limit = 10) {
    return this.find({
        groupId,
        status: { $in: ['live', 'connecting'] }
    })
    .populate('createdBy', 'name profileName profilePicture')
    .populate('participants.userId', 'name profileName profilePicture')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

optimizedAudioRoomSchema.statics.getUserRooms = function(userId, limit = 20) {
    return this.find({
        'participants.userId': userId,
        status: { $in: ['live', 'connecting'] }
    })
    .populate('createdBy', 'name profileName profilePicture')
    .populate('participants.userId', 'name profileName profilePicture')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

optimizedAudioRoomSchema.statics.searchRooms = function(query, limit = 20) {
    return this.find({
        $text: { $search: query },
        status: { $in: ['live', 'connecting'] },
        'metadata.isPublic': true
    })
    .populate('createdBy', 'name profileName profilePicture')
    .sort({ score: { $meta: 'textScore' }, currentParticipants: -1 })
    .limit(limit)
    .lean();
};

// Virtual for room duration
optimizedAudioRoomSchema.virtual('duration').get(function() {
    if (!this.startedAt) return 0;
    const endTime = this.endedAt || new Date();
    return Math.floor((endTime - this.startedAt) / 1000);
});

// Virtual for active participants
optimizedAudioRoomSchema.virtual('activeParticipants').get(function() {
    return this.participants.filter(p => p.status === 'connected').length;
});

// Ensure virtuals are included
optimizedAudioRoomSchema.set('toJSON', { virtuals: true });
optimizedAudioRoomSchema.set('toObject', { virtuals: true });

const OptimizedAudioRoom = mongoose.model('OptimizedAudioRoom', optimizedAudioRoomSchema);

export default OptimizedAudioRoom; 