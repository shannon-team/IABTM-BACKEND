import Message from "../models/messageModel.js";

const markMessageAsRead = async (messageId) => {
    try {
        const message = await Message.findOneAndUpdate(
            { _id: messageId },
            { read: true },
            { new: true } 
        );

        if (!message) {
            throw new Error('Message not found');
        }

        console.log(`Message ${messageId} marked as read.`);
        return { success: true, message: 'Message marked as read' };
    } catch (error) {
        console.error('Error marking message as read:', error);
        return { success: false, message: 'Failed to mark message as read' };
    }
};

export default markMessageAsRead;
