require('dotenv').config();
const connectDB = require('./config/db');
const app = require('./app');


const PORT = process.env.PORT || 7000;

const startServer = async () => {
  try {
    await connectDB();
    
    // Seed database in development
    if (process.env.NODE_ENV === 'development') {
      const Product = require('./models/Product');
      const count = await Product.countDocuments();
      
      if (count === 0) {
        console.log('Seeding database with sample products...');
        const seedDatabase = require('./seedDB');
        await seedDatabase();
      }
    }
    
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      // Log Cloudinary status
      
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

startServer();