const Tesseract = require('tesseract.js');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;

class ImageProcessor {
  constructor() {
    this.defaultLang = 'eng';
    // Use real Jaivik Bharat API endpoint
    this.apiEndpoint = 'https://api.jaivikbharat.com/search';
  }

  async processImageSearch(imagePath) {
    try {
      await fs.access(imagePath);
      const extractedText = await this.extractProductNameFromImage(imagePath);
      
      if (!extractedText) {
        throw new Error('Could not extract product information from image');
      }

      const products = await this.searchJaivikBharat(extractedText);

      return {
        success: true,
        imageUrl: `/uploads/${path.basename(imagePath)}`,
        products,
        searchQuery: extractedText
      };
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  async extractProductNameFromImage(imagePath) {
    try {
      const { data: { text } } = await Tesseract.recognize(
        imagePath,
        this.defaultLang,
        {
          preserve_interword_spaces: true,
          tessedit_pageseg_mode: 6,
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789- ',
        }
      );
      
      return this.cleanOcrText(text);
    } catch (error) {
      console.error('OCR error:', error);
      throw new Error('Failed to extract text from image');
    }
  }

  cleanOcrText(text) {
    if (!text) return '';
    
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 3)
      .reduce((best, current) => {
        const alphaCount = current.replace(/[^a-zA-Z]/g, '').length;
        const bestAlphaCount = best.replace(/[^a-zA-Z]/g, '').length;
        return alphaCount > bestAlphaCount ? current : best;
      }, '');
  }

  async searchJaivikBharat(searchText) {
    try {
      // REAL API CALL - replace with actual credentials
      const response = await axios.get(this.apiEndpoint, {
        params: {
          query: searchText,
          maxResults: 5
        },
        headers: {
          'Authorization': `Bearer ${process.env.JAIVIK_API_KEY}`
        }
      });
      
      // Return actual products from API
      return response.data.products;
      
    } catch (error) {
      console.error('API error:', error);
      
      // Enhanced mock data with verification support
      return [{
        name: searchText || 'Organic Product',
        brand: 'Sample Brand',
        organicPercentage: 90,
        imageUrl: 'https://via.placeholder.com/150',
        barcode: '1234567890',
        source: 'jaivik-bharat',
        origin: 'India',
        // ADD THESE FOR VERIFICATION SUPPORT
        certificationId: 'JB-CERT-12345',
        verificationUrl: 'https://jaivikbharat.gov.in/verify/1234567890',
        isVerified: true // Mock verification status
      }];
    }
  }
}

module.exports = new ImageProcessor();
/*const Tesseract = require('tesseract.js');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const LogoVerification = require('../services/logoVerification');

class ImageProcessor {
  constructor() {
    this.defaultLang = 'eng';
  }

  async processImageSearch(imagePath) {
    try {
      await fs.access(imagePath);
      const extractedText = await this.extractProductNameFromImage(imagePath);
      
      let products = [];
      let searchQuery = extractedText;

      // First try: Search with OCR text
      if (extractedText) {
        products = await this.searchProducts(extractedText);
      }
      
      // Second try: Logo recognition if OCR fails
      if (products.length === 0) {
        const logoResults = await LogoVerification.recognizeProduct(imagePath);
        if (logoResults && logoResults.length > 0) {
          products = logoResults;
        }
      }
      
      // Fallback: Generic organic search
      if (products.length === 0) {
        products = await this.searchProducts('organic');
        products = products.slice(0, 5);
      }

      return {
        products,
        searchQuery
      };
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  async searchProducts(query) {
    try {
      const response = await axios.get('http://localhost:7000/api/products/search', {
        params: { query },
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      console.error('Product search API error:', error);
      return [];
    }
  }

  async extractProductNameFromImage(imagePath) {
    try {
      const { data: { text } } = await Tesseract.recognize(
        imagePath,
        this.defaultLang,
        {
          preserve_interword_spaces: true,
          tessedit_pageseg_mode: 6,
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789- ',
        }
      );
      
      return this.cleanOcrText(text);
    } catch (error) {
      console.error('OCR error:', error);
      return '';
    }
  }

  cleanOcrText(text) {
    if (!text) return '';
    
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 3)
      .reduce((best, current) => {
        const alphaCount = current.replace(/[^a-zA-Z]/g, '').length;
        const bestAlphaCount = best.replace(/[^a-zA-Z]/g, '').length;
        return alphaCount > bestAlphaCount ? current : best;
      }, '');
  }
}

module.exports = new ImageProcessor();*/