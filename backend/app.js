const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const productRoutes = require('./routes/productRoutes');
const rateLimit = require('express-rate-limit');
const imageSearchRoutes = require('./routes/imageSearch');
const path = require('path');
const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Update with your frontend URL
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/products', productRoutes);
// Add to your Express app
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api', imageSearchRoutes);

// After creating your Express app
app.use(
  '/api/products/search',
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    message: 'Too many search requests from this IP, please try again later'
  })
);
// Error handling
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

module.exports = app;