import mongoose from "mongoose";

const artMediaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    productId: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true,
    },
});

const ArtMedia = mongoose.model('ArtMedia', artMediaSchema);

export default ArtMedia;
