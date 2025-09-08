import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    commentor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    post_type: {
        type: String,
        enum: ['article', 'masterclass' , 'post'],  
        required: true
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,  
        required: true
    },
    createdAt: {
        type: Date,
        default: new Date()
    }
});

const Comment = mongoose.model('Comment', commentSchema);

export default Comment;
