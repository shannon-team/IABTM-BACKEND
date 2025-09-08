import Playlist from '../models/playlistModel.js';
import User from '../models/userModel.js';

// CREATE a new playlist
export const createPlaylist = async (req, res) => {
    try {
        const { name, tracks } = req.body;
        const userId = req.user._id;

        const playlist = new Playlist({
            name,
            user: userId,
            tracks: Array.isArray(tracks) ? tracks : []
        });

        await playlist.save();

        req.user.playlists.push(playlist._id);
        await req.user.save();

        res.status(201).json(playlist);
    } catch (err) {
        console.error('Error creating playlist:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// READ all playlists for the logged-in user
export const getPlaylists = async (req, res) => {
    try {
        // console.log('Authenticated user:', req.user);
        const userId = req.user._id;

        const playlists = await Playlist.find({ user: userId }).populate('tracks');
        res.status(200).json(playlists);
    } catch (err) {
        console.error('Error fetching playlists:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// READ single playlist
export const getPlaylistById = async (req, res) => {
    try {
        const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id }).populate('tracks');
        if (!playlist) return res.status(404).json({ message: 'Playlist not found' });

        res.status(200).json(playlist);
    } catch (err) {
        console.error('Error getting playlist:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// UPDATE playlist
export const updatePlaylist = async (req, res) => {
    try {
        const { name, tracks } = req.body;

        const updateData = {
            ...(name && { name }),
            ...(tracks && { tracks: Array.isArray(tracks) ? tracks : [] })
        };

        const playlist = await Playlist.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            updateData,
            { new: true }
        );

        if (!playlist) return res.status(404).json({ message: 'Playlist not found or unauthorized' });

        res.status(200).json(playlist);
    } catch (err) {
        console.error('Error updating playlist:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE playlist
export const deletePlaylist = async (req, res) => {
    try {
        const playlist = await Playlist.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!playlist) return res.status(404).json({ message: 'Playlist not found or unauthorized' });

        // Remove playlist from user's list
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { playlists: req.params.id }
        });

        res.status(200).json({ message: 'Playlist deleted' });
    } catch (err) {
        console.error('Error deleting playlist:', err);
        res.status(500).json({ message: 'Server error' });
    }
};

//Delete Track from Playlist
export const deleteTrackFromPlaylist = async (req, res) => {
  try {
    const { trackId } = req.body;

    const playlist = await Playlist.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $pull: { tracks: { id: trackId } } },
      { new: true }
    );

    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found or unauthorized' });
    }

    res.status(200).json(playlist);
  } catch (err) {
    console.error('Error deleting track from playlist:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
