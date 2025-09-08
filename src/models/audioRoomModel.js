import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  isMuted: {
    type: Boolean,
    default: false
  },
  isSpeaking: {
    type: Boolean,
    default: false
  },
  // Enhanced audio state tracking
  audioLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  connectionQuality: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },
  lastSpokeAt: {
    type: Date,
    default: null
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  // WebRTC connection state
  webrtcState: {
    type: String,
    enum: ['connecting', 'connected', 'disconnected', 'failed'],
    default: 'connecting'
  },
  // Audio processing state
  audioProcessing: {
    noiseSuppression: {
      type: Boolean,
      default: true
    },
    echoCancellation: {
      type: Boolean,
      default: true
    },
    autoGainControl: {
      type: Boolean,
      default: true
    }
  }
}, { _id: true });

const audioRoomSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  startedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  participants: [participantSchema],
  maxParticipants: {
    type: Number,
    default: 50,
    min: 1,
    max: 100
  },
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
    }
  },
  metadata: {
    totalParticipants: {
      type: Number,
      default: 0
    },
    totalDuration: {
      type: Number,
      default: 0 // in seconds
    },
    peakParticipants: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
audioRoomSchema.index({ groupId: 1 });
audioRoomSchema.index({ isActive: 1 });
audioRoomSchema.index({ startedBy: 1 });
audioRoomSchema.index({ 'participants.userId': 1 });

// Pre-save middleware to update metadata
audioRoomSchema.pre('save', function(next) {
  if (this.participants) {
    this.metadata.totalParticipants = this.participants.length;
    this.metadata.peakParticipants = Math.max(
      this.metadata.peakParticipants || 0,
      this.participants.length
    );
  }
  next();
});

// Virtual for current participant count
audioRoomSchema.virtual('participantCount').get(function() {
  return this.participants ? this.participants.length : 0;
});

// Method to add participant
audioRoomSchema.methods.addParticipant = function(userId, userData) {
  const existingIndex = this.participants.findIndex(p => p.userId.toString() === userId.toString());
  
  if (existingIndex !== -1) {
    // Update existing participant
    this.participants[existingIndex] = {
      ...this.participants[existingIndex],
      ...userData,
      joinedAt: new Date()
    };
  } else {
    // Add new participant
    this.participants.push({
      userId,
      ...userData,
      joinedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to remove participant
audioRoomSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.userId.toString() !== userId.toString());
  
  // If no participants left, end the room
  if (this.participants.length === 0) {
    this.isActive = false;
    this.startedBy = null;
    this.startedAt = null;
  }
  
  return this.save();
};

// Method to update participant status
audioRoomSchema.methods.updateParticipantStatus = function(userId, updates) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (participant) {
    Object.assign(participant, updates);
    return this.save();
  }
  return Promise.reject(new Error('Participant not found'));
};

// Static method to find active audio rooms
audioRoomSchema.statics.findActiveRooms = function() {
  return this.find({ isActive: true }).populate('groupId', 'name');
};

// Static method to find audio room by group
audioRoomSchema.statics.findByGroup = function(groupId) {
  return this.findOne({ groupId }).populate('startedBy', 'name profilePicture');
};

// Static method to end all audio rooms for a group
audioRoomSchema.statics.endAllForGroup = function(groupId) {
  return this.updateMany(
    { groupId, isActive: true },
    { 
      isActive: false, 
      startedBy: null, 
      startedAt: null, 
      participants: [] 
    }
  );
};

const AudioRoom = mongoose.model('AudioRoom', audioRoomSchema);

export default AudioRoom; 