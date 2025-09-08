import mongoose from 'mongoose';

const friendSchema = new mongoose.Schema({
    requester: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    recipient: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'rejected'], 
        default: 'pending' 
    },
}, { timestamps: true });

friendSchema.index({ requester: 1, recipient: 1 }, { unique: true });

const Friend = mongoose.model('Friend', friendSchema);

export default Friend;
