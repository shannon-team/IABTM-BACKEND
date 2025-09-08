import Message from '../models/messageModel.js';
import Group from '../models/groupModel.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import fs from 'fs';
import path from 'path';

// Preview media
export const previewMedia = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(fileId)
      .populate('sender', 'name profilePicture')
      .populate('group', 'name');

    if (!message) {
      throw new ApiError(404, 'Media file not found');
    }

    // Check if user has access to this media
    if (message.group) {
      // Group message - check if user is member
      const isMember = message.group.members?.includes(userId);
      if (!isMember) {
        throw new ApiError(403, 'You do not have access to this media');
      }
    } else if (message.recipient) {
      // Direct message - check if user is sender or recipient
      if (message.sender._id.toString() !== userId && message.recipient.toString() !== userId) {
        throw new ApiError(403, 'You do not have access to this media');
      }
    }

    const mediaData = {
      id: message._id,
      type: message.messageType,
      url: message.media?.url || message.fileUrl,
      fileName: message.media?.fileName || message.fileName,
      fileSize: message.media?.fileSize || message.fileSize,
      fileType: message.media?.mimeType || message.fileType,
      thumbnail: message.media?.thumbnail || message.thumbnailUrl,
      uploadedBy: message.sender,
      uploadedAt: message.createdAt,
      group: message.group ? { id: message.group._id, name: message.group.name } : null
    };

    return res.status(200).json(
      new ApiResponse(200, mediaData, 'Media preview retrieved successfully')
    );
  } catch (error) {
    console.error('Error previewing media:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error previewing media'
    });
  }
};

// Download media
export const downloadMedia = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(fileId)
      .populate('sender', 'name profilePicture')
      .populate('group', 'name members');

    if (!message) {
      throw new ApiError(404, 'Media file not found');
    }

    // Check if user has access to this media
    if (message.group) {
      // Group message - check if user is member
      const isMember = message.group.members?.some(member => member.toString() === userId);
      if (!isMember) {
        throw new ApiError(403, 'You do not have access to this media');
      }
    } else if (message.recipient) {
      // Direct message - check if user is sender or recipient
      if (message.sender._id.toString() !== userId && message.recipient.toString() !== userId) {
        throw new ApiError(403, 'You do not have access to this media');
      }
    }

    const fileUrl = message.media?.url || message.fileUrl;
    const fileName = message.media?.fileName || message.fileName;

    if (!fileUrl) {
      throw new ApiError(404, 'File URL not found');
    }

    // For now, we'll redirect to the file URL
    // In a real implementation, you might want to stream the file or handle it differently
    res.redirect(fileUrl);

  } catch (error) {
    console.error('Error downloading media:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error downloading media'
    });
  }
};

// Delete media
export const deleteMedia = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(fileId)
      .populate('sender', 'name profilePicture')
      .populate('group', 'name members admins');

    if (!message) {
      throw new ApiError(404, 'Media file not found');
    }

    // Check permissions
    let canDelete = false;

    if (message.group) {
      // Group message - check if user is admin or the sender
      const isAdmin = message.group.admins?.some(admin => admin.toString() === userId);
      const isSender = message.sender._id.toString() === userId;
      canDelete = isAdmin || isSender;
    } else if (message.recipient) {
      // Direct message - only sender can delete
      canDelete = message.sender._id.toString() === userId;
    }

    if (!canDelete) {
      throw new ApiError(403, 'You do not have permission to delete this media');
    }

    // Delete the message
    await Message.findByIdAndDelete(fileId);

    // Emit socket event if it's a group message
    if (message.group && req.io) {
      req.io.to(message.group._id.toString()).emit('message:deleted', {
        messageId: fileId,
        groupId: message.group._id
      });
    }

    return res.status(200).json(
      new ApiResponse(200, null, 'Media deleted successfully')
    );
  } catch (error) {
    console.error('Error deleting media:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error deleting media'
    });
  }
};

// Search media
export const searchMedia = async (req, res) => {
  try {
    const { query, type, groupId } = req.query;
    const userId = req.user.id;

    let searchQuery = {};

    // Add group filter if specified
    if (groupId) {
      searchQuery.group = groupId;
    }

    // Add media type filter
    searchQuery.messageType = { $in: ['image', 'file', 'video', 'audio'] };

    // Add type filter if specified
    if (type && type !== 'all') {
      searchQuery.messageType = type;
    }

    // Add search query
    if (query) {
      searchQuery.$or = [
        { content: { $regex: query, $options: 'i' } },
        { fileName: { $regex: query, $options: 'i' } }
      ];
    }

    const mediaMessages = await Message.find(searchQuery)
      .populate('sender', 'name profilePicture')
      .populate('group', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const media = mediaMessages.map(msg => ({
      id: msg._id,
      type: msg.messageType,
      url: msg.media?.url || msg.fileUrl,
      fileName: msg.media?.fileName || msg.fileName,
      fileSize: msg.media?.fileSize || msg.fileSize,
      uploadedBy: msg.sender,
      uploadedAt: msg.createdAt,
      thumbnail: msg.media?.thumbnail || msg.thumbnailUrl,
      group: msg.group ? { id: msg.group._id, name: msg.group.name } : null
    }));

    return res.status(200).json(
      new ApiResponse(200, media, 'Media search completed successfully')
    );
  } catch (error) {
    console.error('Error searching media:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching media'
    });
  }
};

// Get media statistics
export const getMediaStatistics = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    // Check if user is member of the group
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(userId)) {
      throw new ApiError(403, 'You do not have access to this group');
    }

    // Get media statistics
    const stats = await Message.aggregate([
      { $match: { group: group._id, messageType: { $in: ['image', 'file', 'video', 'audio'] } } },
      { $group: { 
        _id: '$messageType', 
        count: { $sum: 1 },
        totalSize: { $sum: '$media.fileSize' }
      }},
      { $sort: { count: -1 } }
    ]);

    const statistics = {
      total: stats.reduce((sum, stat) => sum + stat.count, 0),
      byType: stats.reduce((acc, stat) => {
        acc[stat._id] = { count: stat.count, totalSize: stat.totalSize };
        return acc;
      }, {}),
      totalSize: stats.reduce((sum, stat) => sum + (stat.totalSize || 0), 0)
    };

    return res.status(200).json(
      new ApiResponse(200, statistics, 'Media statistics retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting media statistics:', error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error getting media statistics'
    });
  }
}; 