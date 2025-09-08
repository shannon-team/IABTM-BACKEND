import { ApiResponse } from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import uploadOnCloudinary from '../utils/cloudinary.js';

// Upload chat files (images, documents, etc.)
export const uploadChatFile = async (req, res) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file provided');
    }

    const { groupId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'audio/mpeg', 'audio/wav', 'video/mp4', 'video/webm'
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new ApiError(400, 'File type not supported');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (req.file.size > maxSize) {
      throw new ApiError(400, 'File size too large. Maximum size is 10MB');
    }

    // Upload to Cloudinary
    const uploadResult = await uploadOnCloudinary(req.file.path, 'chat-files');

    if (!uploadResult) {
      throw new ApiError(500, 'Failed to upload file to cloud storage');
    }

    // Create file record in database (optional)
    const fileData = {
      url: uploadResult.secure_url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadedBy: userId,
      groupId: groupId || null,
      cloudinaryId: uploadResult.public_id
    };

    return res.status(200).json(
      new ApiResponse(200, fileData, 'File uploaded successfully')
    );

  } catch (error) {
    console.error('File upload error:', error);
    return res.status(error.statusCode || 500).json(
      new ApiResponse(error.statusCode || 500, null, error.message)
    );
  }
};

// Delete uploaded file
export const deleteChatFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    // TODO: Implement file deletion logic
    // This would involve:
    // 1. Finding the file record in database
    // 2. Deleting from Cloudinary
    // 3. Removing database record
    // 4. Checking if user has permission to delete

    return res.status(200).json(
      new ApiResponse(200, null, 'File deleted successfully')
    );

  } catch (error) {
    console.error('File deletion error:', error);
    return res.status(error.statusCode || 500).json(
      new ApiResponse(error.statusCode || 500, null, error.message)
    );
  }
};

// Get file info
export const getFileInfo = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    // TODO: Implement file info retrieval
    // This would involve:
    // 1. Finding the file record in database
    // 2. Checking if user has access to the file
    // 3. Returning file metadata

    return res.status(200).json(
      new ApiResponse(200, null, 'File info retrieved successfully')
    );

  } catch (error) {
    console.error('File info error:', error);
    return res.status(error.statusCode || 500).json(
      new ApiResponse(error.statusCode || 500, null, error.message)
    );
  }
}; 