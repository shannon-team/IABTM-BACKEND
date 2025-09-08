import Group from '../models/groupModel.js';
import ApiError from '../utils/ApiError.js';
import { io } from '../../app.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import User from '../models/userModel.js';
import Message from '../models/messageModel.js'; // Added for getGroupMedia
import uploadOnCloudinary from '../utils/cloudinary.js'; // Added for updateGroupAvatar

export const editGroup = async (req, res) => {
  const { groupId, name, desc, privacy } = req.body;
  const userId = req.user.id;
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.map(String).includes(userId)) return res.status(403).json({ message: 'Only admins can edit group' });
    if (name) group.name = name;
    if (desc !== undefined) group.description = desc;
    if (privacy) group.privacy = privacy;
    await group.save();
    io.to(groupId).emit('group-updated', { groupId });
    res.status(200).json({ message: 'Group updated', group });
  } catch (err) {
    res.status(500).json({ message: 'Error editing group', error: err.message });
  }
};

export const addGroupMember = async (req, res) => {
  const { groupId, member, members } = req.body;
  const userId = req.user.id;
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.map(String).includes(userId)) return res.status(403).json({ message: 'Only admins can add members' });
    let added = false;
    if (Array.isArray(members)) {
      // Add multiple members
      for (const m of members) {
        if (!group.members.map(String).includes(m)) {
          group.members.push(m);
          added = true;
        }
      }
    } else if (member) {
      // Add single member
      if (!group.members.map(String).includes(member)) {
        group.members.push(member);
        added = true;
      }
    }
    if (added) await group.save();
    await group.populate('creator admins members', 'name email profilePicture isOnline');
    io.to(groupId).emit('group-updated', { groupId });
    res.status(200).json({ message: 'Member(s) added', group });
  } catch (err) {
    res.status(500).json({ message: 'Error adding member(s)', error: err.message });
  }
};

export const removeGroupMember = async (req, res) => {
  const { groupId, member } = req.body;
  const userId = req.user.id;
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.map(String).includes(userId)) return res.status(403).json({ message: 'Only admins can remove members' });
    group.members = group.members.filter(m => m.toString() !== member);
    await group.save();
    io.to(groupId).emit('group-updated', { groupId });
    res.status(200).json({ message: 'Member removed', group });
  } catch (err) {
    res.status(500).json({ message: 'Error removing member', error: err.message });
  }
};

export const deleteGroup = async (req, res) => {
  const { groupId } = req.body;
  const userId = req.user.id;
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.map(String).includes(userId)) return res.status(403).json({ message: 'Only admins can delete group' });
    await group.deleteOne();
    io.to(groupId).emit('group-deleted', { groupId });
    res.status(200).json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting group', error: err.message });
  }
};

export const getGroupDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const group = await Group.findById(id)
      .populate('members', '_id name profilePicture email')
      .populate('admins', '_id name profilePicture email');
    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.status(200).json({ group });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching group details', error: err.message });
  }
};

export const updateGroupAvatar = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No avatar file provided' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is admin
    if (!group.admins.map(String).includes(userId)) {
      return res.status(403).json({ success: false, message: 'Only admins can update group avatar' });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadOnCloudinary(req.file.path, 'group-avatars');
    if (!uploadResult) {
      return res.status(500).json({ success: false, message: 'Failed to upload avatar' });
    }

    // Update group avatar
    group.avatar = uploadResult.secure_url;
    await group.save();

    // Emit socket event
    if (req.io) {
      req.io.to(groupId).emit('group:avatar-updated', { groupId, avatar: uploadResult.secure_url });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Group avatar updated successfully',
      data: { avatar: uploadResult.secure_url }
    });
  } catch (error) {
    console.error('Error updating group avatar:', error);
    res.status(500).json({ success: false, message: 'Error updating group avatar' });
  }
};

export const updateGroupAnnouncement = async (req, res) => {
  const { groupId, announcement } = req.body;
  const userId = req.user.id;
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.map(String).includes(userId)) return res.status(403).json({ message: 'Only admins can update announcement' });
    group.announcement = announcement;
    await group.save();
    io.to(groupId).emit('group-updated', { groupId });
    res.status(200).json({ message: 'Announcement updated', group });
  } catch (err) {
    res.status(500).json({ message: 'Error updating announcement', error: err.message });
  }
};

