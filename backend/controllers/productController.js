/*
const Product = require('../models/Product');
const OrganicVerification = require('../services/organicVerification');
const jaivikBharat = require('../services/jaivikBharat');
const LogoVerification = require('../services/logoVerification');
const ImageProcessor = require('../utils/imageProcesssor');
const axios = require('axios');
const NodeCache = require('node-cache');
const path = require('path');

// Initialize cache with 10 minute TTL
const cache = new NodeCache({ stdTTL: 600 });

// Shared search function
async function performSearch(query, barcode) {
  const cacheKey = `search:${query || ''}:${barcode || ''}`;
  const cachedResults = cache.get(cacheKey);
  if (cachedResults) return cachedResults;

  const cleanBarcode = barcode ? barcode.replace(/\D/g, '') : null;
  const searchConditions = [];
  
  if (query) {
    searchConditions.push(
      { name: { $regex: query, $options: 'i' } },
      { brand: { $regex: query, $options: 'i' } },
      { 'certifications.issuer': { $regex: query, $options: 'i' } }
    );
  }
  
  if (cleanBarcode) {
    searchConditions.push({ barcode: cleanBarcode });
  }

  const localProducts = await Product.find({
    $or: searchConditions
  }).limit(20).lean();

  if (localProducts.length > 0) {
    cache.set(cacheKey, localProducts);
    return localProducts;
  }

  try {
    const searchTerm = query || cleanBarcode;
    const jaivikResults = await jaivikBharat.scrapeSearch(searchTerm);
    
    if (jaivikResults.length > 0) {
      Product.insertMany(jaivikResults).catch(err => 
        console.error('Error saving Jaivik products:', err)
      );
      cache.set(cacheKey, jaivikResults);
      return jaivikResults;
    }
  } catch (scrapeError) {
    console.error('Jaivik Bharat scrape error:', scrapeError);
  }

  try {
    const searchTerm = query || cleanBarcode;
    const apiResponse = await axios.get(
      `https://world.openfoodfacts.org/cgi/search.pl`,
      {
        params: {
          search_terms: searchTerm,
          json: 1,
          page_size: 20
        },
        timeout: 20000
      }
    );
    
    const organicProducts = (apiResponse.data.products || [])
      .filter(p => p && (p.labels_tags?.includes('en:organic') || p.ecoscore_grade === 'a'))
      .map(p => ({
        name: p.product_name || 'Unknown Product',
        brand: p.brands || 'Unknown Brand',
        barcode: p.code || '',
        organicPercentage: p.ecoscore_grade === 'a' ? 95 : 70,
        source: 'open-food-facts',
        imageUrl: p.image_url,
        // Add verification-specific fields
        certificationId: p.certification_id || `OFF-${p.code}`,
        verificationUrl: p.verification_url || `https://world.openfoodfacts.org/product/${p.code}`
      }));

    if (organicProducts.length > 0) {
      cache.set(cacheKey, organicProducts);
      return organicProducts;
    }
  } catch (apiError) {
    console.error('Open Food Facts API error:', apiError);
  }

  return [];
}

// ADDED MISSING FUNCTION
exports.createProduct = async (req, res) => {
  try {
    const productData = req.body;
    
    // Validate required fields
    if (!productData.name || !productData.barcode) {
      return res.status(400).json({
        success: false,
        message: 'Product name and barcode are required'
      });
    }

    // Check if product already exists
    const existingProduct = await Product.findOne({ barcode: productData.barcode });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this barcode already exists'
      });
    }

    const newProduct = new Product(productData);
    await newProduct.save();

    res.status(201).json({
      success: true,
      product: newProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      details: error.message
    });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { query, barcode } = req.query;
    if (!query && !barcode) {
      return res.status(400).json({ error: 'Query or barcode required' });
    }

    const products = await performSearch(query, barcode);
    if (products.length === 0) {
      return res.status(404).json({ message: 'No organic products found' });
    }
    res.json(products);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Search failed', 
      details: error.message
    });
  }
};

exports.searchByImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = req.file.path;
    const result = await ImageProcessor.processImageSearch(imagePath);
    
    res.json({
      success: true,
      imageUrl: `/uploads/${path.basename(imagePath)}`,
      products: result.products,
      searchQuery: result.searchQuery
    });
  } catch (error) {
    console.error('Image search error:', error);
    res.status(500).json({ 
      error: 'Image search failed', 
      details: error.message
    });
  }
};


exports.verifyProduct = async (req, res) => {
  try {
    const { barcode } = req.body;
    const imageFile = req.file;
    
    if (!barcode && !imageFile) {
      return res.status(400).json({ error: 'Barcode or image required' });
    }

    let imageUrl = null;
    if (imageFile) {
      // Use local path for development
      imageUrl = imageFile.path;
    }

    // Parallel verification with timeouts
    const verificationPromises = [];
    
    if (barcode) {
      verificationPromises.push(
        OrganicVerification.verifyProduct({ barcode })
          .catch(err => {
            console.error('Organic verification error:', err);
            return null;
          })
      );
    }
    
    if (imageUrl) {
      verificationPromises.push(
        LogoVerification.verifyLogo(imageUrl)
          .catch(err => {
            console.error('Logo verification error:', err);
            return null;
          })
      );
    }

    const [productVerification, logoVerification] = await Promise.all(verificationPromises);

    res.json({
      isOrganic: productVerification?.isOrganic || logoVerification?.verified || false,
      organicPercentage: productVerification?.percentage || 0,
      logoVerified: logoVerification?.verified || false,
      imageUrl: imageUrl,
      sources: productVerification?.sources || []
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      details: error.message
    });
  }
};

exports.getProductDetails = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ 
      error: 'Failed to get product', 
      details: error.message
    });
  }
};*/



