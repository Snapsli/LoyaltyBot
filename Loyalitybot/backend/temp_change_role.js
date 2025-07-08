require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function changeUserRole() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://admin:GevPass12@localhost:27018/loyalty-dev-db?authSource=admin';
        await mongoose.connect(mongoUri);
        console.log('MongoDB connected for role change.');

        const user = await User.findOne({ telegramId: 123456789 });

        if (user) {
            user.role = 'user';
            await user.save();
            console.log(`User ${user.firstName} ${user.lastName}'s role has been updated to 'user'.`);
        } else {
            console.log('User "John Doe" not found.');
        }

    } catch (error) {
        console.error('Error changing user role:', error);
    } finally {
        mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
}

changeUserRole(); 