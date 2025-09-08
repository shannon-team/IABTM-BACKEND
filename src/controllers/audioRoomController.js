import Group from '../models/groupModel.js';
import User from '../models/userModel.js';
import ApiError from '../utils/ApiError.js';
// import ApiResponse from '../utils/ApiResponse.js';
import { ApiResponse } from '../utils/ApiResponse.js';


// Start an audio room
export const startAudioRoom = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user?.id;

    if (!groupId) {
      throw new ApiError(400, 'Group ID is required');
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check if user is a member of the group
    const isMember = group.members.some(member => 
      member._id.toString() === userId || member.toString() === userId
    );
    if (!isMember) {
      throw new ApiError(403, 'You are not a member of this group');
    }

    // Check if audio room is already active
    if (group.audioRoom?.isActive) {
      throw new ApiError(400, 'Audio room is already active');
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Start audio room
    group.audioRoom = {
        isActive: true,
        startedBy: userId,
        startedAt: new Date(),
        participants: [{
          userId: userId,
        joinedAt: new Date(),
          isMuted: false,
        isSpeaking: false
        }],
        maxParticipants: 50,
        settings: {
          allowAllToSpeak: true,
          requirePermissionToJoin: false,
          autoMuteOnJoin: false
        }
    };

    await group.save();

    return res.status(200).json(
      new ApiResponse(200, { 
        audioRoom: group.audioRoom,
        groupId 
      }, 'Audio room started successfully')
    );
  } catch (error) {
    console.error('Error starting audio room:', error);
    throw error;
  }
};

// Join an audio room
export const joinAudioRoom = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user?.id;

    if (!groupId) {
      throw new ApiError(400, 'Group ID is required');
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check if user is a member of the group
    const isMember = group.members.some(member => 
      member._id.toString() === userId || member.toString() === userId
    );
    if (!isMember) {
      throw new ApiError(403, 'You are not a member of this group');
    }

    // Check if audio room exists and is active
    if (!group.audioRoom?.isActive) {
      throw new ApiError(400, 'Audio room is not active');
    }

    // Check if user is already in the room
    const isAlreadyParticipant = group.audioRoom.participants.some(p => p.userId.toString() === userId);
    if (isAlreadyParticipant) {
      throw new ApiError(400, 'You are already in the audio room');
    }

    // Check if room is full
    if (group.audioRoom.participants.length >= group.audioRoom.maxParticipants) {
      throw new ApiError(400, 'Audio room is full');
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Add user to participants
    group.audioRoom.participants.push({
      userId: userId,
      joinedAt: new Date(),
      isMuted: group.audioRoom.settings.autoMuteOnJoin,
      isSpeaking: false
    });

    await group.save();

    return res.status(200).json(
      new ApiResponse(200, { 
        audioRoom: group.audioRoom,
        groupId 
      }, 'Joined audio room successfully')
    );
  } catch (error) {
    console.error('Error joining audio room:', error);
    throw error;
  }
};

// Leave an audio room
export const leaveAudioRoom = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user?.id;

    if (!groupId) {
      throw new ApiError(400, 'Group ID is required');
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check if audio room exists and is active
    if (!group.audioRoom?.isActive) {
      throw new ApiError(400, 'Audio room is not active');
    }

    // Remove user from participants
    group.audioRoom.participants = group.audioRoom.participants.filter(
      p => p.userId.toString() !== userId
    );

    // If no participants left, end the room
    if (group.audioRoom.participants.length === 0) {
      group.audioRoom.isActive = false;
      group.audioRoom.startedBy = null;
      group.audioRoom.startedAt = null;
    }

    await group.save();

    return res.status(200).json(
      new ApiResponse(200, { 
        audioRoom: group.audioRoom,
        groupId 
      }, 'Left audio room successfully')
    );
  } catch (error) {
    console.error('Error leaving audio room:', error);
    throw error;
  }
};