/*
const Product = require('../models/Product');
const OrganicVerification = require('../services/organicVerification');
const jaivikBharat = require('../services/jaivikBharat');
const LogoVerification = require('../services/logoVerification');
const ImageProcessor = require('../utils/imageProcesssor');
const BarcodeScanner = require('../services/barcodeScanner');
const axios = require('axios');
const NodeCache = require('node-cache');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs').promises;

// Initialize cache with 10 minute TTL
const cache = new NodeCache({ stdTTL: 600 });

// Shared search function
async function performSearch(query, barcode) {
  const cacheKey = `search:${query || ''}:${barcode || ''}`;
  const cachedResults = cache.get(cacheKey);
  if (cachedResults) return cachedResults;

  const cleanBarcode = barcode ? barcode.replace(/\D/g, '') : null;
  const searchConditions = [];
  
  if (query) {
    searchConditions.push(
      { name: { $regex: query, $options: 'i' } },
      { brand: { $regex: query, $options: 'i' } },
      { 'certifications.issuer': { $regex: query, $options: 'i' } }
    );
  }
  
  if (cleanBarcode) {
    searchConditions.push({ barcode: cleanBarcode });
  }

  const localProducts = await Product.find({
    $or: searchConditions
  }).limit(20).lean();

  if (localProducts.length > 0) {
    cache.set(cacheKey, localProducts);
    return localProducts;
  }

  try {
    const searchTerm = query || cleanBarcode;
    const jaivikResults = await jaivikBharat.scrapeSearch(searchTerm);
    
    if (jaivikResults.length > 0) {
      Product.insertMany(jaivikResults).catch(err => 
        console.error('Error saving Jaivik products:', err)
      );
      cache.set(cacheKey, jaivikResults);
      return jaivikResults;
    }
  } catch (scrapeError) {
    console.error('Jaivik Bharat scrape error:', scrapeError);
  }

  try {
    const searchTerm = query || cleanBarcode;
    const apiResponse = await axios.get(
      `https://world.openfoodfacts.org/cgi/search.pl`,
      {
        params: {
          search_terms: searchTerm,
          json: 1,
          page_size: 20
        },
        timeout: 20000
      }
    );
    
    const organicProducts = (apiResponse.data.products || [])
      .filter(p => p && (p.labels_tags?.includes('en:organic') || p.ecoscore_grade === 'a'))
      .map(p => ({
        name: p.product_name || 'Unknown Product',
        brand: p.brands || 'Unknown Brand',
        barcode: p.code || '',
        organicPercentage: p.ecoscore_grade === 'a' ? 95 : 70,
        source: 'open-food-facts',
        imageUrl: p.image_url,
        certificationId: p.certification_id || `OFF-${p.code}`,
        verificationUrl: p.verification_url || `https://world.openfoodfacts.org/product/${p.code}`
      }));

    if (organicProducts.length > 0) {
      cache.set(cacheKey, organicProducts);
      return organicProducts;
    }
  } catch (apiError) {
    console.error('Open Food Facts API error:', apiError);
  }

  return [];
}

exports.createProduct = async (req, res) => {
  try {
    const productData = req.body;
    
    // Validate required fields
    if (!productData.name || !productData.barcode) {
      return res.status(400).json({
        success: false,
        message: 'Product name and barcode are required'
      });
    }

    // Check if product already exists
    const existingProduct = await Product.findOne({ barcode: productData.barcode });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this barcode already exists'
      });
    }

    const newProduct = new Product(productData);
    await newProduct.save();

    res.status(201).json({
      success: true,
      product: newProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      details: error.message
    });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { query, barcode } = req.query;
    if (!query && !barcode) {
      return res.status(400).json({ error: 'Query or barcode required' });
    }

    const products = await performSearch(query, barcode);
    if (products.length === 0) {
      return res.status(404).json({ message: 'No organic products found' });
    }
    res.json(products);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Search failed', 
      details: error.message
    });
  }
};

exports.searchByImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = req.file.path;
    const result = await ImageProcessor.processImageSearch(imagePath);
    
    res.json({
      success: true,
      imageUrl: `/uploads/${path.basename(imagePath)}`,
      products: result.products,
      searchQuery: result.searchQuery
    });
  } catch (error) {
    console.error('Image search error:', error);
    res.status(500).json({ 
      error: 'Image search failed', 
      details: error.message
    });
  }
};

exports.searchByBarcode = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No barcode image provided',
        supportedFormats: ['JPG', 'JPEG', 'PNG']
      });
    }

    // Enhanced image validation
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ 
        error: 'Image too large (max 5MB)'
      });
    }

    // Preprocess image for better scanning
    const preprocessedImage = await sharp(req.file.path)
      .greyscale()
      .linear(1.2, 0) // Increase contrast
      .normalize()
      .sharpen()
      .threshold(128) // Binarize image
      .resize(1200, 1200, { 
        fit: 'contain', 
        background: { r: 255, g: 255, b: 255 } 
      })
      .toBuffer();

    // Save preprocessed image temporarily
    const processedPath = path.join(path.dirname(req.file.path), `processed-${path.basename(req.file.path)}`);
    await fs.writeFile(processedPath, preprocessedImage);

    // First scan attempt
    let scanResult = await BarcodeScanner.scanFromImage(processedPath);
    
    // If first attempt fails, try inverted colors
    if (!scanResult.success) {
      // Create inverted image
      const invertedImage = await sharp(preprocessedImage)
        .negate()
        .toBuffer();
      
      const invertedPath = path.join(path.dirname(req.file.path), `inverted-${path.basename(req.file.path)}`);
      await fs.writeFile(invertedPath, invertedImage);
      
      scanResult = await BarcodeScanner.scanFromImage(invertedPath);
      
      // Clean up inverted image
      await fs.unlink(invertedPath).catch(console.error);
    }

    // Clean up processed image
    await fs.unlink(processedPath).catch(console.error);

    if (!scanResult.success) {
      return res.status(400).json({
        error: scanResult.error || 'No barcode detected',
        details: scanResult.details,
        suggestions: [
          'Ensure the barcode is clearly visible and fills at least 30% of the image',
          'Try taking a higher resolution image',
          'Avoid glare and shadows on the barcode',
          'Position the barcode horizontally'
        ]
      });
    }

    // Search products using the scanned barcode
    const products = await performSearch(null, scanResult.barcode);
    
    res.json({
      success: true,
      barcode: scanResult.barcode,
      format: scanResult.format,
      products: products.length > 0 ? products : [],
      message: products.length === 0 ? 
        'No products found for this barcode' : 
        `${products.length} products found`
    });
  } catch (error) {
    console.error('Barcode search error:', error);
    res.status(500).json({ 
      error: 'Barcode processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      supportContact: 'support@organicverify.com'
    });
  }
};

exports.verifyProduct = async (req, res) => {
  try {
    const { barcode } = req.body;
    const imageFile = req.file;
    
    if (!barcode && !imageFile) {
      return res.status(400).json({ error: 'Barcode or image required' });
    }

    let imageUrl = null;
    if (imageFile) {
      // Use local path for development
      imageUrl = imageFile.path;
    }

    // Parallel verification with timeouts
    const verificationPromises = [];
    
    if (barcode) {
      verificationPromises.push(
        OrganicVerification.verifyProduct({ barcode })
          .catch(err => {
            console.error('Organic verification error:', err);
            return null;
          })
      );
    }
    
    if (imageUrl) {
      verificationPromises.push(
        LogoVerification.verifyLogo(imageUrl)
          .catch(err => {
            console.error('Logo verification error:', err);
            return null;
          })
      );
    }

    const [productVerification, logoVerification] = await Promise.all(verificationPromises);

    res.json({
      isOrganic: productVerification?.isOrganic || logoVerification?.verified || false,
      organicPercentage: productVerification?.percentage || 0,
      logoVerified: logoVerification?.verified || false,
      imageUrl: imageUrl,
      sources: productVerification?.sources || []
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      details: error.message
    });
  }
};

exports.getProductDetails = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ 
      error: 'Failed to get product', 
      details: error.message
    });
  }
};*/



