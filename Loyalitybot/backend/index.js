require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const crypto = require('crypto'); // Import crypto for token generation
const User = require('./models/User');


const app = express();
app.use(cors({
    exposedHeaders: ['Content-Range']
}));
app.use(express.json());

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

    req.user = user; // Attach user to the request
    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error('Authentication error:', error);
    // Use a generic error message for security
    res.status(401).json({ error: 'Request is not authorized' });
  }
};

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
      user = new User({
        telegramId: telegram_id,
        username: username,
        firstName: first_name,
        lastName: last_name,
        sessionToken: sessionToken,
        // Assign 'admin' role if first user, otherwise default ('user') applies
          role: userCount === 0 ? 'admin' : 'user' 
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
  // Include role in the response
  const { telegramId, username, firstName, lastName, role } = req.user;
  
  // Return only necessary, non-sensitive user details
  res.status(200).json({
    telegram_id: telegramId,
    username: username,
    first_name: firstName,
    last_name: lastName,
    role: role // Add role to the response
  });
  console.log(`Session verified via /api/auth/me for user: ${telegramId}`);
});

// Get All Users Endpoint (Protected by requireAuth middleware)
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    // Fetch all users from the database
    // Include role in the selection
    const users = await User.find({}).select('telegramId username firstName lastName createdAt role'); 
    
    // Set Content-Range header for react-admin compatibility (optional but good practice)
    // res.setHeader('Content-Range', `users 0-${users.length-1}/${users.length}`);

    // Map users to include the 'id' virtual if your frontend expects it
    const usersWithId = users.map(user => user.toJSON()); 

    res.status(200).json(usersWithId);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update User Role Endpoint (Protected by requireAuth, Admin Only)
app.patch('/api/users/:userId/role', requireAuth, async (req, res) => {
  // 1. Check if the requesting user is an admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only admins can change roles.' });
  }

  // 2. Get target user ID from params and new role from body
  const { userId } = req.params;
  const { role } = req.body;

  // 3. Validate the new role
  if (!['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified. Must be "admin" or "user".' });
  }

  // Prevent admin from accidentally removing their own admin role?
  // Optional: Add a check if (req.user.id === userId && role === 'user') { ... }

  try {
    // 4. Find the target user by ID
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    // 5. Update the role and save
    targetUser.role = role;
    await targetUser.save();

    // 6. Return success response (optionally return the updated user)
    res.status(200).json({ message: 'User role updated successfully.', user: targetUser.toJSON() });

  } catch (error) {
    console.error('Error updating user role:', error);
    // Handle potential validation errors during save or other DB issues
    if (error.name === 'ValidationError') {
        return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error while updating role.' });
  }
});

app.listen(8000, () => console.log('Backend running on port 8000'));