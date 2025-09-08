import Comment from '../models/commentModel.js';
import mongoose from 'mongoose';
import createNotification from '../helpers/createNotification.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import Masterclass from '../models/masterClassModel.js';
import Post from '../models/postModel.js';
import Article from '../models/articleModel.js';
import { emitFeedEvent } from '../helpers/socketConnection.js';

export const createComment = async (req, res) => {
    const { postId } = req.params;
    const { content, post_type } = req.body;
    const commentor = req.user?.id;

    if (!postId || !content || !post_type) {
        return res.status(400).json(new ApiResponse(400, null, 'Missing required fields'));
    }

    const models = {
        masterclass: Masterclass,
        post: Post,
        article: Article,
    };

    const model = models[post_type];
    if (!model) {
        return res.status(400).json(new ApiResponse(400, null, `Invalid post_type: ${post_type}`));
    }

    try {
        const response = await model.findById(postId);
        if (!response) {
            return res.status(404).json(new ApiResponse(404, null, `Post not found with ID: ${postId}`));
        }

        const postUserId = post_type === "masterclass" ? response.expert.toString() : response.postedBy.toString();

        // Create the comment
        const newComment = new Comment({
            commentor,
            content,
            post_type,
            post: postId,
        });

        // Save the comment and update the post
        await newComment.save();
        response.comments.push(newComment._id);
        await response.save();

        // Populate the commentor field for the response
        await newComment.populate('commentor', 'name profileName profilePicture');

        // Emit real-time event for new post comment
        if (post_type === 'post') {
            emitFeedEvent('feed:new_comment', {
                postId,
                comment: {
                    _id: newComment._id,
                    commentor: newComment.commentor,
                    content,
                    createdAt: newComment.createdAt
                }
            });
        }

        // Send notification if the commenter is not the post owner
        if (commentor !== postUserId) {
            await createNotification(
                postUserId,
                'POST_ENGAGEMENT',
                `${req.user.name} commented on your post`,
                null,
                commentor
            );
        }

        return res.status(200).json(new ApiResponse(200, newComment, "Comment posted successfully!"));
    } catch (error) {
        console.error('Error creating comment:', error);
        return res.status(500).json(new ApiResponse(500, error, 'Error creating comment'));
    }
};


// Get all comments for a specific post
export const getCommentsByPost = async (req, res) => {
    const { postId } = req.params

    try {
        const comments = await Comment.find({ post: postId })
            .populate('commentor', 'name profileName profilePicture')
            .sort({ createdAt: -1 });

        return res.status(200).json(new ApiResponse(200, { comments }, "Comments fetched successfully!"));
    } catch (error) {
        console.error('Error fetching comments:', error);
        return res.status(500).json(new ApiResponse(500, error, 'Error fetching comments'));
    }
};

// Update a comment by ID
export const updateComment = async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body;
    const loggedInUserId = req.user.id;

    try {
        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.status(404).json(new ApiResponse(404, null, 'Comment not found'));
        }

        if (comment.commentor.toString() !== loggedInUserId) {
            return res.status(403).json(new ApiResponse(403, null, 'Unauthorized: You can only edit your own comment'));
        }

        comment.content = content;
        await comment.save();

        return res.status(200).json(new ApiResponse(200, comment, "Comment updated successfully!"));
    } catch (error) {
        console.error('Error updating comment:', error);
        return res.status(500).json(new ApiResponse(500, error, 'Error updating comment'));
    }
};

export const deleteComment = async (req, res) => {
    const { commentId } = req.params;
    const loggedInUserId = req.user.id;

    if (!commentId) {
        return res.status(400).json(new ApiResponse(400, null, 'Missing comment ID'));
    }

    try {
        const comment = await Comment.findById(commentId);

        if (!comment) {
            return res.status(404).json(new ApiResponse(404, null, 'Comment not found'));
        }

        if (comment.commentor.toString() !== loggedInUserId) {
            return res.status(403).json(new ApiResponse(403, null, 'Unauthorized: You can only delete your own comment'));
        }

        await Comment.deleteOne({ _id: commentId });

        const models = {
            masterclass: Masterclass,
            post: Post,
            article: Article,
        };

        const model = models[comment.post_type];
        if (model) {
            await model.findByIdAndUpdate(comment.post, {
                $pull: { comments: commentId },
            });
        }

        return res.status(200).json(new ApiResponse(200, null, "Comment deleted successfully!"));
    } catch (error) {
        console.error('Error deleting comment:', error);
        return res.status(500).json(new ApiResponse(500, error, 'Error deleting comment'));
    }
};

