/*const axios = require('axios');
const Product = require('../models/Product');

class OrganicVerification {
  static async verifyWithOpenFoodFacts(barcode) {
    try {
      const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      if (response.data.status === 1) {
        const product = response.data.product;
        return {
          organic: product.labels_tags?.includes('en:organic') || false,
          percentage: product.organic ? 100 : 0,
          source: 'open-food-facts'
        };
      }
      return null;
    } catch (error) {
      console.error('Open Food Facts error:', error);
      return null;
    }
  }

  static async verifyWithUSDA(barcode) {
    try {
      // Mock implementation - replace with actual USDA API call
      return {
        organic: true,
        percentage: 100,
        source: 'usda'
      };
    } catch (error) {
      console.error('USDA verification error:', error);
      return null;
    }
  }

  static async verifyProduct(productData) {
    const verifications = await Promise.all([
      this.verifyWithOpenFoodFacts(productData.barcode),
      this.verifyWithUSDA(productData.barcode)
    ]);
    
    const validVerifications = verifications.filter(v => v !== null);
    if (validVerifications.length === 0) return null;

    return {
      isOrganic: validVerifications.some(v => v.organic),
      percentage: Math.max(...validVerifications.map(v => v.percentage)),
      sources: validVerifications.map(v => v.source)
    };
  }
}

module.exports = OrganicVerification;*/
/*
const axios = require('axios');
const Product = require('../models/Product');

class OrganicVerification {
  static async verifyWithOpenFoodFacts(barcode) {
    try {
      if (!barcode || barcode.trim() === '') {
        return null;
      }

      const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
        timeout: 5000 // Add timeout to prevent hanging
      });
      
      if (response.data.status === 1 && response.data.product) {
        const product = response.data.product;
        const isOrganic = product.labels_tags?.includes('en:organic') || 
                          product.categories_tags?.includes('en:organic') ||
                          (product.ecoscore_data?.agribalyse?.name_en || '').toLowerCase().includes('organic');
        
        return {
          organic: isOrganic,
          percentage: isOrganic ? 100 : 0,
          source: 'open-food-facts',
          data: product
        };
      }
      return null;
    } catch (error) {
      console.error('Open Food Facts error:', error.message);
      return null;
    }
  }

  static async verifyWithJaivikBharat(barcode) {
    try {
      if (!barcode || barcode.trim() === '') {
        return null;
      }

      // Replace with actual Jaivik Bharat API endpoint
      const response = await axios.get(`https://api.jaivikbharat.com/products/${barcode}`, {
        headers: {
          'Authorization': `Bearer ${process.env.JAIVIK_API_KEY}`
        },
        timeout: 5000
      });
      
      if (response.data && response.data.certified_organic) {
        return {
          organic: true,
          percentage: response.data.organic_percentage || 100,
          source: 'jaivik-bharat',
          data: response.data
        };
      }
      return null;
    } catch (error) {
      console.error('Jaivik Bharat error:', error.message);
      return null;
    }
  }

  static async verifyProduct(productData) {
    try {
      // Validate input
      if (!productData || !productData.barcode) {
        throw new Error('Barcode is required for verification');
      }

      const barcode = productData.barcode.trim();
      if (!barcode) {
        throw new Error('Invalid barcode');
      }

      // Check database first
      const dbProduct = await Product.findOne({ barcode });
      if (dbProduct && dbProduct.verification) {
        return dbProduct.verification;
      }

      // Perform verifications
      const verifications = await Promise.allSettled([
        this.verifyWithOpenFoodFacts(barcode),
        this.verifyWithJaivikBharat(barcode)
      ]);
      
      // Process results
      const validVerifications = verifications
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);
      
      if (validVerifications.length === 0) {
        return {
          success: false,
          verified: false,
          message: 'No verification sources available',
          sources: []
        };
      }
      
      // Determine organic status
      const isOrganic = validVerifications.some(v => v.organic);
      const percentage = Math.max(...validVerifications.map(v => v.percentage));
      const sources = validVerifications.map(v => v.source);
      
      const result = {
        success: true,
        verified: isOrganic,
        percentage,
        sources,
        message: isOrganic 
          ? 'Product is certified organic' 
          : 'Product not certified as organic',
        details: validVerifications
      };
      
      // Cache result in database
      if (dbProduct) {
        dbProduct.verification = result;
        await dbProduct.save();
      } else {
        const newProduct = new Product({
          barcode,
          name: productData.name || 'Unknown Product',
          brand: productData.brand || 'Unknown Brand',
          verification: result
        });
        await newProduct.save();
      }
      
      return result;
      
    } catch (error) {
      console.error('Verification error:', error.message);
      return {
        success: false,
        verified: false,
        message: 'Verification failed. Please try again.',
        error: error.message
      };
    }
  }
  // Update verifyProduct method to handle barcode-only input
static async verifyProduct(productData) {
  try {
    // Validate input - now accepts either product data or barcode string
    let barcode;
    if (typeof productData === 'string') {
      barcode = productData.trim();
    } else if (productData && productData.barcode) {
      barcode = productData.barcode.trim();
    } else {
      throw new Error('Barcode is required for verification');
    }

    // ... rest of the method remains the same ...
  }
  catch(err){
    console.log(err)
  }
}

}

module.exports = OrganicVerification;*/
const axios = require('axios');
const Product = require('../models/Product');

