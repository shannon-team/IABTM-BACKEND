import User from '../models/userModel.js';
import Message from '../models/messageModel.js';
import AudioRoom from '../models/audioRoomModel.js';
import Group from '../models/groupModel.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Optional Redis client for caching and pub/sub
let redis = null;

// Initialize Redis in the constructor
const initializeRedis = async () => {
    try {
        const Redis = (await import('ioredis')).default;
        redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            retryDelayOnClusterDown: 300,
            enableOfflineQueue: false
        });
        
        redis.on('error', (error) => {
            if (redis) {
                // Only log once to avoid spam
                if (!redis._errorLogged) {
                    console.log('⚠️ Redis connection error, using in-memory cache');
                    redis._errorLogged = true;
                }
                redis.disconnect();
                redis = null;
            }
        });
        
        redis.on('connect', () => {
            console.log('✅ Redis connected for caching');
        });
        
        redis.on('close', () => {
            console.log('⚠️ Redis connection closed, using in-memory cache');
            redis = null;
        });
        
        // Try to connect with timeout
        const connectPromise = redis.connect();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
        );
        
        await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
        console.log('⚠️ Redis not available, using in-memory cache');
        if (redis) {
            redis.disconnect();
            redis = null;
        }
    }
};

class RealtimeService {
    constructor(io) {
        // Initialize Redis (non-blocking and silent)
        initializeRedis().catch(() => {
            // Silent fail - Redis is optional
        });
        
        this.io = io;

        this.onlineUsers = new Map(); // userId -> Set of socketIds
        this.groupMembers = new Map(); // groupId -> Set of userIds
        this.audioRooms = new Map(); // roomId -> Set of userIds
        this.typingUsers = new Map(); // roomId -> Map<userId, timestamp>
        this.userSessions = new Map(); // socketId -> { userId, groups, rooms }

        this.setupMiddleware();
        this.setupEventHandlers();
        this.setupCleanupTasks();
    }

    // Setup Socket.IO middleware for authentication
    setupMiddleware() {
        // Middleware is now handled in the authenticate event
        // This allows for more flexible authentication handling
    }

    // Setup event handlers
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log('New client connected', socket.id);
            let userId = null;

            // Handle authentication (compatible with existing frontend)
            socket.on('authenticate', async () => {
                try {
                    const cookies = socket.handshake.headers.cookie;
                    if (!cookies) {
                        console.log('No cookies found for socket authentication');
                        socket.emit('auth_error', { message: 'No cookies found' });
                        return;
                    }
                    const token = cookies.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
                    if (!token) {
                        console.log('No token found in cookies');
                        socket.emit('auth_error', { message: 'No token provided' });
                        return;
                    }
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    socket.user = decoded;
                    userId = decoded.id;
                    socket.userId = userId;
                    
                    // Track online user
                    if (!this.onlineUsers.has(userId)) {
                        this.onlineUsers.set(userId, new Set());
                    }
                    this.onlineUsers.get(userId).add(socket.id);
                    
                    // Join personal room
                    socket.join(userId.toString());
                    console.log(`User ${userId} authenticated and joined their room`);
                    
                    // Set user online in DB
                    await User.findByIdAndUpdate(userId, { isOnline: true });
                    
                    // Emit presence to all connected users
                    this.io.emit('user-presence-update', { 
                        userId, 
                        isOnline: true 
                    });
                    
                    // Setup other event handlers after authentication
                    this.setupUserEvents(socket);
                    this.setupGroupEvents(socket);
                    this.setupAudioRoomEvents(socket);
                    this.setupMessageEvents(socket);
                    this.setupPresenceEvents(socket);
                    
                } catch (error) {
                    console.error('Socket authentication error:', error);
                    socket.emit('auth_error', { message: 'Invalid token' });
                }
            });

            // Handle room joining (compatible with existing frontend)
            socket.on('joinRoom', ({ roomName }) => {
                if (!userId) {
                    console.log('User not authenticated, cannot join room');
                    return;
                }
                socket.join(roomName);
                console.log(`User ${userId} joined room: ${roomName}`);
                // Track group membership
                if (!this.groupMembers.has(roomName)) {
                    this.groupMembers.set(roomName, new Set());
                }
                this.groupMembers.get(roomName).add(userId);
            });

