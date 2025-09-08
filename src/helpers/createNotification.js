import Notification from '../models/notificationModel.js';
import { io } from '../../app.js';

async function createNotification(recipientId, type, content, relatedPost = null, senderId = null) {
    try {
        if (!recipientId || !type || !content) {
            throw new Error('recipientId, type, and content are required');
        }

        if (type !== "CHAT") {
            const notification = new Notification({
                recipient: recipientId,
                type,
                content,
                relatedPost,
                sender: senderId
            });
            await notification.save();
        }

        if (type === "AGENCY_UPDATE") {
            io.emit('new_notification', content); 
        } else {
            io.to(recipientId.toString()).emit('new_notification', content); 
            io.to(recipientId.toString()).emit('notification-updated');
        }

        return { success: true, message: 'Notification sent successfully' };
    } catch (error) {
        console.error('Error creating notification:', error);
        return { success: false, message: 'Failed to create notification' };
    }
}

export default createNotification;
