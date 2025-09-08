import Message from '../models/messageModel.js';
import { io } from '../../app.js';
import User from '../models/userModel.js';
import Group from '../models/groupModel.js';
import cloudinary from '../utils/cloudinary.js';
import fs from 'fs';
import mongoose from 'mongoose';

export const markMessageAsRead = async (req, res) => {
  const { messageId } = req.body;
  const userId = req.user.id;
  try {
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    
    // Check if user has already read this message
    const alreadyRead = message.readBy.some(read => read.user?.toString() === userId);
    if (!alreadyRead) {
      message.readBy.push({
        user: userId,
        readAt: new Date()
      });
      await message.save();
      if (message.group) {
        io.to(message.group.toString()).emit('message-read', { messageId, userId });
      }
    }
    res.status(200).json({ message: 'Message marked as read', messageId, userId });
  } catch (err) {
    res.status(500).json({ message: 'Error marking message as read', error: err.message });
  }
};

// Upload file to Cloudinary
const uploadToCloudinary = async (file, folder = 'chat-files') => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });
    
    // Clean up temp file
    fs.unlinkSync(file.path);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes
    };
  } catch (error) {
    // Clean up temp file on error
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw error;
  }
};

// Generate thumbnail for images
const generateThumbnail = async (publicId, format) => {
  try {
    const result = await cloudinary.uploader.explicit(publicId, {
      type: 'upload',
      eager: [
        { width: 300, height: 300, crop: 'fill', quality: 'auto:good' }
      ],
      eager_format: format
    });
    return result.eager[0].secure_url;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  }
};

// Send message with file
export const sendMessageWithFile = async (req, res) => {
  try {
    const { recipientId, groupId, content } = req.body;
    const senderId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    // Upload file to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file);
    
    // Determine message type
    const isImage = req.file.mimetype.startsWith('image/');
    const messageType = isImage ? 'image' : 'file';
    
    // Generate thumbnail for images
    let thumbnailUrl = null;
    if (isImage) {
      thumbnailUrl = await generateThumbnail(uploadResult.publicId, uploadResult.format);
    }
    
    // Create message data
    const messageData = {
      sender: senderId,
      content: content || '',
      messageType,
      fileUrl: uploadResult.url,
      fileName: req.file.originalname,
      fileSize: uploadResult.size,
      fileType: req.file.mimetype,
      thumbnailUrl
    };
    
    // Set recipient or group
    if (recipientId) {
      messageData.recipient = recipientId;
    } else if (groupId) {
      messageData.group = groupId;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either recipientId or groupId is required'
      });
    }
    
    // Save message
    const message = new Message(messageData);
    await message.save();
    
    // Populate sender info
    await message.populate('sender', 'name profilePicture');
    
    // Emit socket event
    if (req.io) {
      const room = groupId ? `group_${groupId}` : `chat_${[senderId, recipientId].sort().join('_')}`;
      req.io.to(room).emit('new_message', message);
    }
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });
    
  } catch (error) {
    console.error('Error sending message with file:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message with file',
      error: error.message
    });
  }
};

