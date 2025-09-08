-- Comprehensive Indexing Strategy for 10,000+ Concurrent Users
-- PostgreSQL/Supabase Performance Optimization

-- ===========================================
-- USERS TABLE INDEXES
-- ===========================================

-- Primary lookup by email (login)
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Username lookup
CREATE INDEX CONCURRENTLY idx_users_username ON users(username);

-- Status and last_seen for presence queries
CREATE INDEX CONCURRENTLY idx_users_status_last_seen ON users(status, last_seen DESC);

-- JSONB indexes for attributes and preferences
CREATE INDEX CONCURRENTLY idx_users_attributes_gin ON users USING GIN (attributes);
CREATE INDEX CONCURRENTLY idx_users_preferences_gin ON users USING GIN (preferences);

-- ===========================================
-- GROUPS TABLE INDEXES
-- ===========================================

-- Owner lookup
CREATE INDEX CONCURRENTLY idx_groups_owner_id ON groups(owner_id);

-- Public groups for discovery
CREATE INDEX CONCURRENTLY idx_groups_public ON groups(is_public) WHERE is_public = true;

-- Created date for sorting
CREATE INDEX CONCURRENTLY idx_groups_created_at ON groups(created_at DESC);

-- JSONB settings index
CREATE INDEX CONCURRENTLY idx_groups_settings_gin ON groups USING GIN (settings);

-- ===========================================
-- GROUP MEMBERS TABLE INDEXES
-- ===========================================

-- Primary lookup by group_id (most common query)
CREATE INDEX CONCURRENTLY idx_group_members_group_id ON group_members(group_id);

-- User's groups lookup
CREATE INDEX CONCURRENTLY idx_group_members_user_id ON group_members(user_id);

-- Role-based queries
CREATE INDEX CONCURRENTLY idx_group_members_role ON group_members(role);

-- Composite index for group member lookups
CREATE INDEX CONCURRENTLY idx_group_members_group_user ON group_members(group_id, user_id);

-- Activity tracking
CREATE INDEX CONCURRENTLY idx_group_members_last_activity ON group_members(last_activity DESC);

-- ===========================================
-- MESSAGES TABLE INDEXES (Partitioned)
-- ===========================================

-- Primary lookup by group_id and created_at (most common query)
CREATE INDEX CONCURRENTLY idx_messages_group_created ON messages(group_id, created_at DESC);

-- Sender lookup
CREATE INDEX CONCURRENTLY idx_messages_sender_id ON messages(sender_id);

-- Message type filtering
CREATE INDEX CONCURRENTLY idx_messages_type ON messages(message_type);

-- Reply chain lookup
CREATE INDEX CONCURRENTLY idx_messages_reply_to ON messages(reply_to_id);

-- Edited messages
CREATE INDEX CONCURRENTLY idx_messages_edited ON messages(is_edited) WHERE is_edited = true;

-- JSONB metadata index
CREATE INDEX CONCURRENTLY idx_messages_metadata_gin ON messages USING GIN (metadata);

-- Composite index for efficient pagination
CREATE INDEX CONCURRENTLY idx_messages_group_created_id ON messages(group_id, created_at DESC, id);

-- ===========================================
-- MESSAGE REACTIONS TABLE INDEXES
-- ===========================================

-- Message reactions lookup
CREATE INDEX CONCURRENTLY idx_message_reactions_message_id ON message_reactions(message_id);

-- User's reactions
CREATE INDEX CONCURRENTLY idx_message_reactions_user_id ON message_reactions(user_id);

-- Reaction type aggregation
CREATE INDEX CONCURRENTLY idx_message_reactions_type ON message_reactions(reaction_type);

-- Composite index for unique constraint
CREATE INDEX CONCURRENTLY idx_message_reactions_message_user_type ON message_reactions(message_id, user_id, reaction_type);

-- ===========================================
-- AUDIO ROOMS TABLE INDEXES
-- ===========================================

-- Group's audio rooms
CREATE INDEX CONCURRENTLY idx_audio_rooms_group_id ON audio_rooms(group_id);

-- Status-based queries
CREATE INDEX CONCURRENTLY idx_audio_rooms_status ON audio_rooms(status);

-- Created by user
CREATE INDEX CONCURRENTLY idx_audio_rooms_created_by ON audio_rooms(created_by);

-- Active rooms (most common query)
CREATE INDEX CONCURRENTLY idx_audio_rooms_active ON audio_rooms(status, created_at DESC) 
WHERE status IN ('live', 'connecting');

