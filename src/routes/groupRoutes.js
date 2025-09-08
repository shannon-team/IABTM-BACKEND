import express from 'express';
import { createGroup, getUserGroups } from '../controllers/groupController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import {
  editGroup,
  addGroupMember,
  removeGroupMember,
  deleteGroup,
  getGroupDetails,
  updateGroupAvatar,
  updateGroupAnnouncement,
  promoteAdmin,
  demoteAdmin,
  removeMember,
  transferOwnership,
  pinMessage,
  unpinMessage,
  leaveGroup,
  // Enhanced group management functions
  muteGroupNotifications,
  blockGroup,
  reportGroup,
  setChatBackground,
  toggleJoinPermissions,
  generateInviteLink,
  editGroupRules,
  getAuditLog,
  getGroupMedia
} from '../controllers/groupController.js';
import { upload } from '../middlewares/multerMiddleware.js';

const router = express.Router();

// Create new group
router.post('/create', authenticate, createGroup);
// Get user's groups
router.get('/my-groups', authenticate, getUserGroups);
// Edit group details
router.post('/edit', authenticate, editGroup);
// Add member to group
router.post('/add-member', authenticate, addGroupMember);
// Remove member from group (old)
router.post('/remove-member', authenticate, removeGroupMember);
// Remove member from group (new, admin action)
router.patch('/remove-member', authenticate, removeMember);
// Leave group (user voluntarily leaves)
router.post('/leave', authenticate, leaveGroup);
// Delete group
router.post('/delete', authenticate, deleteGroup);
// Get group details
router.get('/:id', authenticate, getGroupDetails);
// Update group avatar
router.patch('/avatar', authenticate, upload.single('avatar'), updateGroupAvatar);
// Update group announcement
router.patch('/announcement', authenticate, updateGroupAnnouncement);

// Enhanced Group Management Routes

// Group Settings Routes
router.post('/:groupId/mute', authenticate, muteGroupNotifications);
router.delete('/:groupId/mute', authenticate, muteGroupNotifications); // Unmute group
router.post('/:groupId/block', authenticate, blockGroup);
router.post('/:groupId/report', authenticate, reportGroup);
router.post('/:groupId/background', authenticate, setChatBackground);

// Admin Panel Routes
router.patch('/:groupId/permissions', authenticate, toggleJoinPermissions);
router.post('/:groupId/invite-link', authenticate, generateInviteLink);
router.patch('/:groupId/rules', authenticate, editGroupRules);
router.get('/:groupId/audit-log', authenticate, getAuditLog);

// Media Management Routes
router.get('/:groupId/media', authenticate, getGroupMedia);

// Admin Management Routes
router.post('/promote-admin', authenticate, promoteAdmin);
router.post('/demote-admin', authenticate, demoteAdmin);
router.post('/transfer-ownership', authenticate, transferOwnership);

// Message Management Routes
router.post('/pin-message', authenticate, pinMessage);
router.post('/unpin-message', authenticate, unpinMessage);

export default router; 