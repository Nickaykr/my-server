const jwt = require('jsonwebtoken');
const User = require('../models/user');

const auth = async (req, res, next) => {
  try {
    // Получаем токен из заголовка
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ищем пользователя в базе через вашу модель
    const user = await User.findById(decoded.userId); // decoded.userId содержит user_id
    
    if (!user) {
      return res.status(401).json({ error: 'Token is not valid.' });
    }

    // Добавляем пользователя в запрос
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { auth };