const imageProcessor = require('../utils/imageProcesssor');
const fs = require('fs');
const path = require('path');

exports.searchByImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No image uploaded',
        supportedFormats: ['JPG', 'JPEG', 'PNG', 'WEBP']
      });
    }

    const imagePath = req.file.path;
    const result = await imageProcessor.processImageSearch(imagePath);

    // Clean up uploaded file after processing
    fs.unlink(imagePath, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    if (!result.products || result.products.length === 0) {
      return res.status(404).json({
        error: 'No products found matching the image',
        searchQuery: result.searchQuery,
        suggestions: [
          'Try a clearer image of the product label',
          'Ensure the product name is visible',
          'Try searching by text if image search fails'
        ]
      });
    }

    res.json({
      success: true,
      searchQuery: result.searchQuery,
      products: result.products,
      imageUrl: result.imageUrl
    });
  } catch (error) {
    console.error('Image search error:', error);
    
    // Clean up file if it exists
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }

    res.status(500).json({ 
      error: error.message || 'Image search failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      supportedFormats: ['JPG', 'JPEG', 'PNG', 'WEBP']
    });
  }
};