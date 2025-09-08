import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Optimized User Schema for 10,000+ Concurrent Users
const userSchema = new mongoose.Schema({
    // Core user data
    name: {
        type: String,
        trim: true,
        index: true // For name searches
    },
    profileName: {
        type: String,
        trim: true,
        index: true
    },
    profilePicture: {
        type: String,
        default: null
    },
    dob: {
        type: Date,
    },
    age: {
        type: Number,
        min: [1, 'Age must be greater than 0'],
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        index: true, // Critical for login performance
        validate: {
            validator: function (v) {
                return v === null || /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`,
        }
    },
    phoneNumber: {
        type: String,
        sparse: true,
        index: true
    },
    
    // Authentication & verification
    password: {
        type: String,
        minlength: 6,
        select: false // Don't include in queries by default
    },
    emailVerified: {
        type: Boolean,
        default: false,
        index: true
    },
    phoneVerified: {
        type: Boolean,
        default: false
    },
    twoFA: {
        type: Boolean,
        default: false
    },
    
    // User status & presence
    isOnline: {
        type: Boolean,
        default: false,
        index: true // For presence queries
    },
    lastSeen: {
        type: Date,
        default: Date.now,
        index: true
    },
    status: {
        type: String,
        enum: ['online', 'offline', 'away', 'busy'],
        default: 'offline',
        index: true
    },
    currentRoom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AudioRoom',
        default: null,
        index: true
    },
    
    // User attributes (JSON for flexibility)
    attributes: {
        currentSelf: {
            type: [String],
            default: ["Unrelaxed", "Absent minded", "Afraid", "Exhausted"]
        },
        imagineSelf: {
            type: [String],
            default: ["Intelligent", "Wealthy", "Patient", "Social"]
        },
        learningStyle: {
            type: [String],
            default: ['visual']
        },
        mediaPreferences: {
            type: [String],
            default: ["Books", "Audio", "Video"]
        }
    },
    
    // User role & permissions
    role: {
        type: String,
        enum: ['user', 'expert', 'superAdmin', 'artist', 'employee'],
        default: 'user',
        index: true
    },
    
    // Social connections (optimized for queries)
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }],
    friendRequests: [{
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // User preferences & settings
    preferences: {
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            sms: { type: Boolean, default: false }
        },
        privacy: {
            profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
            showOnlineStatus: { type: Boolean, default: true },
            allowFriendRequests: { type: Boolean, default: true }
        },
        audio: {
            autoJoinAudio: { type: Boolean, default: false },
            defaultMicEnabled: { type: Boolean, default: true },
            defaultSpeakerEnabled: { type: Boolean, default: true }
        }
    },
    
    // Performance tracking
    activityMetrics: {
        lastLogin: { type: Date, default: Date.now },
        loginCount: { type: Number, default: 0 },
        messageCount: { type: Number, default: 0 },
        audioTime: { type: Number, default: 0 }, // in seconds
        totalSessions: { type: Number, default: 0 }
    },
    
    // Subscription & billing
    stripeCustomerId: {
        type: String,
        unique: true,
        sparse: true
    },
    subscription: {
        plan: { type: String, enum: ['free', 'basic', 'pro', 'enterprise'], default: 'free' },
        status: { type: String, enum: ['active', 'inactive', 'cancelled'], default: 'inactive' },
        expiresAt: { type: Date }
    },
    
    // Content relationships
    curatedPaths: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CuratedPath'
    }],
    pathDay: {
        type: Number,
        default: 1
    },
    playlists: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Playlist'
    }],
    
    // Group relationships and preferences
    groups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }],
    mutedGroups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }],
    blockedGroups: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
    }],
    chatBackgrounds: {
        type: Map,
        of: String,
        default: {}
    },
    
    // Metadata
    isOnboarded: {
        type: Boolean,
        default: false,
        index: true
    },
    interests: [{
        type: String,
        index: true
    }],
    
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
    timestamps: true
});

// Compound indexes for common query patterns
userSchema.index({ isOnline: 1, lastSeen: -1 }); // Online users
userSchema.index({ role: 1, isOnline: 1 }); // Online experts/admins
userSchema.index({ email: 1, emailVerified: 1 }); // Email verification
userSchema.index({ 'subscription.plan': 1, 'subscription.status': 1 }); // Subscription queries
userSchema.index({ friends: 1, isOnline: 1 }); // Friends online status
userSchema.index({ createdAt: -1, role: 1 }); // User registration analytics

// Text search index for user discovery
userSchema.index({
    name: 'text',
    profileName: 'text',
    'attributes.currentSelf': 'text',
    'attributes.imagineSelf': 'text'
}, {
    weights: {
        name: 10,
        profileName: 8,
        'attributes.currentSelf': 5,
        'attributes.imagineSelf': 5
    },
    name: 'user_search_index'
});

// Middleware for password hashing
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12); // Increased salt rounds for security
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to update presence
userSchema.methods.updatePresence = async function(status = 'online', roomId = null) {
    this.isOnline = status === 'online';
    this.status = status;
    this.lastSeen = new Date();
    this.currentRoom = roomId;
    
    // Update activity metrics
    if (status === 'online') {
        this.activityMetrics.lastLogin = new Date();
        this.activityMetrics.loginCount += 1;
    }
    
    return this.save();
};

// Static method to get online users
userSchema.statics.getOnlineUsers = function(limit = 100) {
    return this.find({
        isOnline: true,
        lastSeen: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Online in last 5 minutes
    })
    .select('name profileName profilePicture status currentRoom lastSeen')
    .limit(limit)
    .lean();
};

// Static method to get users by role
userSchema.statics.getUsersByRole = function(role, limit = 50) {
    return this.find({ role })
    .select('name profileName profilePicture isOnline lastSeen')
    .limit(limit)
    .lean();
};

// Virtual for user's full name
userSchema.virtual('fullName').get(function() {
    return this.name || this.profileName || 'Anonymous User';
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User;