export const promoteAdmin = async (req, res) => {
  const { groupId, userId: promoteId } = req.body;
  const userId = req.user.id;
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.map(String).includes(userId)) return res.status(403).json({ message: 'Only admins can promote' });
    if (!group.admins.map(String).includes(promoteId)) {
      group.admins.push(promoteId);
      await group.save();
      io.to(groupId).emit('group-updated', { groupId });
    }
    res.status(200).json({ message: 'User promoted to admin', group });
  } catch (err) {
    res.status(500).json({ message: 'Error promoting admin', error: err.message });
  }
};

export const demoteAdmin = async (req, res) => {
  const { groupId, userId: demoteId } = req.body;
  const userId = req.user.id;
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.map(String).includes(userId)) return res.status(403).json({ message: 'Only admins can demote' });
    group.admins = group.admins.filter(a => String(a) !== demoteId);
    await group.save();
    io.to(groupId).emit('group-updated', { groupId });
    res.status(200).json({ message: 'User demoted from admin', group });
  } catch (err) {
    res.status(500).json({ message: 'Error demoting admin', error: err.message });
  }
};

export const removeMember = async (req, res) => {
  const { groupId, memberId } = req.body;
  const userId = req.user.id;
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.map(String).includes(userId)) return res.status(403).json({ message: 'Only admins can remove members' });
    group.members = group.members.filter(m => String(m) !== memberId);
    group.admins = group.admins.filter(a => String(a) !== memberId); // Remove admin if admin is removed
    await group.save();
    io.to(groupId).emit('group-updated', { groupId });
    res.status(200).json({ message: 'Member removed', group });
  } catch (err) {
    res.status(500).json({ message: 'Error removing member', error: err.message });
  }
};

export const transferOwnership = async (req, res) => {
  const { groupId, newOwnerId } = req.body;
  const userId = req.user.id;
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.map(String).includes(userId)) return res.status(403).json({ message: 'Only admins can transfer ownership' });
    if (!group.admins.map(String).includes(newOwnerId)) group.admins.push(newOwnerId);
    // Optionally, demote current owner if you want single owner
    await group.save();
    io.to(groupId).emit('group-updated', { groupId });
    res.status(200).json({ message: 'Ownership transferred', group });
  } catch (err) {
    res.status(500).json({ message: 'Error transferring ownership', error: err.message });
  }
};

export const pinMessage = async (req, res) => {
  const { groupId, messageId } = req.body;
  const userId = req.user.id;
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.map(String).includes(userId)) return res.status(403).json({ message: 'Only admins can pin messages' });
    group.pinnedMessage = messageId;
    await group.save();
    io.to(groupId).emit('group-updated', { groupId });
    res.status(200).json({ message: 'Message pinned', group });
  } catch (err) {
    res.status(500).json({ message: 'Error pinning message', error: err.message });
  }
};

export const unpinMessage = async (req, res) => {
  const { groupId } = req.body;
  const userId = req.user.id;
  try {
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.admins.map(String).includes(userId)) return res.status(403).json({ message: 'Only admins can unpin messages' });
    group.pinnedMessage = undefined;
    await group.save();
    io.to(groupId).emit('group-updated', { groupId });
    res.status(200).json({ message: 'Message unpinned', group });
  } catch (err) {
    res.status(500).json({ message: 'Error unpinning message', error: err.message });
  }
};

// Leave group (user voluntarily leaves)
export const leaveGroup = async (req, res) => {
  const { groupId } = req.body;
  const userId = req.user.id;
  
  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ 
        success: false, 
        message: 'Group not found' 
      });
    }

    // Check if user is a member of the group
    if (!group.members.map(String).includes(userId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are not a member of this group' 
      });
    }

    // Remove user from members array
    group.members = group.members.filter(m => m.toString() !== userId);
    
    // Remove user from admins array if they are an admin
    group.admins = group.admins.filter(a => a.toString() !== userId);

    // If this was the last member, delete the group
    if (group.members.length === 0) {
      await group.deleteOne();
      io.to(groupId).emit('group-deleted', { groupId });
      return res.status(200).json({ 
        success: true, 
        message: 'Group deleted as you were the last member' 
      });
    }

    // If this was the last admin, promote the first member to admin
    if (group.admins.length === 0 && group.members.length > 0) {
      group.admins.push(group.members[0]);
    }

    await group.save();
    
    // Emit socket event to notify other members
    io.to(groupId).emit('group-updated', { 
      groupId, 
      action: 'member-left', 
      userId 
    });

    res.status(200).json({ 
      success: true, 
      message: 'Successfully left the group',
      data: {
        groupId,
        remainingMembers: group.members.length
      }
    });

  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error leaving group', 
      error: error.message 
    });
  }
};

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, description, isMicEnabled, members } = req.body;
    const userId = req.user.id;

    if (!name || !userId) {
      return res.status(400).json({ message: 'Group name and user ID are required.' });
    }

    // Ensure host is included
    let allMembers = Array.isArray(members) ? Array.from(new Set([userId, ...members])) : [userId];

    // Create group
    const group = new Group({
      name,
      description,
      creator: userId,
      admins: [userId],
      members: allMembers,
      isMicEnabled: !!isMicEnabled
    });
    await group.save();

    // Optionally, add group to user's groups array
    await User.findByIdAndUpdate(userId, { $addToSet: { groups: group._id } });

    // Populate for frontend
    await group.populate('creator admins members', 'name email profilePicture isOnline');

    // Calculate online count
    const memberCount = group.members.length;
    const onlineCount = group.members.filter(m => m.isOnline).length;

    res.status(201).json({ data: { ...group.toObject(), memberCount, onlineCount }, message: 'Group created successfully.' });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Error creating group', error: error.message });
  }
};