const Product = require('../models/Product');
const OrganicVerification = require('../services/organicVerification');
const jaivikBharat = require('../services/jaivikBharat');
const LogoVerification = require('../services/logoVerification');
const ImageProcessor = require('../utils/imageProcesssor');
const BarcodeScanner = require('../services/barcodeScanner');
const axios = require('axios');
const NodeCache = require('node-cache');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs').promises;

// Initialize cache with 10 minute TTL
const cache = new NodeCache({ stdTTL: 600 });

// Certification source mapping
const certificationSources = {
  'jaivik-bharat': 'Jaivik Bharat (Govt. of India)',
  'open-food-facts': 'Open Food Facts',
  'usda': 'USDA Organic',
  'india-organic': 'India Organic',
  'eu-organic': 'EU Organic',
  'canada-organic': 'Canada Organic',
  'japan-organic': 'JAS Organic'
};

// Shared search function
async function performSearch(query, barcode) {
  const cacheKey = `search:${query || ''}:${barcode || ''}`;
  const cachedResults = cache.get(cacheKey);
  if (cachedResults) return cachedResults;

  const cleanBarcode = barcode ? barcode.replace(/\D/g, '') : null;
  const searchConditions = [];
  
  if (query) {
    searchConditions.push(
      { name: { $regex: query, $options: 'i' } },
      { brand: { $regex: query, $options: 'i' } },
      { 'certifications.issuer': { $regex: query, $options: 'i' } }
    );
  }
  
  if (cleanBarcode) {
    searchConditions.push({ barcode: cleanBarcode });
  }

  const localProducts = await Product.find({
    $or: searchConditions
  }).limit(20).lean();

  if (localProducts.length > 0) {
    // Add source display names
    const enhancedProducts = localProducts.map(p => ({
      ...p,
      sourceDisplay: certificationSources[p.source] || p.source
    }));
    
    cache.set(cacheKey, enhancedProducts);
    return enhancedProducts;
  }

  try {
    const searchTerm = query || cleanBarcode;
    const jaivikResults = await jaivikBharat.scrapeSearch(searchTerm);
    
    if (jaivikResults.length > 0) {
      // Add source display names
      const enhancedJaivik = jaivikResults.map(p => ({
        ...p,
        sourceDisplay: certificationSources[p.source] || p.source
      }));
      
      Product.insertMany(jaivikResults).catch(err => 
        console.error('Error saving Jaivik products:', err)
      );
      cache.set(cacheKey, enhancedJaivik);
      return enhancedJaivik;
    }
  } catch (scrapeError) {
    console.error('Jaivik Bharat scrape error:', scrapeError);
  }

  try {
    const searchTerm = query || cleanBarcode;
    const apiResponse = await axios.get(
      `https://world.openfoodfacts.org/cgi/search.pl`,
      {
        params: {
          search_terms: searchTerm,
          json: 1,
          page_size: 20
        },
        timeout: 20000
      }
    );
    
    const organicProducts = (apiResponse.data.products || [])
      .filter(p => p && (p.labels_tags?.includes('en:organic') || p.ecoscore_grade === 'a'))
      .map(p => {
        // Determine certification source
        let source = 'open-food-facts';
        if (p.labels_tags?.includes('en:usda-organic')) {
          source = 'usda';
        } else if (p.labels_tags?.includes('en:india-organic')) {
          source = 'india-organic';
        } else if (p.labels_tags?.includes('en:eu-organic')) {
          source = 'eu-organic';
        }
        
        return {
          name: p.product_name || 'Unknown Product',
          brand: p.brands || 'Unknown Brand',
          barcode: p.code || '',
          organicPercentage: p.ecoscore_grade === 'a' ? 95 : 70,
          source: source,
          sourceDisplay: certificationSources[source] || source,
          imageUrl: p.image_url,
          certificationId: p.certification_id || `OFF-${p.code}`,
          verificationUrl: p.verification_url || `https://world.openfoodfacts.org/product/${p.code}`
        };
      });

    if (organicProducts.length > 0) {
      cache.set(cacheKey, organicProducts);
      return organicProducts;
    }
  } catch (apiError) {
    console.error('Open Food Facts API error:', apiError);
  }

  return [];
}