            socket.on('leaveRoom', ({ roomName }) => {
                if (!userId) return;
                socket.leave(roomName);
                console.log(`User ${userId} left room: ${roomName}`);
                if (this.groupMembers.has(roomName)) {
                    this.groupMembers.get(roomName).delete(userId);
                }
            });
            
            socket.on('disconnect', () => {
                if (userId) {
                    this.handleDisconnection(socket);
                }
                console.log('Client disconnected', socket.id);
            });
        });
    }

    // Handle user connection (now handled in authenticate event)
    async handleConnection(socket) {
        // This is now handled in the authenticate event
        // Keeping for backward compatibility
    }

    // Handle user disconnection
    async handleDisconnection(socket) {
        const { userId } = socket;
        
        if (!userId) return;
        
        // Remove socket from user's socket set
        if (this.onlineUsers.has(userId)) {
            this.onlineUsers.get(userId).delete(socket.id);
            
            // If no more sockets for this user, mark as offline
            if (this.onlineUsers.get(userId).size === 0) {
                this.onlineUsers.delete(userId);
                await this.updateUserPresence(userId, 'offline');
                this.broadcastUserPresence(userId, 'offline');
            }
        }
        
        // Remove from all groups and rooms
        const session = this.userSessions.get(socket.id);
        if (session) {
            session.groups.forEach(groupId => {
                this.removeUserFromGroup(groupId, userId);
            });
            
            session.rooms.forEach(roomId => {
                this.removeUserFromAudioRoom(roomId, userId);
            });
        }
        
        // Clean up session
        this.userSessions.delete(socket.id);
        
        console.log(`User ${userId} disconnected`);
    }

    // Setup user-specific events
    setupUserEvents(socket) {
        // User typing indicator
        socket.on('typing-start', async (data) => {
            const { groupId, recipientId } = data;
            const roomId = groupId || `dm:${Math.min(socket.userId, recipientId)}:${Math.max(socket.userId, recipientId)}`;
            
            this.setTypingUser(roomId, socket.userId);
            socket.to(roomId).emit('typing-indicator', {
                userId: socket.userId,
                userName: socket.user.name,
                isTyping: true,
                roomId
            });
        });

        socket.on('typing-stop', (data) => {
            const { groupId, recipientId } = data;
            const roomId = groupId || `dm:${Math.min(socket.userId, recipientId)}:${Math.max(socket.userId, recipientId)}`;
            
            this.removeTypingUser(roomId, socket.userId);
            socket.to(roomId).emit('typing-indicator', {
                userId: socket.userId,
                isTyping: false,
                roomId
            });
        });

        // User status updates
        socket.on('status-update', async (data) => {
            const { status } = data;
            await this.updateUserPresence(socket.userId, status);
            this.broadcastUserPresence(socket.userId, status);
        });

        // User activity heartbeat
        socket.on('heartbeat', async () => {
            await this.updateUserPresence(socket.userId, 'online');
        });
    }

    // Setup group events
    setupGroupEvents(socket) {
        // Join group
        socket.on('join-group', async (data) => {
            const { groupId } = data;
            
            if (await this.isUserInGroup(socket.userId, groupId)) {
                socket.join(`group:${groupId}`);
                this.addUserToGroup(groupId, socket.userId);
                
                // Update session
                const session = this.userSessions.get(socket.id);
                if (session) {
                    session.groups.add(groupId);
                }
                
                socket.emit('group-joined', { groupId });
            }
        });

        // Leave group
        socket.on('leave-group', (data) => {
            const { groupId } = data;
            
            socket.leave(`group:${groupId}`);
            this.removeUserFromGroup(groupId, socket.userId);
            
            // Update session
            const session = this.userSessions.get(socket.id);
            if (session) {
                session.groups.delete(groupId);
            }
            
            socket.emit('group-left', { groupId });
        });
    }

    // Setup audio room events
    setupAudioRoomEvents(socket) {
        // Join audio room
        socket.on('join-audio-room', async (data) => {
            const { roomId } = data;
            
            try {
                // For now, just join the room without database validation
                // This can be enhanced later with proper room management
                
                // Join room
                socket.join(`audio-room:${roomId}`);
                this.addUserToAudioRoom(roomId, socket.userId);
                
                // Update session
                const session = this.userSessions.get(socket.id);
                if (session) {
                    session.rooms.add(roomId);
                }
                
                // Broadcast to room
                socket.to(`audio-room:${roomId}`).emit('user-joined-audio', {
                    userId: socket.userId,
                    userName: socket.user?.name || 'User',
                    userPicture: socket.user?.profilePicture
                });
                
                socket.emit('audio-room-joined', { roomId });
                
            } catch (error) {
                socket.emit('audio-room-error', { message: error.message });
            }
        });

        // Leave audio room
        socket.on('leave-audio-room', async (data) => {
            const { roomId } = data;
            
            socket.leave(`audio-room:${roomId}`);
            this.removeUserFromAudioRoom(roomId, socket.userId);
            
            // Update session
            const session = this.userSessions.get(socket.id);
            if (session) {
                session.rooms.delete(roomId);
            }
            
            // Broadcast to room
            socket.to(`audio-room:${roomId}`).emit('user-left-audio', {
                userId: socket.userId,
                userName: socket.user?.name || 'User'
            });
            
            socket.emit('audio-room-left', { roomId });
        });

        // Audio state updates
        socket.on('audio-state-update', async (data) => {
            const { roomId, micEnabled, speakerEnabled, isSpeaking } = data;
            
            try {
                // For now, just broadcast the state change
                // Database updates can be added later
                
                // Broadcast to room
                socket.to(`audio-room:${roomId}`).emit('audio-state-changed', {
                    userId: socket.userId,
                    micEnabled,
                    speakerEnabled,
                    isSpeaking
                });
                
            } catch (error) {
                console.error('Error updating audio state:', error);
            }
        });
    }

    // Setup message events
    setupMessageEvents(socket) {
        // Send message (compatible with existing frontend)
        socket.on('send_message', async (data, callback) => {
            try {
                console.log('Received send_message event:', data);
                const { roomName, text, groupId, recipientId } = data;
                
                if (!socket.userId) {
                    console.log('User not authenticated for message sending');
                    if (callback) callback({ success: false, error: 'User not authenticated' });
                    return;
                }
                
                if (!roomName || !text) {
                    console.log('Missing required fields for message sending');
                    if (callback) callback({ success: false, error: 'Missing roomName or text' });
                    return;
                }
                
                // Build message data
                const messageData = {
                    sender: socket.userId,
                    content: text.trim(),
                };
                
                // Handle group messages
                if (groupId) {
                    if (!mongoose.Types.ObjectId.isValid(groupId)) {
                        console.log('Invalid group ID format:', groupId);
                        if (callback) callback({ success: false, error: 'Invalid group ID format' });
                        return;
                    }
                    messageData.group = groupId;
                    console.log('Creating group message for group:', groupId);
                }
                
                // Handle personal messages
                if (recipientId) {
                    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
                        console.log('Invalid recipient ID format:', recipientId);
                        if (callback) callback({ success: false, error: 'Invalid recipient ID format' });
                        return;
                    }
                    messageData.recipient = recipientId;
                    console.log('Creating personal message for recipient:', recipientId);
                }
                
                // Infer recipient/group if not provided
                if (!groupId && !recipientId) {
                    const ids = roomName.split('_');
                    const otherId = ids.find(id => id !== socket.userId);
                    if (otherId && mongoose.Types.ObjectId.isValid(otherId)) {
                        messageData.recipient = otherId;
                        console.log('Inferred recipient from room name:', otherId);
                    } else if (roomName && mongoose.Types.ObjectId.isValid(roomName)) {
                        messageData.group = roomName;
                        console.log('Inferred group from room name:', roomName);
                    } else {
                        console.log('Could not infer recipient or group from room name:', roomName);
                        if (callback) callback({ success: false, error: 'Invalid room name format' });
                        return;
                    }
                }
                
                // Create and save message
                const message = new Message(messageData);
                await message.save();
                
                // Populate sender info
                await message.populate('sender', 'name profileName profilePicture');
                
                // Broadcast to room
                this.io.to(roomName).emit('receive_message', {
                    ...message.toJSON(),
                    roomName
                });
                
                // Clear typing indicator
                this.removeTypingUser(roomName, socket.userId);
                
                console.log('Message sent successfully:', message._id);
                if (callback) callback({ success: true, message: message.toJSON() });
                
            } catch (error) {
                console.error('Error sending message:', error);
                if (callback) callback({ success: false, error: error.message });
            }
        });

        // Also support the new format
        socket.on('send-message', async (data) => {
            const { content, groupId, recipientId, messageType = 'text', replyTo } = data;
            
            try {
                const messageData = {
                    content,
                    sender: socket.userId,
                    messageType,
                    replyTo
                };
                
                if (groupId) {
                    messageData.group = groupId;
                } else if (recipientId) {
                    messageData.recipient = recipientId;
                }
                
                const message = new Message(messageData);
                await message.save();
                
                // Populate sender info
                await message.populate('sender', 'name profileName profilePicture');
                
                // Broadcast to appropriate room
                const roomId = groupId || `dm:${Math.min(socket.userId, recipientId)}:${Math.max(socket.userId, recipientId)}`;
                
                this.io.to(roomId).emit('new-message', {
                    ...message.toJSON(),
                    roomId
                });
                
                // Clear typing indicator
                this.removeTypingUser(roomId, socket.userId);
                
            } catch (error) {
                socket.emit('message-error', { message: error.message });
            }
        });

        // Message reactions
        socket.on('add-reaction', async (data) => {
            const { messageId, emoji } = data;
            
            try {
                const message = await Message.findById(messageId);
                if (message) {
                    await message.addReaction(socket.userId, emoji);
                    
                    // Broadcast reaction
                    const roomId = message.group || `dm:${Math.min(message.sender, message.recipient)}:${Math.max(message.sender, message.recipient)}`;
                    this.io.to(roomId).emit('message-reaction', {
                        messageId,
                        userId: socket.userId,
                        emoji,
                        reactionSummary: message.reactionSummary
                    });
                }
            } catch (error) {
                socket.emit('reaction-error', { message: error.message });
            }
        });

        // Mark message as read
        socket.on('mark-read', async (data) => {
            const { messageId } = data;
            
            try {
                const message = await Message.findById(messageId);
                if (message) {
                    await message.markAsRead(socket.userId);
                    
                    // Broadcast read receipt
                    const roomId = message.group || `dm:${Math.min(message.sender, message.recipient)}:${Math.max(message.sender, message.recipient)}`;
                    this.io.to(roomId).emit('message-read', {
                        messageId,
                        userId: socket.userId,
                        readAt: new Date()
                    });
                }
            } catch (error) {
                console.error('Error marking message as read:', error);
            }
        });
    }

    // Setup presence events
    setupPresenceEvents(socket) {
        // Get online friends
        socket.on('get-online-friends', async () => {
            try {
                const user = await User.findById(socket.userId).populate('friends');
                const onlineFriends = user.friends.filter(friend => 
                    this.onlineUsers.has(friend._id.toString())
                );
                
                socket.emit('online-friends', onlineFriends);
            } catch (error) {
                console.error('Error getting online friends:', error);
            }
        });

        // Get group online members
        socket.on('get-group-online', async (data) => {
            const { groupId } = data;
            
            try {
                const onlineMembers = await this.getGroupOnlineMembers(groupId);
                socket.emit('group-online-members', {
                    groupId,
                    members: onlineMembers
                });
            } catch (error) {
                console.error('Error getting group online members:', error);
            }
        });
    }

    // Utility methods
    async updateUserPresence(userId, status) {
        try {
            await User.updateOne(
                { _id: userId },
                {
                    $set: {
                        isOnline: status === 'online',
                        status,
                        lastSeen: new Date()
                    }
                }
            );
            
            // Cache presence data (if Redis is available)
            if (redis) {
                await redis.setex(`presence:${userId}`, 300, JSON.stringify({
                    status,
                    lastSeen: new Date(),
                    isOnline: status === 'online'
                }));
            }
        } catch (error) {
            console.error('Error updating user presence:', error);
        }
    }

    broadcastUserPresence(userId, status) {
        const userData = {
            userId,
            status,
            lastSeen: new Date(),
            isOnline: status === 'online'
        };
        
        // Broadcast to all connected clients
        this.io.emit('user-presence-changed', userData);
    }

    setTypingUser(roomId, userId) {
        if (!this.typingUsers.has(roomId)) {
            this.typingUsers.set(roomId, new Map());
        }
        this.typingUsers.get(roomId).set(userId, Date.now());
    }

    removeTypingUser(roomId, userId) {
        if (this.typingUsers.has(roomId)) {
            this.typingUsers.get(roomId).delete(userId);
            if (this.typingUsers.get(roomId).size === 0) {
                this.typingUsers.delete(roomId);
            }
        }
    }

    addUserToGroup(groupId, userId) {
        if (!this.groupMembers.has(groupId)) {
            this.groupMembers.set(groupId, new Set());
        }
        this.groupMembers.get(groupId).add(userId);
    }

    removeUserFromGroup(groupId, userId) {
        if (this.groupMembers.has(groupId)) {
            this.groupMembers.get(groupId).delete(userId);
            if (this.groupMembers.get(groupId).size === 0) {
                this.groupMembers.delete(groupId);
            }
        }
    }

    addUserToAudioRoom(roomId, userId) {
        if (!this.audioRooms.has(roomId)) {
            this.audioRooms.set(roomId, new Set());
        }
        this.audioRooms.get(roomId).add(userId);
    }

    removeUserFromAudioRoom(roomId, userId) {
        if (this.audioRooms.has(roomId)) {
            this.audioRooms.get(roomId).delete(userId);
            if (this.audioRooms.get(roomId).size === 0) {
                this.audioRooms.delete(roomId);
            }
        }
    }

    async getUserGroups(userId) {
        // This would typically query your group membership
        // For now, returning empty array
        return [];
    }

    async isUserInGroup(userId, groupId) {
        // This would typically check group membership
        // For now, returning true
        return true;
    }

    async getGroupOnlineMembers(groupId) {
        const members = this.groupMembers.get(groupId) || new Set();
        const onlineMembers = [];
        
        for (const userId of members) {
            if (this.onlineUsers.has(userId)) {
                try {
                                    const user = await User.findById(userId)
                    .select('name profileName profilePicture status lastSeen')
                    .lean();
                    if (user) {
                        onlineMembers.push(user);
                    }
                } catch (error) {
                    console.error('Error getting user data:', error);
                }
            }
        }
        
        return onlineMembers;
    }

    // Setup cleanup tasks
    setupCleanupTasks() {
        // Clean up typing indicators every 5 seconds
        setInterval(() => {
            const now = Date.now();
            for (const [roomId, users] of this.typingUsers.entries()) {
                for (const [userId, timestamp] of users.entries()) {
                    if (now - timestamp > 5000) { // 5 seconds
                        users.delete(userId);
                        this.io.to(roomId).emit('typing-indicator', {
                            userId,
                            isTyping: false,
                            roomId
                        });
                    }
                }
                if (users.size === 0) {
                    this.typingUsers.delete(roomId);
                }
            }
        }, 5000);

        // Clean up offline users every 2 minutes
        setInterval(async () => {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            
            for (const [userId, sockets] of this.onlineUsers.entries()) {
                let hasActiveSocket = false;
                for (const socketId of sockets) {
                    const session = this.userSessions.get(socketId);
                    if (session && session.connectedAt > fiveMinutesAgo) {
                        hasActiveSocket = true;
                        break;
                    }
                }
                
                if (!hasActiveSocket) {
                    this.onlineUsers.delete(userId);
                    await this.updateUserPresence(userId, 'offline');
                    this.broadcastUserPresence(userId, 'offline');
                }
            }
        }, 2 * 60 * 1000);
    }

    // Get service statistics
    getStats() {
        return {
            onlineUsers: this.onlineUsers.size,
            totalSockets: this.io.engine.clientsCount,
            activeGroups: this.groupMembers.size,
            activeAudioRooms: this.audioRooms.size,
            typingUsers: this.typingUsers.size,
            activeSessions: this.userSessions.size
        };
    }
}

export default RealtimeService; 