// Get all groups for the current user
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔍 getUserGroups called for user:', userId);
    
    const groups = await Group.find({ members: userId })
      .populate('creator admins members', 'name email profilePicture isOnline')
      .sort({ createdAt: -1 });
    
    console.log('📦 Found groups:', groups.length);
    
    // Add memberCount and onlineCount to each group
    const groupsWithCounts = groups.map(group => {
      const memberCount = group.members.length;
      const onlineCount = group.members.filter(m => m.isOnline).length;
      return { ...group.toObject(), memberCount, onlineCount };
    });
    
    console.log('✅ Returning groups with counts:', groupsWithCounts.length);
    
    res.status(200).json({ 
      success: true,
      message: 'Groups fetched successfully',
      data: groupsWithCounts 
    });
  } catch (error) {
    console.error('❌ Error in getUserGroups:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching groups', 
      error: error.message 
    });
  }
}; 

// Enhanced Group Management Functions

// Mute/Unmute group notifications
export const muteGroupNotifications = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const isMuting = req.method === 'POST'; // POST = mute, DELETE = unmute

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is member
    if (!group.members.map(String).includes(userId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    if (isMuting) {
      // Add to muted groups in user document
      await User.findByIdAndUpdate(userId, { 
        $addToSet: { mutedGroups: groupId } 
      });
      res.status(200).json({ 
        success: true, 
        message: 'Group notifications muted successfully' 
      });
    } else {
      // Remove from muted groups in user document
      await User.findByIdAndUpdate(userId, { 
        $pull: { mutedGroups: groupId } 
      });
      res.status(200).json({ 
        success: true, 
        message: 'Group notifications unmuted successfully' 
      });
    }
  } catch (error) {
    console.error('Error toggling group notifications:', error);
    res.status(500).json({ success: false, message: 'Error updating notification settings' });
  }
};

// Block group
export const blockGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Add to blocked groups in user document
    await User.findByIdAndUpdate(userId, { 
      $addToSet: { blockedGroups: groupId },
      $pull: { groups: groupId } // Remove from user's groups
    });

    // Remove user from group members
    group.members = group.members.filter(member => member.toString() !== userId);
    if (group.admins.includes(userId)) {
      group.admins = group.admins.filter(admin => admin.toString() !== userId);
    }
    await group.save();

    res.status(200).json({ 
      success: true, 
      message: 'Group blocked successfully' 
    });
  } catch (error) {
    console.error('Error blocking group:', error);
    res.status(500).json({ success: false, message: 'Error blocking group' });
  }
};

// Report group
export const reportGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Create report record (you might want to create a Report model)
    const report = {
      groupId,
      reportedBy: userId,
      reason,
      reportedAt: new Date(),
      status: 'pending'
    };

    // For now, we'll just log it. In a real app, you'd save to a reports collection
    console.log('Group reported:', report);

    res.status(200).json({ 
      success: true, 
      message: 'Group reported successfully' 
    });
  } catch (error) {
    console.error('Error reporting group:', error);
    res.status(500).json({ success: false, message: 'Error reporting group' });
  }
};

// Set chat background
export const setChatBackground = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { theme } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is member
    if (!group.members.map(String).includes(userId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    // Update user's chat background preference for this group
    await User.findByIdAndUpdate(userId, { 
      $set: { [`chatBackgrounds.${groupId}`]: theme } 
    });

    res.status(200).json({ 
      success: true, 
      message: 'Chat background set successfully' 
    });
  } catch (error) {
    console.error('Error setting chat background:', error);
    res.status(500).json({ success: false, message: 'Error setting chat background' });
  }
};