// End an audio room (admin/owner only)
export const endAudioRoom = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user?.id;

    if (!groupId) {
      throw new ApiError(400, 'Group ID is required');
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check if user is admin or owner
    const isAdmin = group.admins.some(admin => admin.toString() === userId);
    const isOwner = group.creator.toString() === userId;
    const isRoomStarter = group.audioRoom?.startedBy?.toString() === userId;

    if (!isAdmin && !isOwner && !isRoomStarter) {
      throw new ApiError(403, 'Only admins, owners, or room starters can end the audio room');
    }

    // End audio room
    group.audioRoom = {
      isActive: false,
      startedBy: null,
      startedAt: null,
      participants: [],
      maxParticipants: 50,
      settings: {
        allowAllToSpeak: true,
        requirePermissionToJoin: false,
        autoMuteOnJoin: false
      }
    };

    await group.save();

    return res.status(200).json(
      new ApiResponse(200, { 
        audioRoom: group.audioRoom,
        groupId 
      }, 'Audio room ended successfully')
    );
  } catch (error) {
    console.error('Error ending audio room:', error);
    throw error;
  }
};

// Get audio room status
export const getAudioRoomStatus = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?.id;

    if (!groupId) {
      throw new ApiError(400, 'Group ID is required');
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check if user is a member of the group
    const isMember = group.members.some(member => 
      member._id.toString() === userId || member.toString() === userId
    );
    if (!isMember) {
      throw new ApiError(403, 'You are not a member of this group');
    }

    return res.status(200).json(
      new ApiResponse(200, { 
        audioRoom: group.audioRoom || {
          isActive: false,
          participants: [],
          maxParticipants: 50
        },
        groupId 
      }, 'Audio room status retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting audio room status:', error);
    throw error;
  }
};

// Toggle mute status
export const toggleMute = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = req.user?.id;

    if (!groupId) {
      throw new ApiError(400, 'Group ID is required');
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check if audio room exists and is active
    if (!group.audioRoom?.isActive) {
      throw new ApiError(400, 'Audio room is not active');
    }

    // Find user in participants
    const participant = group.audioRoom.participants.find(p => p.userId.toString() === userId);
    if (!participant) {
      throw new ApiError(400, 'You are not in the audio room');
    }

    // Toggle mute status
    participant.isMuted = !participant.isMuted;
    await group.save();

    return res.status(200).json(
      new ApiResponse(200, { 
        isMuted: participant.isMuted,
        groupId 
      }, `Microphone ${participant.isMuted ? 'muted' : 'unmuted'} successfully`)
    );
  } catch (error) {
    console.error('Error toggling mute:', error);
    throw error;
  }
};

// Get audio room participants
export const getAudioRoomParticipants = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user?.id;

    if (!groupId) {
      throw new ApiError(400, 'Group ID is required');
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check if user is a member of the group
    const isMember = group.members.some(member => 
      member._id.toString() === userId || member.toString() === userId
    );
    if (!isMember) {
      throw new ApiError(403, 'You are not a member of this group');
    }

    // Get audio room
    const audioRoom = group.audioRoom;
    if (!audioRoom) {
      return res.status(200).json(
        new ApiResponse(200, { participants: [] }, 'No audio room found')
      );
    }

    return res.status(200).json(
      new ApiResponse(200, { 
        participants: audioRoom.participants 
      }, 'Audio room participants retrieved successfully')
    );
  } catch (error) {
    console.error('Error getting audio room participants:', error);
    return res.status(error.statusCode || 500).json(
      new ApiResponse(error.statusCode || 500, null, error.message)
    );
  }
};