exports.createProduct = async (req, res) => {
  try {
    const productData = req.body;
    
    // Validate required fields
    if (!productData.name || !productData.barcode) {
      return res.status(400).json({
        success: false,
        message: 'Product name and barcode are required'
      });
    }

    // Check if product already exists
    const existingProduct = await Product.findOne({ barcode: productData.barcode });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this barcode already exists'
      });
    }

    const newProduct = new Product(productData);
    await newProduct.save();

    res.status(201).json({
      success: true,
      product: newProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      details: error.message
    });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { query, barcode } = req.query;
    if (!query && !barcode) {
      return res.status(400).json({ error: 'Query or barcode required' });
    }

    const products = await performSearch(query, barcode);
    if (products.length === 0) {
      return res.status(404).json({ message: 'No organic products found' });
    }
    res.json(products);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Search failed', 
      details: error.message
    });
  }
};

exports.searchByImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = req.file.path;
    const result = await ImageProcessor.processImageSearch(imagePath);
    
    // Add source display names
    const enhancedProducts = result.products.map(p => ({
      ...p,
      sourceDisplay: certificationSources[p.source] || p.source
    }));
    
    res.json({
      success: true,
      imageUrl: `/uploads/${path.basename(imagePath)}`,
      products: enhancedProducts,
      searchQuery: result.searchQuery
    });
  } catch (error) {
    console.error('Image search error:', error);
    res.status(500).json({ 
      error: 'Image search failed', 
      details: error.message
    });
  }
};

