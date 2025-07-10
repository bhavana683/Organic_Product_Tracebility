const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const imageSearchController = require('../controllers/imageSearchController');

// POST /api/search-by-image
router.post('/search-by-image', upload.single('productImage'), imageSearchController.searchByImage);

module.exports = router;