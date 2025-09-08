import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isMicEnabled: { type: Boolean, default: false },
  // Enhanced pinned messages support
  pinnedMessages: [{
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      required: true
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    pinnedAt: {
      type: Date,
      default: Date.now
    },
    // Optional note about why it was pinned
    note: {
      type: String,
      maxlength: 200
    }
  }],
  // Audio Room specific fields
  audioRoom: {
    isActive: { type: Boolean, default: false },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startedAt: { type: Date },
    participants: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      joinedAt: { type: Date, default: Date.now },
      isMuted: { type: Boolean, default: false },
      isSpeaking: { type: Boolean, default: false },
      lastSpokeAt: { type: Date }
    }],
    maxParticipants: { type: Number, default: 50 },
    settings: {
      allowAllToSpeak: { type: Boolean, default: true },
      requirePermissionToJoin: { type: Boolean, default: false },
      autoMuteOnJoin: { type: Boolean, default: false }
    }
  },
  // Enhanced group settings
  avatar: { type: String },
  isInviteOnly: { type: Boolean, default: false },
  rules: { type: String },
  inviteLinks: [{
    code: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true }
  }],
  privacy: { type: String, enum: ['public', 'private'], default: 'public' }
}, { timestamps: true });

// Virtual for member count
groupSchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});

// Virtual for online count (will be updated via socket)
groupSchema.virtual('onlineCount').get(function() {
  return this.audioRoom && this.audioRoom.isActive ? this.audioRoom.participants.length : 0;
});

// Ensure virtuals are serialized
groupSchema.set('toJSON', { virtuals: true });
groupSchema.set('toObject', { virtuals: true });

const Group = mongoose.model('Group', groupSchema);
export default Group; 