-- JSONB settings index
CREATE INDEX CONCURRENTLY idx_audio_rooms_settings_gin ON audio_rooms USING GIN (settings);

-- ===========================================
-- AUDIO ROOM PARTICIPANTS TABLE INDEXES
-- ===========================================

-- Room participants lookup
CREATE INDEX CONCURRENTLY idx_audio_room_participants_room_id ON audio_room_participants(room_id);

-- User's audio room participation
CREATE INDEX CONCURRENTLY idx_audio_room_participants_user_id ON audio_room_participants(user_id);

-- Status-based queries
CREATE INDEX CONCURRENTLY idx_audio_room_participants_status ON audio_room_participants(status);

-- Active participants
CREATE INDEX CONCURRENTLY idx_audio_room_participants_active ON audio_room_participants(room_id, status) 
WHERE status IN ('connected', 'speaking');

-- Composite index for unique constraint
CREATE INDEX CONCURRENTLY idx_audio_room_participants_room_user ON audio_room_participants(room_id, user_id);

-- ===========================================
-- USER PRESENCE TABLE INDEXES
-- ===========================================

-- Primary user presence lookup
CREATE INDEX CONCURRENTLY idx_user_presence_user_id ON user_presence(user_id);

-- Status-based queries
CREATE INDEX CONCURRENTLY idx_user_presence_status ON user_presence(status);

-- Online users (most common query)
CREATE INDEX CONCURRENTLY idx_user_presence_online ON user_presence(status, last_seen DESC) 
WHERE status = 'online';

-- Current room lookup
CREATE INDEX CONCURRENTLY idx_user_presence_current_room ON user_presence(current_room_id);

-- JSONB metadata index
CREATE INDEX CONCURRENTLY idx_user_presence_metadata_gin ON user_presence USING GIN (metadata);

-- ===========================================
-- PARTIAL INDEXES FOR COMMON QUERIES
-- ===========================================

-- Recent messages (last 30 days)
CREATE INDEX CONCURRENTLY idx_messages_recent ON messages(group_id, created_at DESC) 
WHERE created_at > NOW() - INTERVAL '30 days';

-- Active audio rooms
CREATE INDEX CONCURRENTLY idx_audio_rooms_live ON audio_rooms(id, current_participants) 
WHERE status = 'live';

-- Online users in specific rooms
CREATE INDEX CONCURRENTLY idx_user_presence_room_online ON user_presence(current_room_id, user_id) 
WHERE status = 'online';

-- ===========================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ===========================================

-- Group activity (messages + members)
CREATE INDEX CONCURRENTLY idx_group_activity ON messages(group_id, created_at DESC, sender_id);

-- User activity across groups
CREATE INDEX CONCURRENTLY idx_user_activity ON messages(sender_id, created_at DESC, group_id);

-- Audio room activity
CREATE INDEX CONCURRENTLY idx_audio_room_activity ON audio_room_participants(room_id, joined_at DESC, status);

-- ===========================================
-- FUNCTIONAL INDEXES
-- ===========================================

-- Case-insensitive username search
CREATE INDEX CONCURRENTLY idx_users_username_lower ON users(LOWER(username));

-- Message content length (for filtering)
CREATE INDEX CONCURRENTLY idx_messages_content_length ON messages(LENGTH(content));

-- Date-based partitioning helper
CREATE INDEX CONCURRENTLY idx_messages_date_partition ON messages(DATE(created_at));

-- ===========================================
-- STATISTICS AND MAINTENANCE
-- ===========================================

-- Update table statistics for query planner
ANALYZE users;
ANALYZE groups;
ANALYZE group_members;
ANALYZE messages;
ANALYZE message_reactions;
ANALYZE audio_rooms;
ANALYZE audio_room_participants;
ANALYZE user_presence;
ANALYZE message_search;

-- Create maintenance function for index optimization
CREATE OR REPLACE FUNCTION optimize_indexes()
RETURNS void AS $$
BEGIN
    -- Reindex critical indexes monthly
    REINDEX INDEX CONCURRENTLY idx_messages_group_created;
    REINDEX INDEX CONCURRENTLY idx_group_members_group_id;
    REINDEX INDEX CONCURRENTLY idx_user_presence_online;
    REINDEX INDEX CONCURRENTLY idx_audio_room_participants_room_id;
    
    -- Update statistics
    ANALYZE;
END;
$$ LANGUAGE plpgsql;

-- Schedule maintenance (run monthly)
-- SELECT cron.schedule('optimize-indexes', '0 2 1 * *', 'SELECT optimize_indexes();'); 