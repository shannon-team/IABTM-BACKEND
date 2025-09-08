import Message from '../models/messageModel.js';
import { io } from '../../app.js';
import createNotification from './createNotification.js';
import ApiError from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const sendMessage = async (req, res) => {
    const { recipientId, groupId, content } = req.body;

    try {
        const senderId = req.user.id

        console.log("sender id - ", senderId)

        if (!senderId || (!recipientId && !groupId) || !content) {
            throw new Error('Sender, recipient/group, and message content are required');
        }

        const messageData = {
            sender: senderId,
            content,
        };

        // Set recipient or group based on chat type
        if (groupId) {
            messageData.group = groupId;
        } else {
            messageData.recipient = recipientId;
        }

        const message = new Message(messageData);
        console.log("message is - ", message)
        await message.save();

        // Populate sender information
        await message.populate('sender', 'name profilePicture');
        await message.populate('recipient', 'name profilePicture');

        // Emit socket event based on chat type
        if (groupId) {
            io.to(groupId.toString()).emit('send_message', {
                _id: message._id,
                content: message.content,
                sender: message.sender,
                recipient: message.recipient,
                groupId: message.group,
                createdAt: message.createdAt,
                groupId: groupId
            });
        } else {
            // For personal chats, emit to both sender and recipient
            const roomName = [senderId, recipientId].sort().join('_');
            io.to(roomName).emit('send_message', {
                _id: message._id,
                content: message.content,
                sender: message.sender,
                recipient: message.recipient,
                recipientId: recipientId,
                createdAt: message.createdAt
            });
            
            // Also emit to individual user rooms for real-time updates
            io.to(recipientId.toString()).emit('new-message', {
                _id: message._id,
                content: message.content,
                sender: message.sender,
                recipient: message.recipient,
                recipientId: recipientId,
                createdAt: message.createdAt
            });
        }

        // Create notification for personal chats only
        if (recipientId && !message.read) {
            await createNotification(recipientId, 'CHAT', content, senderId);
        }

        return res.status(200).json(new ApiResponse(200, "Message sent successfully", message));
    } catch (error) {
        console.error('Error sending message:', error);
        return res.status(500).json(new ApiError(500, "Error sending message", error));
    }
};

export default sendMessage;
