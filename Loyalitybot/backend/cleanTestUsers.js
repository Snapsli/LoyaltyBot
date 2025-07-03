require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function cleanTestUsers() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || 'mongodb://admin:GevPass12@localhost:27018/loyalty-dev-db?authSource=admin';
        await mongoose.connect(mongoUri);
        console.log('MongoDB connected');

        // Remove test Telegram user (mock user with ID 123456789)
        const deletedTelegramUser = await User.deleteOne({ 
            telegramId: '123456789' 
        });
        
        if (deletedTelegramUser.deletedCount > 0) {
            console.log('Test Telegram user deleted');
        } else {
            console.log('No test Telegram user found');
        }
        
        // Show remaining users
        const remainingUsers = await User.find({}).select('firstName lastName email telegramId role');
        console.log('Remaining users:');
        remainingUsers.forEach(user => {
            console.log(`- ${user.firstName} ${user.lastName} (${user.email || user.telegramId}) - ${user.role}`);
        });
        
    } catch (error) {
        console.error('Error cleaning test users:', error);
    } finally {
        mongoose.connection.close();
    }
}

cleanTestUsers(); 