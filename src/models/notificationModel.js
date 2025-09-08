import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    // required: true
  },
  type: {
    type: String,
    enum: ['NEW_POST', 'POST_ENGAGEMENT', 'FRIEND_REQUEST', 'AGENCY_UPDATE' ,'CHAT'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  relatedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '48h' 
  }
});

const Notification = mongoose.model('Notification', NotificationSchema);

export default Notification;
