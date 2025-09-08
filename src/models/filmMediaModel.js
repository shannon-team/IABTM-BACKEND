import mongoose from "mongoose";

const filmMediaSchema = new mongoose.Schema({
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
    },
    videoLink: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String,
    },
    duration: {
        type: Number, // Duration in seconds
    }
});

const FilmMedia = mongoose.model('FilmMedia', filmMediaSchema);

export default FilmMedia;
