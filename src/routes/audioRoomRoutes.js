import express from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { 
  startAudioRoom, 
  joinAudioRoom, 
  leaveAudioRoom, 
  endAudioRoom, 
  getAudioRoomStatus,
  toggleMute
} from '../controllers/audioRoomController.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticate);

// Start an audio room
router.post('/start', startAudioRoom);

// Join an audio room
router.post('/join', joinAudioRoom);

// Leave an audio room
router.post('/leave', leaveAudioRoom);

// End an audio room (admin/owner only)
router.post('/end', endAudioRoom);

// Get audio room status
router.get('/status/:groupId', getAudioRoomStatus);

// Toggle mute status
router.post('/toggle-mute', toggleMute);

export default router; 