exports.searchByBarcode = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No barcode image provided',
        supportedFormats: ['JPG', 'JPEG', 'PNG']
      });
    }

    // Enhanced image validation
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ 
        error: 'Image too large (max 5MB)'
      });
    }

    // Preprocess image for better scanning
    const preprocessedImage = await sharp(req.file.path)
      .greyscale()
      .linear(1.2, 0) // Increase contrast
      .normalize()
      .sharpen()
      .threshold(128) // Binarize image
      .resize(1200, 1200, { 
        fit: 'contain', 
        background: { r: 255, g: 255, b: 255 } 
      })
      .toBuffer();

    // Save preprocessed image temporarily
    const processedPath = path.join(path.dirname(req.file.path), `processed-${path.basename(req.file.path)}`);
    await fs.writeFile(processedPath, preprocessedImage);

    // First scan attempt
    let scanResult = await BarcodeScanner.scanFromImage(processedPath);
    
    // If first attempt fails, try inverted colors
    if (!scanResult.success) {
      // Create inverted image
      const invertedImage = await sharp(preprocessedImage)
        .negate()
        .toBuffer();
      
      const invertedPath = path.join(path.dirname(req.file.path), `inverted-${path.basename(req.file.path)}`);
      await fs.writeFile(invertedPath, invertedImage);
      
      scanResult = await BarcodeScanner.scanFromImage(invertedPath);
      
      // Clean up inverted image
      await fs.unlink(invertedPath).catch(console.error);
    }

    // Clean up processed image
    await fs.unlink(processedPath).catch(console.error);

    if (!scanResult.success) {
      return res.status(400).json({
        error: scanResult.error || 'No barcode detected',
        details: scanResult.details,
        suggestions: [
          'Ensure the barcode is clearly visible and fills at least 30% of the image',
          'Try taking a higher resolution image',
          'Avoid glare and shadows on the barcode',
          'Position the barcode horizontally'
        ]
      });
    }

    // Search products using the scanned barcode
    const products = await performSearch(null, scanResult.barcode);
    
    res.json({
      success: true,
      barcode: scanResult.barcode,
      format: scanResult.format,
      products: products.length > 0 ? products : [],
      message: products.length === 0 ? 
        'No products found for this barcode' : 
        `${products.length} products found`
    });
  } catch (error) {
    console.error('Barcode search error:', error);
    res.status(500).json({ 
      error: 'Barcode processing failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      supportContact: 'support@organicverify.com'
    });
  }
};

