// backend/models/Product.js
const mongoose = require('mongoose');

const certificationSchema = new mongoose.Schema({
  issuer: String,
  id: String,
  logo: String,
  verified: Boolean
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: String,
  barcode: String,
  description: String,
  origin: String,
  ingredients: [String],
  certifications: [certificationSchema],
  organicPercentage: Number,
  trustScore: Number,
  source: String,
  images: [String]
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);