// Enhanced search with relevance scoring
export const searchMessages = async (req, res) => {
  try {
    const { query, recipientId, groupId, limit = 50, searchType = 'content' } = req.query;
    const userId = req.user.id;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }
    
    // Build search conditions with relevance scoring
    const searchConditions = {
      $or: [
        { content: { $regex: query, $options: 'i' } },
        { fileName: { $regex: query, $options: 'i' } }
      ]
    };
    
    // Add recipient/group conditions
    if (recipientId) {
      searchConditions.$or.push(
        { recipient: recipientId, sender: userId },
        { recipient: userId, sender: recipientId }
      );
    } else if (groupId) {
      searchConditions.group = groupId;
    } else {
      // Search all user's conversations
      searchConditions.$or.push(
        { recipient: userId },
        { sender: userId }
      );
    }
    
    // Execute search with aggregation for relevance scoring
    const messages = await Message.aggregate([
      { $match: searchConditions },
      {
        $addFields: {
          relevanceScore: {
            $add: [
              // Exact match bonus
              { $cond: [{ $regexMatch: { input: '$content', regex: `^${query}$`, options: 'i' } }, 10, 0] },
              // Starts with bonus
              { $cond: [{ $regexMatch: { input: '$content', regex: `^${query}`, options: 'i' } }, 5, 0] },
              // Contains bonus
              { $cond: [{ $regexMatch: { input: '$content', regex: query, options: 'i' } }, 3, 0] },
              // File name match bonus
              { $cond: [{ $regexMatch: { input: '$fileName', regex: query, options: 'i' } }, 2, 0] },
              // Recency bonus (newer messages get higher score)
              { $multiply: [{ $divide: [{ $subtract: [new Date(), '$createdAt'] }, 1000 * 60 * 60 * 24] }, -0.1] }
            ]
          }
        }
      },
      { $sort: { relevanceScore: -1, createdAt: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: 'sender',
          foreignField: '_id',
          as: 'sender'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'recipient',
          foreignField: '_id',
          as: 'recipient'
        }
      },
      {
        $lookup: {
          from: 'groups',
          localField: 'group',
          foreignField: '_id',
          as: 'group'
        }
      },
      {
        $addFields: {
          sender: { $arrayElemAt: ['$sender', 0] },
          recipient: { $arrayElemAt: ['$recipient', 0] },
          group: { $arrayElemAt: ['$group', 0] }
        }
      }
    ]);
    
    // Group messages by conversation with enhanced metadata
    const groupedResults = messages.reduce((acc, message) => {
      let conversationId;
      let conversationName;
      let conversationAvatar;
      let conversationType;
      
      if (message.group) {
        conversationId = `group_${message.group._id}`;
        conversationName = message.group.name;
        conversationAvatar = message.group.avatar;
        conversationType = 'group';
      } else {
        const otherUser = message.sender._id.toString() === userId ? message.recipient : message.sender;
        conversationId = `chat_${[userId, otherUser._id].sort().join('_')}`;
        conversationName = otherUser.name;
        conversationAvatar = otherUser.profilePicture;
        conversationType = 'personal';
      }
      
      if (!acc[conversationId]) {
        acc[conversationId] = {
          conversationId,
          conversationName,
          conversationAvatar,
          conversationType,
          messages: [],
          totalRelevanceScore: 0,
          messageCount: 0
        };
      }
      
      acc[conversationId].messages.push(message);
      acc[conversationId].totalRelevanceScore += message.relevanceScore;
      acc[conversationId].messageCount += 1;
      
      return acc;
    }, {});
    
    // Convert to array and sort by relevance and recency
    const results = Object.values(groupedResults).map(conversation => ({
      ...conversation,
      averageRelevanceScore: conversation.totalRelevanceScore / conversation.messageCount,
      messages: conversation.messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }));
    
    // Sort conversations by average relevance and most recent message
    results.sort((a, b) => {
      if (Math.abs(a.averageRelevanceScore - b.averageRelevanceScore) > 1) {
        return b.averageRelevanceScore - a.averageRelevanceScore;
      }
      return new Date(b.messages[0].createdAt) - new Date(a.messages[0].createdAt);
    });
    
    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: {
        results,
        totalResults: messages.length,
        query,
        searchType
      }
    });
    
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching messages',
      error: error.message
    });
  }
};

