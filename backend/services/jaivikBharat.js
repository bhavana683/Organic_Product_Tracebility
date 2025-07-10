
const axios = require('axios');
const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');
const NodeCache = require('node-cache');

// Cache results for 1 hour to avoid frequent scraping
const cache = new NodeCache({ stdTTL: 3600 });

// List of known organic certification bodies in India
const ORGANIC_CERTIFIERS = [
  'NPOP', 'USDA Organic', 'EU Organic', 
  'India Organic', 'Jaivik Bharat',
  'PGS-India', 'APEDA', 'FSSAI Organic'
];

// Helper function to determine product type from name
const extractProductType = (productName) => {
  if (!productName) return 'Generic Food Product';
  
  const typeKeywords = {
    'rice': 'Rice',
    'wheat': 'Wheat',
    'pulse': 'Pulses',
    'spice': 'Spices',
    'tea': 'Tea',
    'coffee': 'Coffee',
    'honey': 'Honey',
    'oil': 'Oil',
    'flour': 'Flour'
  };

  const lowerName = productName.toLowerCase();
  for (const [key, value] of Object.entries(typeKeywords)) {
    if (lowerName.includes(key)) {
      return value;
    }
  }
  return 'Generic Food Product';
};

// Helper function to get placeholder image based on product type
const getDefaultImage = (productType) => {
  const imageMap = {
    'Rice': '/images/rice.jpg',
    'Wheat': '/images/wheat.jpg',
    'Pulses': '/images/pulses.jpg',
    'Spices': '/images/spices.jpg',
    'Tea': '/images/tea.jpg',
    'Coffee': '/images/coffee.jpg',
    'Honey': '/images/honey.jpg',
    'Oil': '/images/oil.jpg',
    'Flour': '/images/flour.jpg',
    'default': '/images/food.jpg'
  };

  return imageMap[productType] || imageMap.default;
};

exports.scrapeSearch = async (query) => {
  try {
    // Check cache first
    const cacheKey = `jaivik:${query.toLowerCase().trim()}`;
    const cachedResults = cache.get(cacheKey);
    if (cachedResults) return cachedResults;

    const searchUrl = `https://jaivikbharat.fssai.gov.in/home/search?search_term=${encodeURIComponent(query)}`;
    
    const { data } = await axios.get(searchUrl, {
      timeout: 15000, // 15 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://jaivikbharat.fssai.gov.in/'
      }
    });

    const dom = new JSDOM(data);
    const $ = cheerio.load(dom.window.document);
    const results = [];

    $('table tbody tr').each((i, element) => {
      const $row = $(element);
      const cols = $row.find('td');
      
      if (cols.length >= 4) {
        const name = $(cols[0]).text().trim();
        const brand = $(cols[1]).text().trim() || 'Unknown Brand';
        const certification = $(cols[2]).text().trim();
        const licenseNo = $(cols[3]).text().trim();
        const isOrganic = ORGANIC_CERTIFIERS.some(cert => certification.includes(cert));
        
        // Extract product type from name
        const productType = extractProductType(name);
        
        results.push({
          name,
          brand,
          productType,
          barcode: licenseNo,
          organicPercentage: isOrganic ? 100 : 0,
          isOrganic,
          certification,
          source: 'jaivik-bharat',
          sourceUrl: searchUrl,
          lastVerified: new Date().toISOString(),
          imageUrl: getDefaultImage(productType)
        });
      }
    });

    // Sort with organic products first
    const sortedResults = results.sort((a, b) => b.organicPercentage - a.organicPercentage);
    const finalResults = sortedResults.slice(0, 15); // Limit to 15 best matches

    // Cache the results
    cache.set(cacheKey, finalResults);
    
    return finalResults;
  } catch (error) {
    console.error('Jaivik Bharat scraping failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
};

// Function to get product details by license number
exports.getProductDetails = async (licenseNo) => {
  try {
    const detailUrl = `https://jaivikbharat.fssai.gov.in/home/productDetail?license_no=${encodeURIComponent(licenseNo)}`;
    
    const { data } = await axios.get(detailUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const details = {};

    // Extract details from the product detail page
    $('table tr').each((i, element) => {
      const $row = $(element);
      const key = $row.find('th').text().trim().replace(':', '');
      const value = $row.find('td').text().trim();
      if (key && value) {
        details[key] = value;
      }
    });

    return {
      ...details,
      sourceUrl: detailUrl,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to fetch product details:', error);
    return null;
  }
};

// Function to search products by barcode
exports.scrapeByBarcode = async (barcode) => {
  try {
    const cacheKey = `jaivik-barcode:${barcode}`;
    const cachedResults = cache.get(cacheKey);
    if (cachedResults) return cachedResults;

    // Get product details using the existing method
    const details = await exports.getProductDetails(barcode);
    
    if (!details) return [];

    // Convert to product format
    const product = {
      name: details['Product Name'] || 'Unknown Product',
      brand: details['Brand'] || 'Unknown Brand',
      barcode: barcode,
      organicPercentage: details['Organic Certification'] ? 100 : 0,
      isOrganic: !!details['Organic Certification'],
      certification: details['Organic Certification'] || '',
      source: 'jaivik-bharat',
      sourceUrl: `https://jaivikbharat.fssai.gov.in/home/productDetail?license_no=${barcode}`,
      lastVerified: new Date().toISOString(),
      imageUrl: getDefaultImage(extractProductType(details['Product Name'] || ''))
    };

    cache.set(cacheKey, [product]);
    return [product];
  } catch (error) {
    console.error('Barcode search failed:', error);
    return [];
  }
};