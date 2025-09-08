import mongoose from "mongoose";

const MediaProgressModel = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mediaId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    pathId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CuratedPath',
    },
    mediaType: {
        type: String,
        enum: ['FilmMedia', 'MusicMedia', 'ArtMedia'],
        required: true
    },
    isViewed: {
        type: Boolean,
        default: false
    },
    viewedAt: {
        type: Date
    }
}, { 
    timestamps: true,
    index: { userId: 1, mediaId: 1, mediaType: 1 }
});

// Compound index to ensure uniqueness
MediaProgressModel.index({ userId: 1, mediaId: 1, mediaType: 1 }, { unique: true });

const MediaProgress = mongoose.model('MediaProgress', MediaProgressModel);

export default MediaProgress;