exports.verifyProduct = async (req, res) => {
  try {
    const { barcode } = req.body;
    const imageFile = req.file;
    
    if (!barcode && !imageFile) {
      return res.status(400).json({ error: 'Barcode or image required' });
    }

    let imageUrl = null;
    if (imageFile) {
      // Use local path for development
      imageUrl = imageFile.path;
    }

    // Parallel verification with timeouts
    const verificationPromises = [];
    
    if (barcode) {
      verificationPromises.push(
        OrganicVerification.verifyProduct({ barcode })
          .catch(err => {
            console.error('Organic verification error:', err);
            return null;
          })
      );
    }
    
    if (imageUrl) {
      verificationPromises.push(
        LogoVerification.verifyLogo(imageUrl)
          .catch(err => {
            console.error('Logo verification error:', err);
            return null;
          })
      );
    }

    const [productVerification, logoVerification] = await Promise.all(verificationPromises);

    res.json({
      isOrganic: productVerification?.isOrganic || logoVerification?.verified || false,
      organicPercentage: productVerification?.percentage || 0,
      logoVerified: logoVerification?.verified || false,
      imageUrl: imageUrl,
      sources: productVerification?.sources || []
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      details: error.message
    });
  }
};

exports.getProductDetails = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    // Add source display name
    const enhancedProduct = {
      ...product._doc,
      sourceDisplay: certificationSources[product.source] || product.source
    };
    
    res.json(enhancedProduct);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ 
      error: 'Failed to get product', 
      details: error.message
    });
  }
};