// Toggle join permissions
export const toggleJoinPermissions = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { isInviteOnly } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is admin
    if (!group.admins.map(String).includes(userId)) {
      return res.status(403).json({ success: false, message: 'Only admins can change join permissions' });
    }

    group.isInviteOnly = isInviteOnly;
    await group.save();

    // Emit socket event
    if (req.io) {
      req.io.to(groupId).emit('group:permissions-updated', { groupId, isInviteOnly });
    }

    res.status(200).json({ 
      success: true, 
      message: `Group is now ${isInviteOnly ? 'invite-only' : 'open to all'}` 
    });
  } catch (error) {
    console.error('Error toggling join permissions:', error);
    res.status(500).json({ success: false, message: 'Error updating join permissions' });
  }
};

// Generate invite link
export const generateInviteLink = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is admin
    if (!group.admins.map(String).includes(userId)) {
      return res.status(403).json({ success: false, message: 'Only admins can generate invite links' });
    }

    // Generate unique invite link
    const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const inviteLink = `${process.env.FRONTEND_URL}/join-group/${inviteCode}`;

    // Store invite link in group (you might want to create an Invite model)
    group.inviteLinks = group.inviteLinks || [];
    group.inviteLinks.push({
      code: inviteCode,
      createdBy: userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    await group.save();

    res.status(200).json({ 
      success: true, 
      message: 'Invite link generated successfully',
      data: { inviteLink }
    });
  } catch (error) {
    console.error('Error generating invite link:', error);
    res.status(500).json({ success: false, message: 'Error generating invite link' });
  }
};

// Edit group rules
export const editGroupRules = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { rules } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is admin
    if (!group.admins.map(String).includes(userId)) {
      return res.status(403).json({ success: false, message: 'Only admins can edit group rules' });
    }

    group.rules = rules;
    await group.save();

    // Emit socket event
    if (req.io) {
      req.io.to(groupId).emit('group:rules-updated', { groupId, rules });
    }

    res.status(200).json({ 
      success: true, 
      message: 'Group rules updated successfully' 
    });
  } catch (error) {
    console.error('Error editing group rules:', error);
    res.status(500).json({ success: false, message: 'Error updating group rules' });
  }
};

// Get audit log
export const getAuditLog = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is admin
    if (!group.admins.map(String).includes(userId)) {
      return res.status(403).json({ success: false, message: 'Only admins can view audit log' });
    }

    // For now, return a sample audit log. In a real app, you'd query an audit log collection
    const auditLog = [
      {
        action: 'member_added',
        userId: 'user123',
        userName: 'John Doe',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        details: 'Added by admin'
      },
      {
        action: 'message_deleted',
        userId: 'user456',
        userName: 'Jane Smith',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        details: 'Deleted inappropriate message'
      }
    ];

    res.status(200).json({ 
      success: true, 
      message: 'Audit log retrieved successfully',
      data: auditLog
    });
  } catch (error) {
    console.error('Error getting audit log:', error);
    res.status(500).json({ success: false, message: 'Error retrieving audit log' });
  }
};

// Get group media
export const getGroupMedia = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { type, search } = req.query;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if user is member
    if (!group.members.map(String).includes(userId)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    // Query messages with media for this group
    let query = { group: groupId, messageType: { $in: ['image', 'file', 'video', 'audio'] } };
    
    if (type && type !== 'all') {
      query.messageType = type;
    }

    if (search) {
      query.$or = [
        { content: { $regex: search, $options: 'i' } },
        { fileName: { $regex: search, $options: 'i' } }
      ];
    }

    const mediaMessages = await Message.find(query)
      .populate('sender', 'name profilePicture')
      .sort({ createdAt: -1 })
      .limit(50);

    // Transform to media format
    const media = mediaMessages.map(msg => ({
      id: msg._id,
      type: msg.messageType,
      url: msg.media?.url || msg.fileUrl,
      fileName: msg.media?.fileName || msg.fileName,
      fileSize: msg.media?.fileSize || msg.fileSize,
      uploadedBy: msg.sender,
      uploadedAt: msg.createdAt,
      thumbnail: msg.media?.thumbnail || msg.thumbnailUrl
    }));

    res.status(200).json({ 
      success: true, 
      message: 'Group media retrieved successfully',
      data: media
    });
  } catch (error) {
    console.error('Error getting group media:', error);
    res.status(500).json({ success: false, message: 'Error retrieving group media' });
  }
}; 