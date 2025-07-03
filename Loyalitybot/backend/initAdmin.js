require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function initAdmin() {
    try {
        // Connect to MongoDB (use local Docker MongoDB for development)
        const mongoUri = process.env.MONGO_URI || 'mongodb://admin:GevPass12@localhost:27018/loyalty-dev-db?authSource=admin';
        await mongoose.connect(mongoUri);
        console.log('MongoDB connected');

        // Check if admin user already exists
        const existingAdmin = await User.findOne({ 
            email: 'admin',
            authType: 'classic',
            role: 'admin' 
        });

        if (existingAdmin) {
            console.log('Admin user already exists');
            return;
        }

        // Create admin user
        const adminUser = new User({
            email: 'admin',
            password: 'admin123', // Will be hashed automatically by pre-save hook
            firstName: 'Administrator',
            lastName: 'System',
            username: 'admin',
            authType: 'classic',
            role: 'admin'
        });

        await adminUser.save();
        console.log('Admin user created successfully!');
        console.log('Email: admin');
        console.log('Password: admin123');
        
    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        mongoose.connection.close();
    }
}

initAdmin(); 