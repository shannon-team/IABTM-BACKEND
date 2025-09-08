import mongoose from 'mongoose';

const playlistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tracks: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  }
});

const Playlist = mongoose.model('Playlist', playlistSchema);
export default Playlist;
