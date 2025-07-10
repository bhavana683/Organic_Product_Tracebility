// backend/config/cloudinary.js
/*try {
  // First attempt to load Cloudinary
  const cloudinaryLib = require('cloudinary');
  
  if (!cloudinaryLib || !cloudinaryLib.v1 || !cloudinaryLib.v1.config) {
    throw new Error('Cloudinary module is missing required components');
  }

  const cloudinary = cloudinaryLib.v1;

  // Verify environment variables
  const requiredEnvVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    console.warn('Missing Cloudinary environment variables:', missingVars);
    console.log('Falling back to local storage');
    module.exports = null;
    return;
  }

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });

  // Test configuration
  console.log('Cloudinary successfully configured for:', cloudinary.config().cloud_name);
  module.exports = cloudinary;

} catch (error) {
  console.error('Cloudinary initialization error:', error.message);
  console.log('Falling back to local storage');
  module.exports = null;
}*/
// backend/config/cloudinary.js
// backend/config/cloudinary.js
// backend/config/cloudinary.js
// backend/config/cloudinary.js
// backend/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// Remove dotenv config - server.js already loads it
// Create logs directory
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Enhanced logger (same as before)
const logger = {
  // ... keep existing logger code ...
};

// Configuration function
const configureCloudinary = () => {
  try {
    // ... keep existing configuration code ...
  } catch (error) {
    // ... keep error handling ...
  }
};

// Export configured instance immediately
module.exports = configureCloudinary;