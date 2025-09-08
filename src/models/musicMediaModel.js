import mongoose from "mongoose";

const musicMediaSchema = new mongoose.Schema({
    globalMedia : {
        type : Boolean,
        default : false
    },
    title: {
        type: String,
        required: true
    },
    attributes: {
        currentSelf: {
            type: [String], 
        },
        imagineSelf: {
            type: [String], 
        },
        learningStyle: {
            type: [String],
        },
        mediaPreferences: {
            type: [String], 
        }
    },
    trackFile: {
        type: String,
        required: true,
    },
    coverImage: {
        type: String,
        required: true,
    },
    duration: {
        type: Number, // Duration in seconds
        default: 0
    }
});

const MusicMedia = mongoose.model('MusicMedia', musicMediaSchema);

export default MusicMedia;
