const jwt = require('jsonwebtoken');
const User = require('../models/user');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    console.log('🔐 Verifying token (refresh):', token.substring(0, 20) + '...');
    
    // Проверяем токен с ЕДИНЫМ секретом
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded:', decoded);

    // Проверяем что токен есть в базе
    const user = await User.findByRefreshToken(decoded.userId, token);
    
    if (!user) {
      console.error('❌ Token not found in database for user:', decoded.userId);
      return res.status(401).json({ error: 'Token is not valid.' });
    }

    console.log('✅ User authenticated:', user.email);
    
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      if (error.message.includes('secret')) {
        console.error('❌ JWT_ACCESS_SECRET is not set properly!');
        return res.status(500).json({ error: 'Server configuration error - JWT secret missing' });
      }
      return res.status(401).json({ error: 'Invalid token.' });
    }
    
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

module.exports = { auth };