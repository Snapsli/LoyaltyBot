require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors");
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('./models/User');
const Bar = require('./models/Bar');
const MenuItem = require('./models/MenuItem');

const app = express();
// CORS configuration for production
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['http://localhost:3000', process.env.FRONTEND_URL] // Add your production domain here
        : true, // Allow all origins in development
    credentials: true,
    exposedHeaders: ['Content-Range'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-telegram-id', 'x-session-token']
};

app.use(cors(corsOptions));
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
    .then(() => {
        if (process.env.NODE_ENV !== 'production') {
            console.log('MongoDB connected');
        }
    })
    .catch(err => console.error('MongoDB connection error:', err));    

// Authentication Middleware
const requireAuth = async (req, res, next) => {
  const sessionToken = req.headers['x-session-token'];
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'Authentication required (session token missing)' });
  }

  try {
    // Find user by session token (works for both Telegram and classic auth)
    const user = await User.findOne({ sessionToken: sessionToken });

    if (!user) {
      return res.status(401).json({ error: 'Invalid authentication' });
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
  const { telegram_id, username, first_name, last_name, phone_number } = req.body;

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
      if (phone_number) {
        user.phone = phone_number;
      }
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
        phone: phone_number,
        sessionToken: sessionToken,
        role: assignedRole
      });

      await user.save();
      console.log(`New user created. User count: ${userCount + 1}. Role assigned: ${user.role}`);
    }

    res.status(200).json({
      message: 'Authentication successful',
      telegram_id: user.telegramId,
      session_token: sessionToken,
      user: {
        _id: user._id,
        id: user._id,
        telegramId: user.telegramId,
        first_name: user.firstName,
        last_name: user.lastName,
        username: user.username,
        phone: user.phone,
        role: user.role,
        balance: user.balance,
        barPoints: user.barPoints instanceof Map ? Object.fromEntries(user.barPoints) : user.barPoints || {}
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Classic Login Endpoint  
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user || user.authType !== 'classic') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Your account is blocked by administrator.' });
    }

    // Generate new session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    user.sessionToken = sessionToken;
    await user.save();

    res.status(200).json({
      message: 'Authentication successful',
      session_token: sessionToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Current User Endpoint (Protected by requireAuth middleware)
app.get('/api/auth/me', requireAuth, (req, res) => {
  // req.user is populated by the requireAuth middleware
  
  // Include role, balance and barPoints in the response
  const { telegramId, username, firstName, lastName, phone, role, balance, barPoints } = req.user;
  
  // Format barPoints for response
  let formattedBarPoints = {};
  if (barPoints instanceof Map) {
    formattedBarPoints = Object.fromEntries(barPoints);
  } else if (barPoints && typeof barPoints === 'object') {
    formattedBarPoints = barPoints;
  } else {
    // Initialize with default values if missing
    formattedBarPoints = { '1': 0, '2': 0, '3': 0, '4': 0 };
  }
  
  // Return only necessary, non-sensitive user details
  res.status(200).json({
    telegram_id: telegramId,
    username: username,
    first_name: firstName,
    last_name: lastName,
    phone: phone,
    role: role,
    balance: balance,
    barPoints: formattedBarPoints
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
    console.log('=== FETCHING ALL USERS ===');
    console.log('Raw users from DB:', users.length);
    
    // Ensure barPoints is properly formatted for each user
    const formattedUsers = users.map(user => {
      const userObj = user.toObject();
      console.log(`User ${userObj.firstName} raw barPoints:`, userObj.barPoints);
      console.log(`User ${userObj.firstName} barPoints type:`, typeof userObj.barPoints);
      
      // Convert barPoints to proper format
      if (userObj.barPoints instanceof Map) {
        // Convert Map to Object
        userObj.barPoints = Object.fromEntries(userObj.barPoints);
      } else if (!userObj.barPoints || typeof userObj.barPoints !== 'object') {
        // Initialize with default values if missing or invalid
        userObj.barPoints = { '1': 0, '2': 0, '3': 0, '4': 0 };
      }
      
      console.log(`User ${userObj.firstName} final barPoints:`, userObj.barPoints);
      return userObj;
    });
    
    console.log('Sending formatted users:', formattedUsers.length);
    res.status(200).json(formattedUsers);
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

// Add points to user for specific bar (Admin only)
app.put('/api/users/:userId/add-bar-points', requireAuth, async (req, res) => {
  try {
    console.log('=== ADD BAR POINTS REQUEST ===');
    console.log('userId:', req.params.userId);
    console.log('body:', req.body);
    console.log('user role:', req.user.role);
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { points, barId } = req.body;

    if (typeof points !== 'number' || points <= 0) {
      return res.status(400).json({ error: 'Points must be a positive number' });
    }

    if (!barId || !['1', '2', '3', '4'].includes(String(barId))) {
      return res.status(400).json({ error: 'Valid barId (1-4) is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Initialize barPoints if not exists
    if (!user.barPoints) {
      user.barPoints = new Map();
      user.barPoints.set('1', 0);
      user.barPoints.set('2', 0);
      user.barPoints.set('3', 0);
      user.barPoints.set('4', 0);
    }

    const barIdStr = String(barId);
    const currentPoints = user.barPoints.get(barIdStr) || 0;
    console.log(`Current points for bar ${barIdStr}:`, currentPoints);
    
    user.barPoints.set(barIdStr, currentPoints + points);
    console.log('New barPoints after set:', Object.fromEntries(user.barPoints));
    
    await user.save();
    console.log('User saved successfully');

    const response = {
      message: `Added ${points} points to user ${user.firstName} for bar ${barId}`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        barPoints: Object.fromEntries(user.barPoints)
      }
    };
    
    console.log('Sending response:', response);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error adding bar points:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove points from user for specific bar (Admin only)
app.put('/api/users/:userId/remove-bar-points', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { points, barId } = req.body;

    if (typeof points !== 'number' || points <= 0) {
      return res.status(400).json({ error: 'Points must be a positive number' });
    }

    if (!barId || !['1', '2', '3', '4'].includes(String(barId))) {
      return res.status(400).json({ error: 'Valid barId (1-4) is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Initialize barPoints if not exists
    if (!user.barPoints) {
      user.barPoints = new Map();
      user.barPoints.set('1', 0);
      user.barPoints.set('2', 0);
      user.barPoints.set('3', 0);
      user.barPoints.set('4', 0);
    }

    const barIdStr = String(barId);
    const currentPoints = user.barPoints.get(barIdStr) || 0;
    user.barPoints.set(barIdStr, Math.max(0, currentPoints - points));
    await user.save();

    res.status(200).json({
      message: `Removed ${points} points from user ${user.firstName} for bar ${barId}`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        barPoints: Object.fromEntries(user.barPoints)
      }
    });
  } catch (error) {
    console.error('Error removing bar points:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy endpoints for backward compatibility
app.put('/api/users/:userId/add-points', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { points } = req.body;

    if (typeof points !== 'number' || points <= 0) {
      return res.status(400).json({ error: 'Points must be a positive number' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.balance = (user.balance || 0) + points;
    await user.save();

    res.status(200).json({
      message: `Added ${points} points to user ${user.firstName} (legacy balance)`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error('Error adding points:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/users/:userId/remove-points', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { points } = req.body;

    if (typeof points !== 'number' || points <= 0) {
      return res.status(400).json({ error: 'Points must be a positive number' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.balance = Math.max(0, (user.balance || 0) - points);
    await user.save();

    res.status(200).json({
      message: `Removed ${points} points from user ${user.firstName} (legacy balance)`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance
      }
    });
  } catch (error) {
    console.error('Error removing points:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bars API
// Get all bars with descriptions and menu
app.get('/api/bars', async (req, res) => {
  try {
    const bars = await Bar.find({});
    const menuItems = await MenuItem.find({ isActive: true });
    
    // Группируем меню по барам
    const barsWithMenu = bars.map(bar => ({
      ...bar.toObject(),
      menu: menuItems.filter(item => item.barId === bar.barId)
    }));
    
    res.status(200).json(barsWithMenu);
  } catch (error) {
    console.error('Error fetching bars:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific bar with menu
app.get('/api/bars/:barId', async (req, res) => {
  try {
    const { barId } = req.params;
    const bar = await Bar.findOne({ barId: parseInt(barId) });
    const menuItems = await MenuItem.find({ barId: parseInt(barId), isActive: true });
    
    if (!bar) {
      return res.status(404).json({ error: 'Bar not found' });
    }
    
    res.status(200).json({
      ...bar.toObject(),
      menu: menuItems
    });
  } catch (error) {
    console.error('Error fetching bar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update bar description (Admin only)
app.put('/api/bars/:barId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { barId } = req.params;
    const { description } = req.body;

    let bar = await Bar.findOne({ barId: parseInt(barId) });
    
    if (!bar) {
      // Создаем новый бар если не существует
      const defaultBars = {
        1: { name: "Культура", address: "Ульяновск, Ленина, 15", image: "/images/bars/kultura.jpg" },
        2: { name: "Caballitos Mexican Bar", address: "Ульяновск, Дворцовая, 8", image: "/images/bars/cabalitos.jpg" },
        3: { name: "Fonoteca - Listening Bar", address: "Ульяновск, Карла Маркса, 20", image: "/images/bars/fonoteka.jpg" },
        4: { name: "Tchaikovsky", address: "Ульяновск, Советская, 25", image: "/images/bars/tchaykovsky.jpg" }
      };
      
      const defaultBar = defaultBars[parseInt(barId)];
      if (!defaultBar) {
        return res.status(404).json({ error: 'Bar not found' });
      }
      
      bar = new Bar({
        barId: parseInt(barId),
        ...defaultBar,
        description
      });
    } else {
      bar.description = description;
    }

    await bar.save();
    res.status(200).json(bar);
  } catch (error) {
    console.error('Error updating bar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update bar image (Admin only)
app.put('/api/bars/:barId/image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { barId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const imageUrl = `${process.env.BACKEND_URL || 'http://localhost:8000'}/uploads/${req.file.filename}`;

    let bar = await Bar.findOne({ barId: parseInt(barId) });
    
    if (!bar) {
      // Создаем новый бар если не существует
      const defaultBars = {
        1: { name: "Культура", address: "Ульяновск, Ленина, 15", image: "/images/bars/kultura.jpg" },
        2: { name: "Caballitos Mexican Bar", address: "Ульяновск, Дворцовая, 8", image: "/images/bars/cabalitos.jpg" },
        3: { name: "Fonoteca - Listening Bar", address: "Ульяновск, Карла Маркса, 20", image: "/images/bars/fonoteka.jpg" },
        4: { name: "Tchaikovsky", address: "Ульяновск, Советская, 25", image: "/images/bars/tchaykovsky.jpg" }
      };
      
      const defaultBar = defaultBars[parseInt(barId)];
      if (!defaultBar) {
        return res.status(404).json({ error: 'Bar not found' });
      }
      
      bar = new Bar({
        barId: parseInt(barId),
        ...defaultBar,
        image: imageUrl
      });
    } else {
      bar.image = imageUrl;
    }

    await bar.save();
    res.status(200).json({ image: imageUrl });
  } catch (error) {
    console.error('Error updating bar image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add menu item (Admin only)
app.post('/api/bars/:barId/menu', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { barId } = req.params;
    const { name, price } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const menuItem = new MenuItem({
      barId: parseInt(barId),
      name,
      price: parseFloat(price),
      image: req.file ? `${process.env.BACKEND_URL || 'http://localhost:8000'}/uploads/${req.file.filename}` : '/images/drinks/placeholder-drink.jpg'
    });

    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Error adding menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete menu item (Admin only)
app.delete('/api/menu/:itemId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { itemId } = req.params;
    const menuItem = await MenuItem.findByIdAndUpdate(
      itemId,
      { isActive: false },
      { new: true }
    );

    if (!menuItem) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.status(200).json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process QR purchase (Admin only - for barman scanning)
app.post('/api/purchase/qr', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ error: 'QR data is required' });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    const { userId, barId, itemId, itemName, itemPrice, timestamp, expiresAt } = parsedData;

    // Validate required fields
    if (!userId || !barId || !itemId || !itemName || !itemPrice || !timestamp || !expiresAt) {
      return res.status(400).json({ error: 'Invalid QR code data' });
    }

    // Check if QR code is expired
    const now = Date.now();
    if (now > expiresAt) {
      return res.status(400).json({ error: 'QR code has expired' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check user has enough points for this bar
    const barIdStr = String(barId);
    const currentPoints = user.barPoints.get(barIdStr) || 0;
    
    if (currentPoints < itemPrice) {
      return res.status(400).json({ 
        error: 'Insufficient points',
        currentPoints,
        requiredPoints: itemPrice
      });
    }

    // Deduct points
    user.barPoints.set(barIdStr, currentPoints - itemPrice);
    await user.save();

    res.status(200).json({
      success: true,
      message: `Purchase successful: ${itemName}`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName
      },
      purchase: {
        itemName,
        itemPrice,
        barId,
        timestamp: new Date(timestamp)
      },
      remainingPoints: currentPoints - itemPrice
    });
  } catch (error) {
    console.error('Error processing QR purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Points Settings Management (Admin only)

// Get points settings for all bars
app.get('/api/admin/points-settings', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Возвращаем настройки по умолчанию для всех баров
    const defaultSettings = {
      '1': { pointsPerRuble: 0.01, minPurchase: 0, isActive: true }, // Культура
      '2': { pointsPerRuble: 0.01, minPurchase: 0, isActive: true }, // Caballitos
      '3': { pointsPerRuble: 0.01, minPurchase: 0, isActive: true }, // Fonoteca
      '4': { pointsPerRuble: 0.01, minPurchase: 0, isActive: true }  // Tchaikovsky
    };

    // В будущем здесь можно добавить загрузку из БД
    res.status(200).json(defaultSettings);
  } catch (error) {
    console.error('Error fetching points settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update points settings for specific bar
app.put('/api/admin/points-settings/:barId', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { barId } = req.params;
    const { pointsPerRuble, minPurchase, isActive } = req.body;

    // Validate input
    if (typeof pointsPerRuble !== 'number' || pointsPerRuble <= 0) {
      return res.status(400).json({ error: 'pointsPerRuble must be a positive number' });
    }

    if (typeof minPurchase !== 'number' || minPurchase < 0) {
      return res.status(400).json({ error: 'minPurchase must be a non-negative number' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    // Validate barId
    const validBarIds = ['1', '2', '3', '4'];
    if (!validBarIds.includes(barId)) {
      return res.status(400).json({ error: 'Invalid bar ID' });
    }

    const newSettings = {
      pointsPerRuble,
      minPurchase,
      isActive
    };

    // В будущем здесь можно добавить сохранение в БД
    console.log(`Points settings updated for bar ${barId}:`, newSettings);

    res.status(200).json({
      message: `Points settings updated for bar ${barId}`,
      barId,
      settings: newSettings
    });
  } catch (error) {
    console.error('Error updating points settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Calculate points for purchase (utility endpoint)
app.post('/api/admin/calculate-points', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { barId, purchaseAmount } = req.body;

    if (!barId || typeof purchaseAmount !== 'number' || purchaseAmount <= 0) {
      return res.status(400).json({ error: 'Valid barId and purchaseAmount are required' });
    }

    // Получаем настройки для бара (пока используем значения по умолчанию)
    const pointsPerRuble = 0.01; // 1 балл за 100 рублей
    const minPurchase = 0;
    const isActive = true;

    if (!isActive) {
      return res.status(200).json({
        pointsEarned: 0,
        message: 'Points earning is disabled for this bar'
      });
    }

    if (purchaseAmount < minPurchase) {
      return res.status(200).json({
        pointsEarned: 0,
        message: `Purchase amount is below minimum threshold of ${minPurchase} rubles`
      });
    }

    const pointsEarned = Math.floor(purchaseAmount * pointsPerRuble);

    res.status(200).json({
      pointsEarned,
      purchaseAmount,
      pointsPerRuble,
      minPurchase,
      calculation: `${purchaseAmount} ₽ × ${pointsPerRuble} = ${pointsEarned} points`
    });
  } catch (error) {
    console.error('Error calculating points:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Development-only: Emulate purchase (for testing QR flow)
app.post('/api/dev/emulate-purchase', requireAuth, async (req, res) => {
  try {
    // Только в development режиме (по умолчанию считаем development если не указано)
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      return res.status(403).json({ error: 'This endpoint is only available in development mode' });
    }

    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({ error: 'QR data is required' });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    const { userId, barId, itemId, itemName, itemPrice, timestamp, expiresAt } = parsedData;

    // Validate required fields
    if (!userId || !barId || !itemId || !itemName || !itemPrice || !timestamp || !expiresAt) {
      return res.status(400).json({ error: 'Invalid QR code data' });
    }

    // Check if QR code is expired
    const now = Date.now();
    if (now > expiresAt) {
      return res.status(400).json({ error: 'QR code has expired' });
    }

    // Find user - в dev режиме пользователь может эмулировать свою покупку
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is trying to emulate their own purchase
    if (user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only emulate your own purchases' });
    }

    // Check user has enough points for this bar
    const barIdStr = String(barId);
    const currentPoints = user.barPoints.get(barIdStr) || 0;
    
    if (currentPoints < itemPrice) {
      return res.status(400).json({ 
        error: 'Insufficient points',
        currentPoints,
        requiredPoints: itemPrice
      });
    }

    // Deduct points
    user.barPoints.set(barIdStr, currentPoints - itemPrice);
    await user.save();

    res.status(200).json({
      success: true,
      message: `✅ Покупка эмулирована: ${itemName}`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName
      },
      purchase: {
        itemName,
        itemPrice,
        barId,
        timestamp: new Date(timestamp)
      },
      remainingPoints: currentPoints - itemPrice,
      devNote: 'This was a development emulation'
    });
  } catch (error) {
    console.error('Error emulating purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User stats endpoint
app.get('/api/user/stats', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Инициализируем barPoints если не существует
    if (!user.barPoints || !(user.barPoints instanceof Map)) {
      user.barPoints = new Map();
      user.barPoints.set('1', 0);
      user.barPoints.set('2', 0);
      user.barPoints.set('3', 0);
      user.barPoints.set('4', 0);
      await user.save();
    }

    // Получаем общую статистику пользователя
    const barPointsMap = user.barPoints;
    const barPointsObj = Object.fromEntries(barPointsMap);
    const totalPoints = Object.values(barPointsObj).reduce((sum, points) => sum + (points || 0), 0);
    const barsWithPoints = Object.keys(barPointsObj).filter(barId => (barPointsObj[barId] || 0) > 0).length;

    res.status(200).json({
      totalPoints,
      barsWithPoints,
      barPoints: barPointsObj,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
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
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`MongoDB URI: ${process.env.MONGO_URI ? 'configured' : 'not configured'}`);
}); 