// Get messages between two users or in a group with cursor-based pagination
export const getMessages = async (req, res) => {
  try {
    const { recipientId, groupId, limit = 50, cursor } = req.query;
    const userId = req.user.id;
    
    console.log('🔍 getMessages called with:', { recipientId, groupId, limit, cursor, userId });
    
    let query = {};
    
    if (recipientId) {
      // Get messages between two users
      query = {
        $or: [
          { sender: userId, recipient: recipientId },
          { sender: recipientId, recipient: userId }
        ]
      };
      console.log('📱 Personal chat query:', query);
      console.log('📱 User ID type:', typeof userId, 'Value:', userId);
      console.log('📱 Recipient ID type:', typeof recipientId, 'Value:', recipientId);
    } else if (groupId) {
      // Validate if groupId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        console.log('❌ Invalid groupId format:', groupId);
        return res.status(400).json({
          success: false,
          message: 'Invalid group ID format. Group ID must be a valid MongoDB ObjectId.'
        });
      }
      
      // Get messages in a group
      query = { group: groupId };
      console.log('👥 Group chat query:', query);
    } else {
      console.log('❌ No recipientId or groupId provided');
      return res.status(400).json({
        success: false,
        message: 'Either recipientId or groupId is required'
      });
    }

    // Add cursor-based filtering if cursor is provided
    if (cursor) {
      try {
        const cursorDate = new Date(cursor);
        query.createdAt = { $lt: cursorDate };
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid cursor format. Cursor must be a valid date string.'
        });
      }
    }
    
    console.log('🔍 Executing query:', JSON.stringify(query, null, 2));
    
    // First, let's check if there are any messages at all
    const totalMessages = await Message.countDocuments({});
    console.log('📊 Total messages in database:', totalMessages);
    
    const messages = await Message.find(query)
      .populate('sender', 'name profilePicture')
      .populate('recipient', 'name profilePicture')
      .populate('group', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) + 1) // Get one extra to check if there are more
      .lean();
    
    console.log('📨 Found messages:', messages.length);
    console.log('📨 First few messages:', messages.slice(0, 3).map(m => ({ id: m._id, content: m.content?.substring(0, 50), sender: m.sender?.name })));
    
    // Check if there are more messages
    const hasMore = messages.length > parseInt(limit);
    const actualMessages = hasMore ? messages.slice(0, parseInt(limit)) : messages;
    
    // Get the cursor for the next page
    const nextCursor = actualMessages.length > 0 ? actualMessages[actualMessages.length - 1].createdAt : null;
    
    const responseData = {
      success: true,
      message: 'Messages retrieved successfully',
      data: actualMessages.reverse(), // Reverse to get chronological order
      pagination: {
        hasMore,
        nextCursor,
        limit: parseInt(limit)
      }
    };
    
    console.log('✅ Sending response with', actualMessages.length, 'messages');
    console.log('✅ Pagination:', { hasMore, nextCursor, limit: parseInt(limit) });
    
    res.status(200).json(responseData);
    
  } catch (error) {
    console.error('❌ Error getting messages:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error getting messages',
      error: error.message
    });
  }
};

// Mark messages as read (alternative to markMessageAsRead)
export const markAsRead = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user.id;
    
    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({
        success: false,
        message: 'Message IDs array is required'
      });
    }
    
    const result = await Message.updateMany(
      { 
        _id: { $in: messageIds },
        recipient: userId,
        'readBy.user': { $ne: userId }
      },
      { $push: { readBy: { user: userId, readAt: new Date() } } }
    );
    
    res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      data: { modifiedCount: result.modifiedCount }
    });
    
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking messages as read',
      error: error.message
    });
  }
}; 

// Get user conversations (personal chats)
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Getting conversations for user:', userId);
    
    // Get all messages where user is sender or recipient
    const messages = await Message.find({
      $or: [
        { sender: userId },
        { recipient: userId }
      ]
    })
    .populate('sender', 'name profilePicture')
    .populate('recipient', 'name profilePicture')
    .sort({ createdAt: -1 })
    .lean();
    
    console.log('Found messages:', messages.length);
    
    // Group messages by conversation (other user)
    const conversations = {};
    
    messages.forEach(message => {
      // Skip messages without proper sender/recipient data
      if (!message.sender || !message.recipient) {
        console.log('Skipping message with missing sender/recipient:', message._id);
        return;
      }
      
      let otherUserId;
      let otherUser;
      
      if (message.sender._id.toString() === userId) {
        otherUserId = message.recipient._id.toString();
        otherUser = message.recipient;
      } else {
        otherUserId = message.sender._id.toString();
        otherUser = message.sender;
      }
      
      if (!conversations[otherUserId]) {
        conversations[otherUserId] = {
          id: otherUserId,
          name: otherUser.name || 'Unknown User',
          type: 'personal',
          profilePicture: otherUser.profilePicture,
          lastMessage: message.content,
          lastMessageTime: message.createdAt,
          unreadCount: 0
        };
      }
      
      // Update last message if this one is more recent
      if (new Date(message.createdAt) > new Date(conversations[otherUserId].lastMessageTime)) {
        conversations[otherUserId].lastMessage = message.content;
        conversations[otherUserId].lastMessageTime = message.createdAt;
      }
      
      // Count unread messages
      if (message.sender._id.toString() !== userId && !message.readBy?.some(read => read.user && read.user.toString() === userId)) {
        conversations[otherUserId].unreadCount++;
      }
    });
    
    // Convert to array and sort by last message time
    const conversationsArray = Object.values(conversations).sort((a, b) => 
      new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );
    
    console.log('Returning conversations:', conversationsArray.length);
    
    res.status(200).json({
      success: true,
      message: 'Conversations retrieved successfully',
      data: conversationsArray
    });
    
  } catch (error) {
    console.error('Error getting user conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting user conversations',
      error: error.message
    });
  }
}; 