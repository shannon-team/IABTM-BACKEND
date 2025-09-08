import mongoose from "mongoose";

const masterclassSchema = new mongoose.Schema({
    expert: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expert',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    tags: [
        {
            type: String
        }
    ],
    video: {
        type: String,
        required: true
    },
    views: [{
        count: {
            type: Number,
            default: 0
        },
        dateViewed: {
            type: Date,
            default: Date.now
        }
    }],
    viewedBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
    }]
});

const Masterclass = mongoose.model('Masterclass', masterclassSchema);

export default Masterclass;
