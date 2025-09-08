-- Supabase Real-time Configuration for Live Chat & Audio Rooms
-- Enables real-time subscriptions for 10,000+ concurrent users

-- ===========================================
-- ENABLE REAL-TIME EXTENSIONS
-- ===========================================

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE audio_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE audio_room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- ===========================================
-- REAL-TIME TRIGGERS FOR LIVE UPDATES
-- ===========================================

-- Function to broadcast user presence changes
CREATE OR REPLACE FUNCTION broadcast_user_presence()
RETURNS TRIGGER AS $$
BEGIN
    -- Broadcast to all users in the same groups
    PERFORM pg_notify(
        'user_presence_changed',
        json_build_object(
            'user_id', NEW.user_id,
            'status', NEW.status,
            'last_seen', NEW.last_seen,
            'current_room_id', NEW.current_room_id,
            'metadata', NEW.metadata
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user presence broadcasts
CREATE TRIGGER trigger_broadcast_user_presence
    AFTER INSERT OR UPDATE ON user_presence
    FOR EACH ROW EXECUTE FUNCTION broadcast_user_presence();

-- Function to broadcast new messages
CREATE OR REPLACE FUNCTION broadcast_new_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Broadcast to all group members
    PERFORM pg_notify(
        'new_message',
        json_build_object(
            'message_id', NEW.id,
            'group_id', NEW.group_id,
            'sender_id', NEW.sender_id,
            'content', NEW.content,
            'message_type', NEW.message_type,
            'created_at', NEW.created_at,
            'metadata', NEW.metadata
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new message broadcasts
CREATE TRIGGER trigger_broadcast_new_message
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION broadcast_new_message();

-- Function to broadcast message reactions
CREATE OR REPLACE FUNCTION broadcast_message_reaction()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'message_reaction',
        json_build_object(
            'message_id', NEW.message_id,
            'user_id', NEW.user_id,
            'reaction_type', NEW.reaction_type,
            'action', TG_OP
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for message reaction broadcasts
CREATE TRIGGER trigger_broadcast_message_reaction
    AFTER INSERT OR DELETE ON message_reactions
    FOR EACH ROW EXECUTE FUNCTION broadcast_message_reaction();

-- Function to broadcast audio room changes
CREATE OR REPLACE FUNCTION broadcast_audio_room_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'audio_room_changed',
        json_build_object(
            'room_id', NEW.id,
            'group_id', NEW.group_id,
            'status', NEW.status,
            'current_participants', NEW.current_participants,
            'action', TG_OP
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for audio room broadcasts
CREATE TRIGGER trigger_broadcast_audio_room
    AFTER INSERT OR UPDATE ON audio_rooms
    FOR EACH ROW EXECUTE FUNCTION broadcast_audio_room_change();

-- Function to broadcast audio room participant changes
CREATE OR REPLACE FUNCTION broadcast_audio_participant_change()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'audio_participant_changed',
        json_build_object(
            'room_id', NEW.room_id,
            'user_id', NEW.user_id,
            'status', NEW.status,
            'mic_enabled', NEW.mic_enabled,
            'speaker_enabled', NEW.speaker_enabled,
            'action', TG_OP
        )::text
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for audio participant broadcasts
CREATE TRIGGER trigger_broadcast_audio_participant
    AFTER INSERT OR UPDATE OR DELETE ON audio_room_participants
    FOR EACH ROW EXECUTE FUNCTION broadcast_audio_participant_change();

-- ===========================================
-- PRESENCE MANAGEMENT FUNCTIONS
-- ===========================================

-- Function to update user presence with heartbeat
CREATE OR REPLACE FUNCTION update_user_presence_heartbeat(
    p_user_id UUID,
    p_status VARCHAR(20) DEFAULT 'online',
    p_room_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO user_presence (user_id, status, last_seen, current_room_id)
    VALUES (p_user_id, p_status, NOW(), p_room_id)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        status = EXCLUDED.status,
        last_seen = EXCLUDED.last_seen,
        current_room_id = EXCLUDED.current_room_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark user as offline
CREATE OR REPLACE FUNCTION mark_user_offline(p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE user_presence 
    SET status = 'offline', last_seen = NOW(), current_room_id = NULL
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get online users in a group
CREATE OR REPLACE FUNCTION get_online_users_in_group(p_group_id UUID)
RETURNS TABLE (
    user_id UUID,
    username VARCHAR(50),
    full_name VARCHAR(100),
    avatar_url TEXT,
    status VARCHAR(20),
    last_seen TIMESTAMP WITH TIME ZONE,
    current_room_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        u.username,
        u.full_name,
        u.avatar_url,
        up.status,
        up.last_seen,
        up.current_room_id
    FROM user_presence up
    JOIN users u ON u.id = up.user_id
    JOIN group_members gm ON gm.user_id = up.user_id
    WHERE gm.group_id = p_group_id 
    AND up.status = 'online'
    AND up.last_seen > NOW() - INTERVAL '5 minutes'
    ORDER BY up.last_seen DESC;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- REAL-TIME SUBSCRIPTION HELPERS
-- ===========================================

-- Function to get recent messages for a group
CREATE OR REPLACE FUNCTION get_recent_messages(
    p_group_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    message_type VARCHAR(20),
    sender_id UUID,
    sender_name VARCHAR(100),
    sender_avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_edited BOOLEAN,
    reply_to_id UUID,
    metadata JSONB,
    reaction_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.content,
        m.message_type,
        m.sender_id,
        u.full_name as sender_name,
        u.avatar_url as sender_avatar,
        m.created_at,
        m.is_edited,
        m.reply_to_id,
        m.metadata,
        COALESCE(r.reaction_count, 0) as reaction_count
    FROM messages m
    JOIN users u ON u.id = m.sender_id
    LEFT JOIN (
        SELECT message_id, COUNT(*) as reaction_count
        FROM message_reactions
        GROUP BY message_id
    ) r ON r.message_id = m.id
    WHERE m.group_id = p_group_id
    ORDER BY m.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get audio room participants
CREATE OR REPLACE FUNCTION get_audio_room_participants(p_room_id UUID)
RETURNS TABLE (
    user_id UUID,
    username VARCHAR(50),
    full_name VARCHAR(100),
    avatar_url TEXT,
    status VARCHAR(20),
    mic_enabled BOOLEAN,
    speaker_enabled BOOLEAN,
    joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        arp.user_id,
        u.username,
        u.full_name,
        u.avatar_url,
        arp.status,
        arp.mic_enabled,
        arp.speaker_enabled,
        arp.joined_at
    FROM audio_room_participants arp
    JOIN users u ON u.id = arp.user_id
    WHERE arp.room_id = p_room_id
    AND arp.status != 'disconnected'
    ORDER BY arp.joined_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- ===========================================

-- Function to clean up old presence data
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
    -- Mark users as offline if they haven't been seen in 10 minutes
    UPDATE user_presence 
    SET status = 'offline', current_room_id = NULL
    WHERE last_seen < NOW() - INTERVAL '10 minutes'
    AND status != 'offline';
    
    -- Remove old audio room participants
    DELETE FROM audio_room_participants 
    WHERE left_at IS NOT NULL 
    AND left_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Function to archive old messages (for partitioning)
CREATE OR REPLACE FUNCTION archive_old_messages()
RETURNS void AS $$
BEGIN
    -- This function would be used to move old messages to archive tables
    -- Implementation depends on your archiving strategy
    NULL;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- SECURITY POLICIES FOR REAL-TIME
-- ===========================================

-- Row Level Security (RLS) policies for real-time access
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own data and public data
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

-- Policy for group members to see group data
CREATE POLICY "Group members can view group data" ON groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = groups.id 
            AND user_id = auth.uid()
        )
    );

-- Policy for messages (group members only)
CREATE POLICY "Group members can view messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = messages.group_id 
            AND user_id = auth.uid()
        )
    );

-- Policy for audio rooms (group members only)
CREATE POLICY "Group members can view audio rooms" ON audio_rooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = audio_rooms.group_id 
            AND user_id = auth.uid()
        )
    );

-- ===========================================
-- SCHEDULED TASKS
-- ===========================================

-- Schedule cleanup tasks (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-presence', '*/5 * * * *', 'SELECT cleanup_old_presence();');
-- SELECT cron.schedule('archive-messages', '0 2 * * 0', 'SELECT archive_old_messages();'); 