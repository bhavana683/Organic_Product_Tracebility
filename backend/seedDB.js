require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const connectDB = require('./config/db');

const sampleProducts = [
  {
    name: "Organic Basmati Rice",
    brand: "Natureland Organics",
    barcode: "123456789012",
    description: "Premium organic basmati rice from the foothills of the Himalayas",
    origin: "India",
    ingredients: ["Organic Basmati Rice"],
    certifications: [{
      issuer: "India Organic",
      id: "IN-ORG-001",
      logo: "https://example.com/india-organic-logo.png",
      verified: true,
      
    }],
    organicPercentage: 95,
    trustScore: 92,
    source: "manual",
    images: ["https://example.com/rice.jpg"]
  },
  {
    name: "Cold-Pressed Coconut Oil",
    brand: "Forest Essentials",
    barcode: "234567890123",
    description: "Pure organic cold-pressed coconut oil",
    origin: "Sri Lanka",
    ingredients: ["Organic Coconut Oil"],
    certifications: [{
      issuer: "USDA Organic",
      id: "US-ORG-045",
      logo: "https://example.com/usda-organic-logo.png",
      verified: true
    }],
    organicPercentage: 100,
    trustScore: 95,
    source: "manual",
    images: ["https://example.com/coconut-oil.jpg"]
  },
  {
    name: "Organic Turmeric Powder",
    brand: "Organic India",
    barcode: "345678901234",
    description: "Pure organic turmeric with high curcumin content",
    origin: "India",
    ingredients: ["Organic Turmeric"],
    certifications: [{
      issuer: "India Organic",
      id: "IN-ORG-002",
      verified: true
    }],
    organicPercentage: 98,
    trustScore: 90,
    source: "manual"
  },
  {
    name: "Organic Quinoa",
    brand: "Ancient Harvest",
    barcode: "456789012345",
    description: "Protein-rich organic quinoa",
    origin: "Peru",
    ingredients: ["Organic Quinoa"],
    certifications: [{
      issuer: "EU Organic",
      id: "EU-ORG-003",
      verified: true
    }],
    organicPercentage: 100,
    trustScore: 94,
    source: "manual"
  },
  {
    name: "Organic Raw Honey",
    brand: "Manuka Health",
    barcode: "567890123456",
    description: "Pure raw organic honey",
    origin: "New Zealand",
    ingredients: ["Organic Honey"],
    certifications: [{
      issuer: "USDA Organic",
      id: "US-ORG-046",
      verified: true
    }],
    organicPercentage: 100,
    trustScore: 96,
    source: "manual",
    images: ["https://example.com/honey.jpg"]
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();
    
    // Delete existing products
    await Product.deleteMany();
    console.log('Existing products cleared');
    
    // Insert sample products
    await Product.insertMany(sampleProducts);
    console.log('Database seeded with sample products');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();