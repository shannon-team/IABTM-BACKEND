import mongoose from "mongoose";

const articleSchema = new mongoose.Schema({
  postedBy: {
    id: {
      type: mongoose.Types.ObjectId,
      // required: true,
      refPath: 'postedBy.role'
    },
    role: {
      type: String,
      // required: true,
      enum: ['expert', 'superAdmin']
    }
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  publishStatus: {
    type: Boolean,
    default: false,
  },
  category: {
    type: String,
    required: true,
  },
  tags: {
    type: [String],
  },
  views: [
    {
      count: {
        type: Number,
        default: 0,
      },
      dateViewed: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  viewedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  }]
});

const Article = mongoose.model("Article", articleSchema);
export default Article;
