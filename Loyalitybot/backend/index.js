require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('./models/User');

const app = express();
app.use(cors({
    exposedHeaders: ['Content-Range']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- Upload folder setup ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Multer configuration for file storage ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const extension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed!'), false);
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));    

// Authentication Middleware
const requireAuth = async (req, res, next) => {
  // Read custom headers
  const telegramId = req.headers['x-telegram-id'];
  const sessionToken = req.headers['x-session-token'];

  // Check if headers are present
  if (!telegramId || !sessionToken) {
    return res.status(401).json({ error: 'Authentication required (custom headers missing)' });
  }

  try {
    // Find user by both Telegram ID and Session Token
    const user = await User.findOne({ 
      telegramId: telegramId, 
      sessionToken: sessionToken 
    });

    // If user not found or token doesn't match
    if (!user) {
      return res.status(401).json({ error: 'Invalid authentication (custom headers)' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Your account is blocked by administrator.' });
    }

    req.user = user; // Attach user to the request
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Request is not authorized' });
  }
};

// Image upload endpoint
app.post('/api/upload/image', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const imageUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/uploads/${req.file.filename}`;
  res.status(200).json({ url: imageUrl });
});

// Telegram Authentication Endpoint
app.post('/api/auth/telegram', async (req, res) => {
  const { telegram_id, username, first_name, last_name } = req.body;

  if (!telegram_id) {
    return res.status(400).json({ error: 'Telegram ID is required' });
  }

  try {
    let user = await User.findOne({ telegramId: telegram_id });
    let sessionToken;

    if (user) {
      // Update existing user
      user.username = username;
      user.firstName = first_name;
      user.lastName = last_name;
      // Keep the existing session token or generate a new one if it doesn't exist
      sessionToken = user.sessionToken || crypto.randomBytes(32).toString('hex');
      user.sessionToken = sessionToken; 
      await user.save();
    } else {
      // Check if this is the first user being created
      const userCount = await User.countDocuments();

      // Create new user
      sessionToken = crypto.randomBytes(32).toString('hex');
      
      // Role assignment: admin if first user, otherwise user
      let assignedRole = 'user';

      if (userCount === 0) {
        assignedRole = 'admin';
      }

      user = new User({
        telegramId: telegram_id,
        username: username,
        firstName: first_name,
        lastName: last_name,
        sessionToken: sessionToken,
        role: assignedRole
      });

      await user.save();
      console.log(`New user created. User count: ${userCount + 1}. Role assigned: ${user.role}`);
    }

    res.status(200).json({
      message: 'Authentication successful',
      telegram_id: user.telegramId,
      session_token: sessionToken
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Current User Endpoint (Protected by requireAuth middleware)
app.get('/api/auth/me', requireAuth, (req, res) => {
  // req.user is populated by the requireAuth middleware
  
  // Include role and balance in the response
  const { telegramId, username, firstName, lastName, role, balance } = req.user;
  
  // Return only necessary, non-sensitive user details
  res.status(200).json({
    telegram_id: telegramId,
    username: username,
    first_name: firstName,
    last_name: lastName,
    role: role,
    balance: balance
  });
  console.log(`Session verified via /api/auth/me for user: ${telegramId}`);
});

// Get All Users Endpoint (Admin only)
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await User.find({}).select('-sessionToken');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user balance (Admin only)
app.put('/api/users/:userId/balance', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { balance } = req.body;

    if (typeof balance !== 'number') {
      return res.status(400).json({ error: 'Balance must be a number' });
    }

    const user = await User.findByIdAndUpdate(
      userId, 
      { balance }, 
      { new: true }
    ).select('-sessionToken');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error updating user balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Block/Unblock user (Admin only)
app.put('/api/users/:userId/block', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { isBlocked } = req.body;

    const user = await User.findByIdAndUpdate(
      userId, 
      { isBlocked }, 
      { new: true }
    ).select('-sessionToken');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error updating user block status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'loyalty-backend'
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Loyalty backend server is running on port ${PORT}`);
}); 