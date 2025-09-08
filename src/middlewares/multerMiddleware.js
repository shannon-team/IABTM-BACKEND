import multer from "multer";
import fs from "fs";
import path from "path";

// Ensure temp directory exists
const tempDir = './public/temp';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = file.mimetype.split('/')[1]; 
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + fileExtension); 
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images and other common file types for chat
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/mpeg', 'audio/wav', 'video/mp4', 'video/webm'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not supported!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for chat files
    files: 5 // Maximum 5 files
  }
});

export { upload };

const uploadMiddleware = (req, res, next) => {
  upload.array('picture', 5)(req, res, function (err) {
    if (err) {
      console.log(err);
      return res.status(400).json({ 
        error: 'File upload failed', 
        details: err.message || err 
      });
    }

    if (req.files) {
      req.filenames = req.files.map(file => path.join(tempDir, file.filename));
    }

    next();
  });
};

export { uploadMiddleware };
