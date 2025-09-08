import mongoose from 'mongoose';;

const postSchema = new mongoose.Schema({
    content: {
        type: String
    },
    postedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    pictures: [{
        type: String
    }],
    hashtags: [{
        type: String
    }],
    applauds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true
    }],
    createdAt: {
        type: Date,
        default: new Date()
    },
    likes: {
        count: Number,
        likedBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }]
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }],
    topic: {
        type: String,
        index: true
    },
    likeCount: {
        type: Number,
        default: 0
    },
    commentCount: {
        type: Number,
        default: 0
    },
    // New fields for advanced algorithms
    qualityScore: {
        type: Number,
        default: 0,
        min: -1,
        max: 1
    },
    sentiment: {
        type: String,
        enum: ['positive', 'negative', 'neutral'],
        default: 'neutral'
    },
    sentimentScore: {
        type: Number,
        default: 0,
        min: -1,
        max: 1
    },
    cluster: {
        type: Number,
        default: 0
    },
    viralScore: {
        type: Number,
        default: 0
    },
    influenceScore: {
        type: Number,
        default: 0
    }
});

// Index for userId + createdAt (for user feeds)
postSchema.index({ postedBy: 1, createdAt: -1 });
// Index for topic + createdAt (for topic feeds)
postSchema.index({ topic: 1, createdAt: -1 });
// Index for quality and sentiment analysis
postSchema.index({ qualityScore: -1 });
postSchema.index({ sentiment: 1 });
postSchema.index({ viralScore: -1 });
postSchema.index({ influenceScore: -1 });
// Index for clustering
postSchema.index({ cluster: 1 });

// Pre-save middleware to ensure no duplicate applauds
postSchema.pre('save', function(next) {
    if (this.applauds && Array.isArray(this.applauds)) {
        // Remove duplicates from applauds array
        this.applauds = [...new Set(this.applauds.map(id => id.toString()))];
    }
    
    if (this.likes && this.likes.likedBy && Array.isArray(this.likes.likedBy)) {
        // Remove duplicates from likes array
        this.likes.likedBy = [...new Set(this.likes.likedBy.map(id => id.toString()))];
        // Update count to match actual length
        this.likes.count = this.likes.likedBy.length;
    }
    
    next();
});

export default mongoose.model('Post', postSchema);
