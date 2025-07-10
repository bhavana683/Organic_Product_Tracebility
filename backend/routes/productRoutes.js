/*
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const barcodeScanner = require('../services/barcodeScanner');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for local file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for image uploads
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WEBP images are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Text-based product search
router.get('/search', productController.searchProducts);

// Image-based product search
router.post('/search-by-image', 
  upload.single('productImage'), 
  productController.searchByImage
);

// Product verification
router.post('/verify', 
  upload.single('verificationImage'), 
  productController.verifyProduct
);

// Get product details

// Barcode-based product search

// Get product details
router.get('/:productId', productController.getProductDetails);

// Error handling middleware for file uploads
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'File upload error',
      message: err.message
    });
  } else if (err) {
    return res.status(500).json({
      error: 'Server error',
      message: err.message
    });
  }
  next();
});

module.exports = router;*/
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for local file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for image uploads
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WEBP images are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Text-based product search
router.get('/search', productController.searchProducts);

// Image-based product search
router.post('/search-by-image', 
  upload.single('productImage'), 
  productController.searchByImage
);

// Barcode-based product search
router.post('/search-by-barcode',
  upload.single('barcodeImage'),
  productController.searchByBarcode
);

// Product verification
router.post('/verify', 
  upload.single('verificationImage'), 
  productController.verifyProduct
);

// Get product details
router.get('/:productId', productController.getProductDetails);

// Error handling middleware for file uploads
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'File upload error',
      message: err.message
    });
  } else if (err) {
    return res.status(500).json({
      error: 'Server error',
      message: err.message
    });
  }
  next();
});

module.exports = router;