/*const cloudinary = require('../config/cloudinary');
const axios = require('axios');

class LogoVerification {
  static async verifyLogo(imageUrl) {
    try {
      // Upload to Cloudinary if needed
      const uploadResult = await cloudinary.uploader.upload(imageUrl, {
        folder: 'logo-verification'
      });

      // Simple check for organic keywords in the image URL
      const organicKeywords = ['organic', 'bio', 'eco', 'natural'];
      const hasOrganicKeyword = organicKeywords.some(keyword => 
        uploadResult.secure_url.toLowerCase().includes(keyword)
      );

      return {
        verified: hasOrganicKeyword,
        imageUrl: uploadResult.secure_url,
        confidence: hasOrganicKeyword ? 80 : 0
      };
    } catch (error) {
      console.error('Logo verification error:', error);
      return { verified: false };
    }
  }
}

module.exports = LogoVerification;*/
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');
const path = require('path');
const fs = require('fs').promises;

class LogoVerification {
  static async verifyLogo(imagePath) {
    try {
      // 1. Validate image file exists
      try {
        await fs.access(imagePath);
      } catch (err) {
        throw new Error(`Image file not found at path: ${imagePath}`);
      }

      // 2. Process image for better OCR results
      const processedImage = await sharp(imagePath)
        .resize(800, 800, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .normalize()
        .sharpen()
        .toBuffer();

      // 3. Perform OCR with Tesseract.js
      const worker = await createWorker({
        logger: m => console.log(m.status)
      });
      
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      const { data: { text } } = await worker.recognize(processedImage);
      await worker.terminate();

      // 4. Check for organic indicators
      const organicKeywords = [
        'organic', 'bio', 'eco', 'natural', 
        'jaivik', 'organic india', 'usda',
        'india organic', 'certified organic',
        'जैविक', 'ऑर्गेनिक' // Hindi keywords
      ];
      
      const detectedText = text.toLowerCase();
      const foundKeywords = organicKeywords.filter(keyword => 
        detectedText.includes(keyword.toLowerCase())
      );

      // 5. Color analysis for common organic logo colors
      const { dominant } = await sharp(processedImage).stats();
      const isGreenDominant = dominant.r < 150 && dominant.g > 150 && dominant.b < 150;

      return {
        verified: foundKeywords.length > 0 || isGreenDominant,
        confidence: foundKeywords.length > 0 ? 
          Math.min(90 + (foundKeywords.length * 3), 100) : 
          (isGreenDominant ? 75 : 0),
        detectedKeywords: foundKeywords,
        dominantColor: dominant,
        imageUrl: `/uploads/${path.basename(imagePath)}`
      };
    } catch (error) {
      console.error('Logo verification error:', error);
      return { 
        verified: false,
        error: process.env.NODE_ENV === 'development' ? error.message : null,
        confidence: 0
      };
    }
  }

  static async recognizeProduct(imagePath) {
    try {
      // First verify if it's an organic logo
      const verification = await this.verifyLogo(imagePath);
      
      if (!verification.verified) {
        return [];
      }

      // Sample product database - replace with actual ML model or API call
      const organicProducts = [
        {
          name: 'Organic Basmati Rice',
          brand: 'Natureland Organics',
          organicPercentage: 95,
          certification: 'India Organic',
          source: 'logo-recognition'
        },
        {
          name: 'Organic Turmeric Powder',
          brand: 'Organic India',
          organicPercentage: 90,
          certification: 'USDA Organic',
          source: 'logo-recognition'
        }
      ];

      // Sort by confidence and return
      return organicProducts.sort((a, b) => b.organicPercentage - a.organicPercentage);
    } catch (error) {
      console.error('Product recognition error:', error);
      return [];
    }
  }
}

module.exports = LogoVerification;