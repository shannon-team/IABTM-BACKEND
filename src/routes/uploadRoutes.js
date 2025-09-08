import express from 'express';
import { uploadChatFile, deleteChatFile, getFileInfo } from '../controllers/uploadController.js';
import { upload } from '../middlewares/multerMiddleware.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Upload chat file
router.post('/chat-file', 
  upload.single('file'), 
  uploadChatFile
);

// Delete chat file
router.delete('/chat-file/:fileId', deleteChatFile);

// Get file info
router.get('/chat-file/:fileId', getFileInfo);

export default router; 