class OrganicVerification {
  static async verifyWithOpenFoodFacts(barcode) {
    try {
      if (!barcode || barcode.trim() === '') return null;

      const response = await axios.get(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
        { timeout: 5000 }
      );
      
      if (response.data.status === 1 && response.data.product) {
        const product = response.data.product;
        const isOrganic = product.labels_tags?.includes('en:organic') || 
                          product.categories_tags?.includes('en:organic') ||
                          (product.ecoscore_data?.agribalyse?.name_en || '').toLowerCase().includes('organic');
        
        return {
          organic: isOrganic,
          percentage: isOrganic ? 100 : 0,
          source: 'open-food-facts',
          data: product
        };
      }
      return null;
    } catch (error) {
      console.error('Open Food Facts error:', error.message);
      return null;
    }
  }

  static async verifyWithJaivikBharat(product) {
    try {
      // For mock products
      if (product.source === 'jaivik-bharat') {
        return {
          organic: true,
          percentage: product.organicPercentage || 100,
          source: 'jaivik-bharat',
          data: product
        };
      }
      return null;
    } catch (error) {
      console.error('Jaivik Bharat error:', error.message);
      return null;
    }
  }

  static async verifyProduct(productData) {
    try {
      // Validate input
      if (!productData.barcode) {
        throw new Error('Barcode is required for verification');
      }

      const barcode = productData.barcode.trim();
      if (!barcode) {
        throw new Error('Invalid barcode');
      }

      // Check database first
      const dbProduct = await Product.findOne({ barcode });
      if (dbProduct && dbProduct.verification) {
        return dbProduct.verification;
      }

      // Perform verifications
      const verifications = await Promise.allSettled([
        this.verifyWithOpenFoodFacts(barcode),
        this.verifyWithJaivikBharat(productData)
      ]);
      
      // Process results
      const validVerifications = verifications
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);
      
      if (validVerifications.length === 0) {
        return {
          success: false,
          verified: false,
          message: 'No verification sources available',
          sources: []
        };
      }
      
      // Determine organic status
      const isOrganic = validVerifications.some(v => v.organic);
      const percentage = Math.max(...validVerifications.map(v => v.percentage));
      const sources = validVerifications.map(v => v.source);
      
      const result = {
        success: true,
        verified: isOrganic,
        percentage,
        sources,
        message: isOrganic 
          ? 'Product is certified organic' 
          : 'Product not certified as organic',
        details: validVerifications
      };
      
      // Cache result in database
      if (dbProduct) {
        dbProduct.verification = result;
        await dbProduct.save();
      } else {
        const newProduct = new Product({
          barcode,
          name: productData.name || 'Unknown Product',
          brand: productData.brand || 'Unknown Brand',
          verification: result
        });
        await newProduct.save();
      }
      
      return result;
      
    } catch (error) {
      console.error('Verification error:', error.message);
      return {
        success: false,
        verified: false,
        message: 'Verification failed. Please try again.',
        error: error.message
      };
    }
  }
}

module.exports = OrganicVerification;