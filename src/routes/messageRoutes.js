import express from 'express';
import { authenticate } from "../middlewares/authMiddleware.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import sendMessage from '../helpers/sendMessage.js';
import { markMessageAsRead, sendMessageWithFile, searchMessages, getMessages, getUserConversations } from '../controllers/messageController.js';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = 'uploads/';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and common file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'application/zip', 'application/x-zip-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Get messages (for both personal and group chats)
router.get('/', authenticate, getMessages);

// Get user conversations (personal chats)
router.get('/conversations', authenticate, getUserConversations);

router.post('/send-message', authenticate, sendMessage);
router.post('/mark-read', authenticate, markMessageAsRead);

// Send message with file
router.post('/send-file', authenticate, upload.single('file'), sendMessageWithFile);

// Search messages
router.get('/search', authenticate, searchMessages);

export default router;