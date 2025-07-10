/*const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary'); // Note .v1
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// For local storage (fallback)
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Cloudinary storage (primary)
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'organic-traceability',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit' }]
  }
});

// Use Cloudinary if configured, otherwise local storage
const storage = process.env.CLOUDINARY_CLOUD_NAME 
  ? cloudinaryStorage 
  : localStorage;

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WEBP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;*/
// backend/config/multer.js
/*
const multer = require('multer');
const path = require('path');
const cloudinary = require('./cloudinary'); // Now gets configured instance
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Local storage configuration
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

let storage = localStorage;

// Only use Cloudinary if properly configured
if (cloudinary.config().cloud_name) {
  try {
    storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'organic-traceability',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
        transformation: [{ width: 800, height: 800, crop: 'limit' }]
      }
    });
    console.log('✅ Using Cloudinary for file storage');
  } catch (error) {
    console.error('❌ Cloudinary storage setup failed:', error.message);
    console.log('Falling back to local storage');
  }
} else {
  console.log('ℹ️ Using local file storage');
}

module.exports = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, WEBP)'), false);
    }
  }
});*/

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;