// Mute a specific participant (admin only)
export const muteParticipant = async (req, res) => {
  try {
    const { groupId, targetUserId } = req.body;
    const userId = req.user?.id;

    if (!groupId || !targetUserId) {
      throw new ApiError(400, 'Group ID and target user ID are required');
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check if audio room exists and is active
    if (!group.audioRoom?.isActive) {
      throw new ApiError(400, 'Audio room is not active');
    }

    // Check if current user is the room owner
    const isOwner = group.creator.toString() === userId;
    const isRoomStarter = group.audioRoom?.startedBy?.toString() === userId;

    if (!isOwner && !isRoomStarter) {
      throw new ApiError(403, 'Only the room owner or room starter can mute participants');
    }

    // Find the target participant
    const participant = group.audioRoom.participants.find(p => p.userId.toString() === targetUserId);
    if (!participant) {
      throw new ApiError(404, 'Participant not found in audio room');
    }

    // Mute the participant
    participant.isMuted = true;
    await group.save();

    return res.status(200).json(
      new ApiResponse(200, { 
        audioRoom: group.audioRoom,
        mutedParticipant: participant
      }, 'Participant muted successfully')
    );
  } catch (error) {
    console.error('Error muting participant:', error);
    return res.status(error.statusCode || 500).json(
      new ApiResponse(error.statusCode || 500, null, error.message)
    );
  }
};

// Kick a participant from the audio room (admin only)
export const kickParticipant = async (req, res) => {
  try {
    const { groupId, targetUserId } = req.body;
    const userId = req.user?.id;

    if (!groupId || !targetUserId) {
      throw new ApiError(400, 'Group ID and target user ID are required');
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check if audio room exists and is active
    if (!group.audioRoom?.isActive) {
      throw new ApiError(400, 'Audio room is not active');
    }

    // Check if current user is the room owner
    const isOwner = group.creator.toString() === userId;
    const isRoomStarter = group.audioRoom?.startedBy?.toString() === userId;

    if (!isOwner && !isRoomStarter) {
      throw new ApiError(403, 'Only the room owner or room starter can kick participants');
    }

    // Find and remove the target participant
    const participantIndex = group.audioRoom.participants.findIndex(p => p.userId.toString() === targetUserId);
    if (participantIndex === -1) {
      throw new ApiError(404, 'Participant not found in audio room');
    }

    const kickedParticipant = group.audioRoom.participants[participantIndex];
    group.audioRoom.participants.splice(participantIndex, 1);

    // If no participants left, end the room
    if (group.audioRoom.participants.length === 0) {
      group.audioRoom.isActive = false;
      group.audioRoom.startedBy = null;
      group.audioRoom.startedAt = null;
    }

    await group.save();

    return res.status(200).json(
      new ApiResponse(200, { 
        audioRoom: group.audioRoom,
        kickedParticipant
      }, 'Participant kicked successfully')
    );
  } catch (error) {
    console.error('Error kicking participant:', error);
    return res.status(error.statusCode || 500).json(
      new ApiResponse(error.statusCode || 500, null, error.message)
    );
  }
};

// Transfer ownership of the audio room
export const transferOwnership = async (req, res) => {
  try {
    const { groupId, newOwnerId } = req.body;
    const userId = req.user?.id;

    if (!groupId || !newOwnerId) {
      throw new ApiError(400, 'Group ID and new owner ID are required');
    }

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      throw new ApiError(404, 'Group not found');
    }

    // Check if current user is the room owner
    const isOwner = group.creator.toString() === userId;
    const isRoomStarter = group.audioRoom?.startedBy?.toString() === userId;

    if (!isOwner && !isRoomStarter) {
      throw new ApiError(403, 'Only the room owner or room starter can transfer ownership');
    }

    // Check if new owner is a participant
    const newOwner = group.audioRoom.participants.find(p => p.userId.toString() === newOwnerId);
    if (!newOwner) {
      throw new ApiError(404, 'New owner must be a participant in the audio room');
    }

    // Get user details for new owner
    const user = await User.findById(newOwnerId);
    if (!user) {
      throw new ApiError(404, 'New owner user not found');
    }

    // Transfer ownership
    group.audioRoom.startedBy = newOwnerId;
    
    // Update participant admin status
    group.audioRoom.participants.forEach(participant => {
      if (participant.userId.toString() === newOwnerId) {
        participant.isAdmin = true;
      } else if (participant.userId.toString() === userId) {
        participant.isAdmin = false;
      }
    });

    await group.save();

    return res.status(200).json(
      new ApiResponse(200, { 
        audioRoom: group.audioRoom,
        newOwner: {
          userId: newOwnerId,
          name: user.name,
          profilePicture: user.profilePicture
        }
      }, 'Ownership transferred successfully')
    );
  } catch (error) {
    console.error('Error transferring ownership:', error);
    return res.status(error.statusCode || 500).json(
      new ApiResponse(error.statusCode || 500, null, error.message)
    );
  }
}; 

