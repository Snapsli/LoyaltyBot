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
const { requireAuth, requireAdmin } = require('./middleware/authMiddleware'); // Импортируем middleware
const { getBarPointsSettings, updateBarPointsSettings, pointsSettings } = require('./utils/pointsSettings');
const Transaction = require('./models/Transaction');

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

// Authentication Middleware (REMOVED FROM HERE)
// const requireAuth = async (req, res, next) => { ... };

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
      // Create new user
      sessionToken = crypto.randomBytes(32).toString('hex');
      
      // Role assignment: admin if first user, otherwise user
      let assignedRole = 'user';

      if (userCount === 0 && telegram_id !== 123456789) { // Don't make the mock user an admin
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

    // Создаем и сохраняем транзакцию
    const transaction = new Transaction({
        userId: userId,
        barId: barId,
        type: 'earn',
        points: points,
        description: `Административное начисление ${points} баллов`
    });
    await transaction.save();

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
    const actualPointsRemoved = Math.min(points, currentPoints); // Фактически списанные баллы
    user.barPoints.set(barIdStr, Math.max(0, currentPoints - points));
    await user.save();

    // Создаем и сохраняем транзакцию
    const transaction = new Transaction({
        userId: userId,
        barId: barId,
        type: 'spend',
        points: -actualPointsRemoved,
        description: `Административное списание ${actualPointsRemoved} баллов`
    });
    await transaction.save();

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

// Process QR earn points (Admin only - for barman scanning)
app.post('/api/earn/qr', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { qrData, purchaseAmount } = req.body;

    if (!qrData) {
      return res.status(400).json({ error: 'QR data is required' });
    }

    if (!purchaseAmount || typeof purchaseAmount !== 'number' || purchaseAmount <= 0) {
      return res.status(400).json({ error: 'Valid purchase amount is required' });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    const { type, userId, barId, barName, timestamp, expiresAt } = parsedData;

    // Validate this is an earn QR code
    if (type !== 'earn') {
      return res.status(400).json({ error: 'Invalid QR code type' });
    }

    // Validate required fields
    if (!userId || !barId || !barName || !timestamp || !expiresAt) {
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

    // Get points settings for this bar
    const barSettings = getBarPointsSettings(barId);
    console.log(`💰 Earning points for bar ${barId} (${barName})`);
    console.log(`💰 Using settings:`, barSettings);
    console.log(`💰 Rate: 1 point = ${Math.round(1/barSettings.pointsPerRuble)} ₽`);
    
    // Check if points earning is active for this bar
    if (!barSettings.isActive) {
      return res.status(400).json({ 
        error: 'Points earning is disabled for this bar',
        barId,
        barName
      });
    }

    // Check minimum purchase requirement
    if (purchaseAmount < barSettings.minPurchase) {
      return res.status(400).json({ 
        error: `Purchase amount is below minimum threshold of ${barSettings.minPurchase} rubles`,
        purchaseAmount,
        minPurchase: barSettings.minPurchase
      });
    }

    // Calculate points to earn using bar-specific settings
    const pointsEarned = Math.floor(purchaseAmount * barSettings.pointsPerRuble);

    if (pointsEarned <= 0) {
      return res.status(400).json({ error: 'Purchase amount too small to earn points' });
    }

    // Add points to user
    const barIdStr = String(barId);
    const currentPoints = user.barPoints.get(barIdStr) || 0;
    const newPoints = currentPoints + pointsEarned;
    
    user.barPoints.set(barIdStr, newPoints);
    await user.save();

    // Создаем и сохраняем транзакцию
    const transaction = new Transaction({
        userId: userId,
        barId: barId,
        type: 'earn',
        points: pointsEarned,
        description: `Начисление за покупку на ${purchaseAmount} ₽ (через QR)`
    });
    await transaction.save();

    res.status(200).json({
      success: true,
      message: `Points earned successfully: +${pointsEarned} points`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName
      },
      transaction: {
        barId,
        barName,
        purchaseAmount,
        pointsEarned,
        pointsPerRuble: barSettings.pointsPerRuble,
        minPurchase: barSettings.minPurchase,
        calculation: `${purchaseAmount} ₽ × ${barSettings.pointsPerRuble} = ${pointsEarned} points`,
        timestamp: new Date(timestamp)
      },
      previousPoints: currentPoints,
      newTotalPoints: newPoints
    });
  } catch (error) {
    console.error('Error processing QR earn points:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Points Settings Management (Admin only)

// Get points settings for all bars (Admin only)
app.get('/api/admin/points-settings', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('📥 GET /api/admin/points-settings called by:', req.user.firstName);
    console.log('📥 Current pointsSettings object:', pointsSettings);

    // Получаем настройки для всех баров используя общую функцию
    const allSettings = {
      '1': getBarPointsSettings('1'),
      '2': getBarPointsSettings('2'),
      '3': getBarPointsSettings('3'),
      '4': getBarPointsSettings('4')
    };

    console.log('📤 GET /api/admin/points-settings - returning:', allSettings);
    console.log('📤 Bar 1 settings specifically:', allSettings['1'], '(1 point =', Math.round(1/allSettings['1'].pointsPerRuble), '₽)');
    res.status(200).json(allSettings);
  } catch (error) {
    console.error('Error fetching points settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get points settings for all bars (Public - for users)
app.get('/api/points-settings', requireAuth, async (req, res) => {
  try {
    console.log('📥 GET /api/points-settings called by:', req.user.firstName);
    console.log('📥 Current pointsSettings object:', pointsSettings);

    // Получаем настройки для всех баров используя общую функцию
    const allSettings = {
      '1': getBarPointsSettings('1'),
      '2': getBarPointsSettings('2'),
      '3': getBarPointsSettings('3'),
      '4': getBarPointsSettings('4')
    };

    console.log('📤 GET /api/points-settings - returning:', allSettings);
    console.log('📤 Bar 1 settings specifically:', allSettings['1'], '(1 point =', Math.round(1/allSettings['1'].pointsPerRuble), '₽)');
    res.status(200).json(allSettings);
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

    // Сохраняем настройки в памяти
    const updatedSettings = updateBarPointsSettings(barId, newSettings);
    console.log(`🔧 Points settings updated for bar ${barId}:`);
    console.log('  - Received data:', { pointsPerRuble, minPurchase, isActive });
    console.log('  - Updated settings:', updatedSettings);
    console.log('  - Calculated rate: 1 point =', Math.round(1/updatedSettings.pointsPerRuble), '₽');
    console.log('  - Current pointsSettings object:', pointsSettings);

    res.status(200).json({
      message: `Points settings updated for bar ${barId}`,
      barId,
      settings: updatedSettings
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

    // Получаем настройки для бара
    const barSettings = getBarPointsSettings(barId);

    if (!barSettings.isActive) {
      return res.status(200).json({
        pointsEarned: 0,
        message: 'Points earning is disabled for this bar',
        settings: barSettings
      });
    }

    if (purchaseAmount < barSettings.minPurchase) {
      return res.status(200).json({
        pointsEarned: 0,
        message: `Purchase amount is below minimum threshold of ${barSettings.minPurchase} rubles`,
        settings: barSettings
      });
    }

    const pointsEarned = Math.floor(purchaseAmount * barSettings.pointsPerRuble);

    res.status(200).json({
      pointsEarned,
      purchaseAmount,
      pointsPerRuble: barSettings.pointsPerRuble,
      minPurchase: barSettings.minPurchase,
      calculation: `${purchaseAmount} ₽ × ${barSettings.pointsPerRuble} = ${pointsEarned} points`,
      settings: barSettings
    });
  } catch (error) {
    console.error('Error calculating points:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Development-only: Debug endpoint to check current settings
app.get('/api/dev/points-settings-debug', (req, res) => {
  console.log('🔍 DEBUG: Current pointsSettings object:', pointsSettings);
  res.json({
    currentSettings: pointsSettings,
    timestamp: new Date().toISOString(),
    message: 'Current in-memory settings'
  });
});

// Development-only: Emulate earn points (for testing)
app.post('/api/dev/emulate-earn', requireAuth, async (req, res) => {
  try {
    // Только в development режиме
    const nodeEnv = process.env.NODE_ENV || 'development';
    if (nodeEnv === 'production') {
      return res.status(403).json({ error: 'This endpoint is only available in development mode' });
    }

    const { qrData, purchaseAmount } = req.body;

    if (!qrData) {
      return res.status(400).json({ error: 'QR data is required' });
    }

    if (!purchaseAmount || typeof purchaseAmount !== 'number' || purchaseAmount <= 0) {
      return res.status(400).json({ error: 'Valid purchase amount is required' });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    const { type, userId, barId, barName, timestamp, expiresAt } = parsedData;

    // Validate this is an earn QR code
    if (type !== 'earn') {
      return res.status(400).json({ error: 'Invalid QR code type' });
    }

    // Validate required fields
    if (!userId || !barId || !barName || !timestamp || !expiresAt) {
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

    // Get points settings for this bar
    const barSettings = getBarPointsSettings(barId);
    console.log(`💰 DEV Emulate earning points for bar ${barId} (${barName})`);
    console.log(`💰 Using settings:`, barSettings);
    console.log(`💰 Rate: 1 point = ${Math.round(1/barSettings.pointsPerRuble)} ₽`);
    
    // Check if points earning is active for this bar
    if (!barSettings.isActive) {
      return res.status(400).json({ 
        error: 'Points earning is disabled for this bar',
        barId,
        barName
      });
    }

    // Check minimum purchase requirement
    if (purchaseAmount < barSettings.minPurchase) {
      return res.status(400).json({ 
        error: `Purchase amount is below minimum threshold of ${barSettings.minPurchase} rubles`,
        purchaseAmount,
        minPurchase: barSettings.minPurchase
      });
    }

    // Calculate points to earn using bar-specific settings
    const pointsEarned = Math.floor(purchaseAmount * barSettings.pointsPerRuble);

    if (pointsEarned <= 0) {
      return res.status(400).json({ error: 'Purchase amount too small to earn points' });
    }

    // Add points to user
    const barIdStr = String(barId);
    const currentPoints = user.barPoints.get(barIdStr) || 0;
    const newPoints = currentPoints + pointsEarned;
    
    user.barPoints.set(barIdStr, newPoints);
    await user.save();

    // Создаем и сохраняем транзакцию
    const transaction = new Transaction({
        userId: userId,
        barId: barId,
        type: 'earn',
        points: pointsEarned,
        description: `Эмуляция начисления за покупку на ${purchaseAmount} ₽`
    });
    await transaction.save();

    res.status(200).json({
      success: true,
      message: `Points earned successfully: +${pointsEarned} points`,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName
      },
      transaction: {
        barId,
        barName,
        purchaseAmount,
        pointsEarned,
        pointsPerRuble: barSettings.pointsPerRuble,
        minPurchase: barSettings.minPurchase,
        calculation: `${purchaseAmount} ₽ × ${barSettings.pointsPerRuble} = ${pointsEarned} points`,
        timestamp: new Date(timestamp)
      },
      previousPoints: currentPoints,
      newTotalPoints: newPoints
    });
  } catch (error) {
    console.error('Error emulating earn points:', error);
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
      // Декодируем base64 и парсим JSON
      const decodedData = atob(qrData);
      parsedData = JSON.parse(decodedData);
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

    // Создаем и сохраняем транзакцию
    const transaction = new Transaction({
        userId: userId,
        barId: barId,
        type: 'spend',
        points: -itemPrice,
        description: `Эмуляция покупки: "${itemName}"`
    });
    await transaction.save();

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

// --- Transaction polling endpoint ---
app.get('/api/transactions/latest', requireAuth, async (req, res) => {
    try {
        const latestTransaction = await Transaction.findOne({ userId: req.user._id })
                                                   .sort({ timestamp: -1 }); // Находим самую последнюю

        if (!latestTransaction) {
            return res.status(204).send(); // No Content
        }

        res.status(200).json(latestTransaction);
    } catch (error) {
        console.error('Error fetching latest transaction:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get transaction history for user and specific bar
app.get('/api/transactions/history/:barId', requireAuth, async (req, res) => {
    try {
        const { barId } = req.params;
        const { type, page = 1, limit = 20 } = req.query;

        // Validate barId
        if (!barId || !['1', '2', '3', '4'].includes(barId)) {
            return res.status(400).json({ error: 'Valid barId (1-4) is required' });
        }

        // Build query filter
        const filter = {
            userId: req.user._id,
            barId: barId
        };

        // Add type filter if specified
        if (type && ['earn', 'spend'].includes(type)) {
            filter.type = type;
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Get transactions with pagination
        const transactions = await Transaction.find(filter)
            .sort({ timestamp: -1 }) // Newest first
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination info
        const totalCount = await Transaction.countDocuments(filter);
        const totalPages = Math.ceil(totalCount / parseInt(limit));

        // Get bar name for display
        const barNames = {
            '1': 'Культура',
            '2': 'Caballitos Mexican Bar', 
            '3': 'Fonoteca - Listening Bar',
            '4': 'Tchaikovsky'
        };

        res.status(200).json({
            transactions,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalCount,
                hasMore: parseInt(page) < totalPages
            },
            barInfo: {
                barId,
                barName: barNames[barId]
            }
        });
    } catch (error) {
        console.error('Error fetching transaction history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get bar statistics for admin
app.get('/api/admin/stats/bar/:barId', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { barId } = req.params;
        const { startDate, endDate, type } = req.query;

        // Validate barId
        if (!barId || !['1', '2', '3', '4'].includes(barId)) {
            return res.status(400).json({ error: 'Valid barId (1-4) is required' });
        }

        // Build date filter
        const dateFilter = {};
        if (startDate) {
            dateFilter.$gte = new Date(startDate);
        }
        if (endDate) {
            dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
        }

        // Build base query filter
        const baseFilter = { barId: barId };
        if (Object.keys(dateFilter).length > 0) {
            baseFilter.timestamp = dateFilter;
        }

        // Get earnings and spendings statistics
        const earnFilter = { ...baseFilter, type: 'earn' };
        const spendFilter = { ...baseFilter, type: 'spend' };

        // Apply type filter if specified
        let finalFilter = baseFilter;
        if (type === 'earn') {
            finalFilter = earnFilter;
        } else if (type === 'spend') {
            finalFilter = spendFilter;
        }

        // Get transactions for the filtered period
        const transactions = await Transaction.find(finalFilter).sort({ timestamp: -1 });

        // Calculate basic statistics
        const earnTransactions = await Transaction.find(earnFilter);
        const spendTransactions = await Transaction.find(spendFilter);

        const earnCount = earnTransactions.length;
        const spendCount = spendTransactions.length;
        const totalEarnPoints = earnTransactions.reduce((sum, t) => sum + Math.abs(t.points), 0);
        const totalSpendPoints = spendTransactions.reduce((sum, t) => sum + Math.abs(t.points), 0);

        // Calculate most popular items (for spend transactions only)
        const itemStats = {};
        spendTransactions.forEach(transaction => {
            // Extract item name from description
            const itemMatch = transaction.description.match(/за (.+)$/);
            if (itemMatch) {
                const itemName = itemMatch[1];
                if (!itemStats[itemName]) {
                    itemStats[itemName] = {
                        name: itemName,
                        count: 0,
                        totalPoints: 0
                    };
                }
                itemStats[itemName].count++;
                itemStats[itemName].totalPoints += Math.abs(transaction.points);
            }
        });

        // Sort items by popularity (count)
        const popularItems = Object.values(itemStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10 most popular items

        // Calculate daily statistics for charts
        const dailyStats = {};
        transactions.forEach(transaction => {
            const date = transaction.timestamp.toISOString().split('T')[0];
            if (!dailyStats[date]) {
                dailyStats[date] = {
                    date,
                    earnCount: 0,
                    spendCount: 0,
                    earnPoints: 0,
                    spendPoints: 0
                };
            }
            
            if (transaction.type === 'earn') {
                dailyStats[date].earnCount++;
                dailyStats[date].earnPoints += Math.abs(transaction.points);
            } else {
                dailyStats[date].spendCount++;
                dailyStats[date].spendPoints += Math.abs(transaction.points);
            }
        });

        const dailyStatsArray = Object.values(dailyStats)
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Get bar name
        const barNames = {
            '1': 'Культура',
            '2': 'Caballitos Mexican Bar', 
            '3': 'Fonoteca - Listening Bar',
            '4': 'Tchaikovsky'
        };

        // Get unique users count
        const uniqueUsers = new Set();
        transactions.forEach(t => uniqueUsers.add(t.userId.toString()));

        res.status(200).json({
            barInfo: {
                barId,
                barName: barNames[barId]
            },
            period: {
                startDate: startDate || null,
                endDate: endDate || null,
                type: type || 'all'
            },
            summary: {
                totalTransactions: transactions.length,
                earnCount,
                spendCount,
                totalEarnPoints,
                totalSpendPoints,
                netPoints: totalEarnPoints - totalSpendPoints,
                uniqueUsersCount: uniqueUsers.size
            },
            popularItems,
            dailyStats: dailyStatsArray,
            recentTransactions: transactions.slice(0, 20) // Last 20 transactions
        });
    } catch (error) {
        console.error('Error fetching bar statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user statistics for admin
app.get('/api/admin/stats/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { startDate, endDate, barId, search, sortBy = 'totalPoints', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

        // Build date filter for user registration
        const userDateFilter = {};
        if (startDate) {
            userDateFilter.createdAt = { $gte: new Date(startDate) };
        }
        if (endDate) {
            userDateFilter.createdAt = { 
                ...userDateFilter.createdAt, 
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
            };
        }

        // Build transaction date filter
        const transactionDateFilter = {};
        if (startDate) {
            transactionDateFilter.timestamp = { $gte: new Date(startDate) };
        }
        if (endDate) {
            transactionDateFilter.timestamp = { 
                ...transactionDateFilter.timestamp, 
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
            };
        }

        // Build search filter
        const searchFilter = {};
        if (search) {
            searchFilter.$or = [
                { first_name: { $regex: search, $options: 'i' } },
                { last_name: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } },
                { phone_number: { $regex: search, $options: 'i' } }
            ];
        }

        // Get all users with applied filters
        const allUsers = await User.find({ ...userDateFilter, ...searchFilter });
        
        // Get all transactions with date filter
        const allTransactions = await Transaction.find(transactionDateFilter);

        // Calculate user statistics
        const userStats = await Promise.all(allUsers.map(async (user) => {
            // Get user transactions
            let userTransactions = allTransactions.filter(t => t.userId.toString() === user._id.toString());
            
            // Filter by bar if specified
            if (barId && ['1', '2', '3', '4'].includes(barId)) {
                userTransactions = userTransactions.filter(t => t.barId === barId);
            }

            const earnTransactions = userTransactions.filter(t => t.type === 'earn');
            const spendTransactions = userTransactions.filter(t => t.type === 'spend');
            
            const totalEarnPoints = earnTransactions.reduce((sum, t) => sum + Math.abs(t.points), 0);
            const totalSpendPoints = spendTransactions.reduce((sum, t) => sum + Math.abs(t.points), 0);
            
            // Calculate total current points from barPoints (handle both Map and Object)
            let currentPoints = 0;
            if (user.barPoints) {
                if (user.barPoints instanceof Map) {
                    // Handle Map object (MongoDB)
                    for (let points of user.barPoints.values()) {
                        currentPoints += points || 0;
                    }
                } else if (typeof user.barPoints === 'object') {
                    // Handle regular object
                    currentPoints = Object.values(user.barPoints).reduce((sum, points) => sum + (points || 0), 0);
                }
            }
            
            // Calculate activity score (transactions in last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const recentTransactions = userTransactions.filter(t => t.timestamp >= thirtyDaysAgo);
            
            // Calculate bar distribution
            const barDistribution = {};
            userTransactions.forEach(t => {
                if (!barDistribution[t.barId]) {
                    barDistribution[t.barId] = 0;
                }
                barDistribution[t.barId]++;
            });

            // Find most active bar
            const mostActiveBar = Object.entries(barDistribution)
                .sort((a, b) => b[1] - a[1])[0];

            // Create clean user object without mongoose methods
            const cleanUser = {
                _id: user._id.toString(),
                first_name: String(user.first_name || ''),
                last_name: String(user.last_name || ''),
                username: String(user.username || ''),
                phone_number: String(user.phone_number || ''),
                role: String(user.role || 'user'),
                isActive: Boolean(user.isActive !== false),
                createdAt: user.createdAt,
                currentPoints: Number(currentPoints) || 0,
                totalEarnPoints: Number(totalEarnPoints) || 0,
                totalSpendPoints: Number(totalSpendPoints) || 0,
                totalTransactions: Number(userTransactions.length) || 0,
                earnTransactions: Number(earnTransactions.length) || 0,
                spendTransactions: Number(spendTransactions.length) || 0,
                recentActivity: Number(recentTransactions.length) || 0,
                lastActivity: userTransactions.length > 0 ? userTransactions[userTransactions.length - 1].timestamp : null,
                barDistribution: barDistribution || {},
                mostActiveBar: mostActiveBar ? {
                    barId: String(mostActiveBar[0]),
                    barName: String({
                        '1': 'Культура',
                        '2': 'Caballitos Mexican Bar',
                        '3': 'Fonoteca - Listening Bar',
                        '4': 'Tchaikovsky'
                    }[mostActiveBar[0]] || ''),
                    transactionCount: Number(mostActiveBar[1]) || 0
                } : null
            };
            
            return cleanUser;
        }));

        // Sort users
        const sortField = {
            'totalPoints': 'currentPoints',
            'activity': 'totalTransactions',
            'recent': 'recentActivity',
            'earned': 'totalEarnPoints',
            'spent': 'totalSpendPoints',
            'created': 'createdAt'
        }[sortBy] || 'currentPoints';

        userStats.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            const order = sortOrder === 'desc' ? -1 : 1;
            
            if (sortField === 'createdAt') {
                return order * (new Date(bVal) - new Date(aVal));
            }
            return order * (bVal - aVal);
        });

        // Apply pagination
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const paginatedUsers = userStats.slice(startIndex, startIndex + parseInt(limit));

        // Calculate overall statistics
        const totalUsers = allUsers.length;
        const activeUsers = allUsers.filter(u => u.isActive).length;
        const blockedUsers = totalUsers - activeUsers;
        
        // Users registered in the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newUsers = allUsers.filter(u => u.createdAt >= thirtyDaysAgo).length;

        // Calculate registration trends (last 14 days)
        const registrationTrends = {};
        for (let i = 13; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            registrationTrends[dateStr] = 0;
        }

        allUsers.forEach(user => {
            const regDate = user.createdAt.toISOString().split('T')[0];
            if (registrationTrends.hasOwnProperty(regDate)) {
                registrationTrends[regDate]++;
            }
        });

        const registrationTrendsArray = Object.entries(registrationTrends)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Bar distribution
        const barDistributionTotal = {};
        allTransactions.forEach(t => {
            if (!barDistributionTotal[t.barId]) {
                barDistributionTotal[t.barId] = {
                    barId: t.barId,
                    barName: {
                        '1': 'Культура',
                        '2': 'Caballitos Mexican Bar',
                        '3': 'Fonoteca - Listening Bar',
                        '4': 'Tchaikovsky'
                    }[t.barId],
                    userCount: new Set(),
                    transactionCount: 0
                };
            }
            barDistributionTotal[t.barId].userCount.add(t.userId.toString());
            barDistributionTotal[t.barId].transactionCount++;
        });

        // Convert Sets to counts
        const barDistributionArray = Object.values(barDistributionTotal).map(bar => ({
            ...bar,
            userCount: bar.userCount.size
        }));

        // Calculate clean summary statistics
        const totalPointsInSystem = userStats.reduce((sum, u) => sum + (Number(u.currentPoints) || 0), 0);
        const avgPointsPerUser = totalUsers > 0 ? Math.round(totalPointsInSystem / totalUsers) : 0;

        res.status(200).json({
            summary: {
                totalUsers: Number(totalUsers) || 0,
                activeUsers: Number(activeUsers) || 0,
                blockedUsers: Number(blockedUsers) || 0,
                newUsers: Number(newUsers) || 0,
                avgPointsPerUser: Number(avgPointsPerUser) || 0,
                totalPointsInSystem: Number(totalPointsInSystem) || 0
            },
            users: paginatedUsers,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(userStats.length / parseInt(limit)),
                totalCount: userStats.length,
                hasMore: startIndex + parseInt(limit) < userStats.length
            },
            registrationTrends: registrationTrendsArray,
            barDistribution: barDistributionArray,
            filters: {
                startDate: startDate || null,
                endDate: endDate || null,
                barId: barId || null,
                search: search || null,
                sortBy,
                sortOrder
            }
        });
    } catch (error) {
        console.error('Error fetching user statistics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Export data for SBIS
app.get('/api/admin/export/sbis', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { type = 'sales', startDate, endDate, barId, format = 'csv' } = req.query;

        // Build date filter
        const dateFilter = {};
        if (startDate) {
            dateFilter.timestamp = { $gte: new Date(startDate) };
        }
        if (endDate) {
            dateFilter.timestamp = { 
                ...dateFilter.timestamp, 
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) 
            };
        }

        // Build base filter
        const baseFilter = { ...dateFilter };
        if (barId && ['1', '2', '3', '4'].includes(barId)) {
            baseFilter.barId = barId;
        }

        let exportData = [];
        let filename = '';

        switch (type) {
            case 'sales':
                // Sales report - transactions data
                const transactions = await Transaction.find(baseFilter).populate('userId', 'first_name last_name phone_number');
                
                exportData = transactions.map(t => ({
                    date: t.timestamp.toISOString().split('T')[0],
                    time: t.timestamp.toTimeString().split(' ')[0],
                    bar_id: t.barId,
                    bar_name: {
                        '1': 'Культура',
                        '2': 'Caballitos Mexican Bar',
                        '3': 'Fonoteca - Listening Bar',
                        '4': 'Tchaikovsky'
                    }[t.barId],
                    transaction_type: t.type === 'earn' ? 'начисление' : 'списание',
                    points: Math.abs(t.points),
                    description: t.description,
                    user_id: t.userId._id.toString(),
                    user_name: `${t.userId.first_name} ${t.userId.last_name}`,
                    user_phone: t.userId.phone_number || ''
                }));
                filename = `sbis_sales_${new Date().toISOString().split('T')[0]}`;
                break;

            case 'financial':
                // Financial report - revenue analysis
                const allTransactions = await Transaction.find(baseFilter);
                const barRevenue = {};
                
                allTransactions.forEach(t => {
                    if (!barRevenue[t.barId]) {
                        barRevenue[t.barId] = {
                            bar_id: t.barId,
                            bar_name: {
                                '1': 'Культура',
                                '2': 'Caballitos Mexican Bar',
                                '3': 'Fonoteca - Listening Bar',
                                '4': 'Tchaikovsky'
                            }[t.barId],
                            total_earned: 0,
                            total_spent: 0,
                            transaction_count: 0,
                            unique_users: new Set()
                        };
                    }
                    
                    if (t.type === 'earn') {
                        barRevenue[t.barId].total_earned += Math.abs(t.points);
                    } else {
                        barRevenue[t.barId].total_spent += Math.abs(t.points);
                    }
                    
                    barRevenue[t.barId].transaction_count++;
                    barRevenue[t.barId].unique_users.add(t.userId.toString());
                });

                exportData = Object.values(barRevenue).map(bar => ({
                    ...bar,
                    unique_users: bar.unique_users.size,
                    net_revenue: bar.total_earned - bar.total_spent,
                    avg_transaction: bar.transaction_count > 0 ? Math.round(bar.total_spent / bar.transaction_count) : 0
                }));
                filename = `sbis_financial_${new Date().toISOString().split('T')[0]}`;
                break;

            case 'customers':
                // Customer loyalty report
                const users = await User.find({ role: 'user' });
                const userStats = await Promise.all(users.map(async (user) => {
                    const userTransactions = await Transaction.find({ 
                        userId: user._id,
                        ...baseFilter
                    });

                    const earnTransactions = userTransactions.filter(t => t.type === 'earn');
                    const spendTransactions = userTransactions.filter(t => t.type === 'spend');
                    
                    const totalEarned = earnTransactions.reduce((sum, t) => sum + Math.abs(t.points), 0);
                    const totalSpent = spendTransactions.reduce((sum, t) => sum + Math.abs(t.points), 0);
                    
                    // Calculate current points
                    let currentPoints = 0;
                    if (user.barPoints) {
                        if (user.barPoints instanceof Map) {
                            for (let points of user.barPoints.values()) {
                                currentPoints += points || 0;
                            }
                        } else if (typeof user.barPoints === 'object') {
                            currentPoints = Object.values(user.barPoints).reduce((sum, points) => sum + (points || 0), 0);
                        }
                    }

                    return {
                        user_id: user._id.toString(),
                        first_name: user.first_name || '',
                        last_name: user.last_name || '',
                        phone: user.phone_number || '',
                        username: user.username || '',
                        registration_date: user.createdAt.toISOString().split('T')[0],
                        current_points: currentPoints,
                        total_earned: totalEarned,
                        total_spent: totalSpent,
                        transaction_count: userTransactions.length,
                        last_activity: userTransactions.length > 0 ? 
                            userTransactions[userTransactions.length - 1].timestamp.toISOString().split('T')[0] : 
                            user.createdAt.toISOString().split('T')[0],
                        is_active: user.isActive !== false
                    };
                }));
                
                exportData = userStats;
                filename = `sbis_customers_${new Date().toISOString().split('T')[0]}`;
                break;

            case 'analytics':
                // Analytics report - trends and insights
                const analyticsTransactions = await Transaction.find(baseFilter);
                
                // Daily trends
                const dailyStats = {};
                analyticsTransactions.forEach(t => {
                    const date = t.timestamp.toISOString().split('T')[0];
                    if (!dailyStats[date]) {
                        dailyStats[date] = {
                            date,
                            earn_count: 0,
                            spend_count: 0,
                            earn_points: 0,
                            spend_points: 0,
                            unique_users: new Set()
                        };
                    }
                    
                    if (t.type === 'earn') {
                        dailyStats[date].earn_count++;
                        dailyStats[date].earn_points += Math.abs(t.points);
                    } else {
                        dailyStats[date].spend_count++;
                        dailyStats[date].spend_points += Math.abs(t.points);
                    }
                    
                    dailyStats[date].unique_users.add(t.userId.toString());
                });

                exportData = Object.values(dailyStats).map(day => ({
                    ...day,
                    unique_users: day.unique_users.size,
                    net_points: day.earn_points - day.spend_points,
                    total_transactions: day.earn_count + day.spend_count
                }));
                filename = `sbis_analytics_${new Date().toISOString().split('T')[0]}`;
                break;

            default:
                return res.status(400).json({ error: 'Invalid export type' });
        }

        // Generate file based on format
        let fileContent = '';
        let contentType = '';
        let fileExtension = '';

        if (format === 'csv') {
            if (exportData.length === 0) {
                fileContent = 'No data available';
            } else {
                const headers = Object.keys(exportData[0]);
                fileContent = headers.join(',') + '\n';
                fileContent += exportData.map(row => 
                    headers.map(header => {
                        const value = row[header];
                        return typeof value === 'string' && value.includes(',') ? 
                            `"${value}"` : value;
                    }).join(',')
                ).join('\n');
            }
            contentType = 'text/csv';
            fileExtension = 'csv';
        } else if (format === 'json') {
            fileContent = JSON.stringify(exportData, null, 2);
            contentType = 'application/json';
            fileExtension = 'json';
        } else if (format === 'xml') {
            // Simple XML format
            fileContent = '<?xml version="1.0" encoding="UTF-8"?>\n<data>\n';
            exportData.forEach(item => {
                fileContent += '  <item>\n';
                Object.entries(item).forEach(([key, value]) => {
                    fileContent += `    <${key}>${value}</${key}>\n`;
                });
                fileContent += '  </item>\n';
            });
            fileContent += '</data>';
            contentType = 'application/xml';
            fileExtension = 'xml';
        }

        // Set response headers for file download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.${fileExtension}"`);
        res.setHeader('Content-Length', Buffer.byteLength(fileContent, 'utf8'));
        
        res.send(fileContent);

    } catch (error) {
        console.error('Error exporting SBIS data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Routes ---
const adminRoutes = require('./routes/admin');
app.use('/api/admin', requireAuth, requireAdmin, adminRoutes);

// --- Server startup ---
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Loyalty backend server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`MongoDB URI: ${process.env.MONGO_URI ? 'configured' : 'not configured'}`);
}); 