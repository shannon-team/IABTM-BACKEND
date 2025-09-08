import Friend from '../models/friendModel.js';
import User from '../models/userModel.js';
import ApiError from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import createNotification from '../helpers/createNotification.js';
import mongoose from 'mongoose';
// Send Friend Request
export const sendFriendRequest = async (req, res) => {
    const { recipientId } = req.body;
    const requesterId = req.user.id;
    // console.log("recipientId",recipientId)
    // console.log("requesterId",requesterId)
    if (!recipientId)  {
        return res.status(200).json(new ApiResponse(400, null, 'Recipient ID is required.'));
    }
    if(recipientId == requesterId)
        return res.status(200).json(new ApiResponse(400, null, 'You can not send friend request to yourself.'));

    try {
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(200).json(new ApiResponse(404, null, 'Recipient user not found.'));
        }

        const existingRequest = await Friend.findOne({ requester: requesterId, recipient: recipientId });
        if (existingRequest) return res.json(new ApiResponse(400, null, "Friend request already exists."));


        const newRequest = new Friend({ requester: requesterId, recipient: recipientId });


        const notification = await createNotification(
            recipientId,
            'FRIEND_REQUEST',
            `${req.user.name} sent you a friend request`,
            null,
            requesterId
        );

        await newRequest.save();

        return res.json(new ApiResponse(200, notification, "Friend request sent successfully."));
    } catch (error) {
        console.error('Error sending friend request:', error);
        throw new ApiError(500, "Internal server error.");
    }
};

// Accept Friend Request
export const acceptFriendRequest = async (req, res) => {
    const { requesterId } = req.body;
    const recipientId = req.user.id;

    try {
        console.log(requesterId)
        console.log(recipientId)

        const friendRequest = await Friend.findOne({ requester: requesterId, recipient: recipientId, status: 'pending' });
        if (!friendRequest) {
            return res.status(200).json(new ApiResponse(404, null, 'Friend request not found.'));
        }

        friendRequest.status = 'accepted';
        await friendRequest.save();
        const notification = await createNotification(
            requesterId,
            'FRIEND_REQUEST',
            `${req.user.name} accepted your friend request`,
            null,
            recipientId
        );
        return res.json(new ApiResponse(200, notification, "Friend request accepted."));
    } catch (error) {
        console.error('Error accepting friend request:', error);
        throw new ApiError(500, "Internal server error.");
    }
};

// Reject Friend Request
export const rejectFriendRequest = async (req, res) => {
    const { requesterId } = req.body;
    const recipientId = req.user.id;

    try {
        const friendRequest = await Friend.findOne({ requester: requesterId, recipient: recipientId, status: 'pending' });
        if (!friendRequest)  return res.status(200).json(new ApiResponse(404, 'Friend request not found.'));

        friendRequest.status = 'rejected';
        await friendRequest.save();
        const notification = await createNotification(
            requesterId,
            'FRIEND_REQUEST',
            `${req.user.name} rejected your friend request`,
            null,
            recipientId
        );
        return res.json(new ApiResponse(200, notification, "Friend request accepted."));
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        throw new ApiError(500, "Internal server error.");
    }
};

// List Friends
export const getFriends = async (req, res) => {
    const userId = req.user.id;

    try {
        // First, clean up any orphaned friend relationships
        await cleanupOrphanedFriends();

        const friends = await Friend.find({
            $or: [{ requester: userId }, { recipient: userId }],
            status: 'accepted'
        }).populate('requester recipient', 'name email profilePicture').lean();

        const friendsList = friends
            .filter(friend => friend.requester && friend.recipient) // Filter out any null populated data
            .map(friend => {
                const friendUser = friend.requester._id.toString() === userId ? friend.recipient : friend.requester;
                return {
                    id: friendUser._id,
                    name: friendUser.name,
                    email: friendUser.email,
                    profilePicture: friendUser.profilePicture,
                };
            });

        return res.json(new ApiResponse(200, friendsList, "Friends list retrieved successfully."));
    } catch (error) {
        console.error('Error fetching friends list:', error);
        throw new ApiError(500, "Internal server error.");
    }
};

// Cleanup function to remove orphaned friend relationships
const cleanupOrphanedFriends = async () => {
    try {
        // Find all friend relationships
        const allFriends = await Friend.find({}).populate('requester recipient').lean();
        
        // Find orphaned relationships (where either requester or recipient is null)
        const orphanedFriends = allFriends.filter(friend => !friend.requester || !friend.recipient);
        
        if (orphanedFriends.length > 0) {
            console.log(`Cleaning up ${orphanedFriends.length} orphaned friend relationships`);
            
            // Remove orphaned relationships
            const orphanedIds = orphanedFriends.map(friend => friend._id);
            await Friend.deleteMany({ _id: { $in: orphanedIds } });
            
            console.log('Orphaned friend relationships cleaned up successfully');
        }
    } catch (error) {
        console.error('Error cleaning up orphaned friends:', error);
        // Don't throw error here as it's just cleanup
    }
};

// Get all pending received friend requests
export const getPendingReceivedRequests = async (req, res) => {
    const userId = req.user.id;

    try {
        const pendingRequests = await Friend.find({
            recipient: userId,
            status: 'pending'
        }).populate('requester', 'name email profilePicture').lean();

        const requestsList = pendingRequests
            .filter(request => request.requester) // Filter out any null populated data
            .map(request => ({
                id: request._id,
                requesterId: request.requester._id,
                name: request.requester.name,
                email: request.requester.email,
                profilePicture: request.requester.profilePicture,
                createdAt: request.createdAt, // Friend request sent time
            }));

        return res.json(new ApiResponse(200, requestsList, "Pending received friend requests retrieved successfully."));
    } catch (error) {
        console.error('Error fetching pending received friend requests:', error);
        throw new ApiError(500, "Internal server error.");
    }
};

// Get all pending sent friend requests
export const getPendingSentRequests = async (req, res) => {
    const userId = req.user.id;

    try {
        const sentRequests = await Friend.find({
            requester: userId,
            status: 'pending'
        }).populate('recipient', 'name email profilePicture').lean();

        const requestsList = sentRequests
            .filter(request => request.recipient) // Filter out any null populated data
            .map(request => ({
                id: request._id,
                recipientId: request.recipient._id,
                name: request.recipient.name,
                email: request.recipient.email,
                profilePicture: request.recipient.profilePicture,
                createdAt: request.createdAt, // Friend request sent time
            }));

        return res.json(new ApiResponse(200, requestsList, "Pending sent friend requests retrieved successfully."));
    } catch (error) {
        console.error('Error fetching pending sent friend requests:', error);
        throw new ApiError(500, "Internal server error.");
    }
};
// Remove Friend
export const removeFriend = async (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.id;

    try {
        const result = await Friend.findOneAndDelete({
            $or: [
                { requester: userId, recipient: friendId },
                { requester: friendId, recipient: userId }
            ]
        });

        if (!result)  return res.status(200).json(new ApiResponse(404, null,'Friend request not found.'));

        return res.json(new ApiResponse(200, null, "Friend removed successfully."));
    } catch (error) {
        console.error('Error removing friend:', error);
        throw new ApiError(500, "Internal server error.");
    }
};
