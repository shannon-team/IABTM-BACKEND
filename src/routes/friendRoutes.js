import express from 'express';
import { 
    sendFriendRequest, 
    acceptFriendRequest, 
    rejectFriendRequest, 
    getFriends, 
    getPendingReceivedRequests, 
    getPendingSentRequests, 
    removeFriend
} from '../controllers/friendController.js';
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Send Friend Request
router.post('/send-request', authenticate ,sendFriendRequest);

// Accept Friend Request
router.post('/accept-request',authenticate, acceptFriendRequest);

// Reject Friend Request
router.post('/reject-request', authenticate, rejectFriendRequest);

// Get Friends List
router.get('/get-friends', authenticate, getFriends);

// Get Pending Received Friend Requests
router.get('/pending-received-requests', authenticate, getPendingReceivedRequests);

// Get Pending Sent Friend Requests
router.get('/pending-sent-requests', authenticate, getPendingSentRequests);

// remove friend 
router.post('/remove-friend', authenticate, removeFriend);

export default router;
