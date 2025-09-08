import mongoose from "mongoose";

const curatedPathSchema = new mongoose.Schema({
    currentImagine: {
        type: String,
        required: true
    },
    selfImagine: {
        type: String,
        required: true
    },
    betterThrough: {
        type: String,
        required: true
    },
    numberOfContent: {
        type: Number,
        required: true
    },
    contentFinished: {
        type: Number,
        required: true,
        default: 0
    },
    curatedMedia: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CuratedMedia'
    }
})

const CuratedPath = mongoose.model('CuratedPath', curatedPathSchema);

export default CuratedPath;
