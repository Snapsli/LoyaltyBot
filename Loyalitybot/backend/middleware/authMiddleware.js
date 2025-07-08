const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  const sessionToken = req.headers['x-session-token'];
  console.log(`[AUTH] Attempting auth for ${req.path}, Token: ${sessionToken ? 'Present' : 'Missing'}`);
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'Authentication required (session token missing)' });
  }

  try {
    const user = await User.findOne({ sessionToken: sessionToken });

    if (!user) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Your account is blocked by administrator.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Request is not authorized' });
  }
};

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора.' });
    }
};

module.exports = { requireAuth, requireAdmin };