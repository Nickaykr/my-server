const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const router = express.Router();

// ДИАГНОСТИКА - проверяем что модель загружена
console.log('🔍 Checking User model...');
console.log('👤 User model:', User);
console.log('👤 User.findByEmail:', typeof User.findByEmail);

// Генерация токенов
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId }, 
    process.env.JWT_ACCESS_SECRET, 
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, date_of_birth, country } = req.body;

    console.log('📝 Registration attempt for:', email);

    // Создаем пользователя через вашу модель
    const user = await User.create({
      email,
      password,
      username,
      date_of_birth,
      country
    });

    console.log('✅ User created with ID:', user.user_id);

    // Генерируем оба токена
    const { accessToken, refreshToken } = generateTokens(user.user_id);
    
    // Сохраняем refresh token в базе
    await User.updateRefreshToken(user.user_id, refreshToken);
    await User.updateLastLogin(user.user_id);

    res.status(201).json({
      message: 'User registered successfully',
      accessToken, // ← ИСПРАВЛЕНО: было token, теперь accessToken
      refreshToken, // ← ДОБАВЛЕНО
      user: {
        id: user.user_id,
        email: user.email,
        username: user.username,
        date_of_birth: user.date_of_birth,
        country: user.country
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: error.message || 'Server error during registration' });
  }
});

// Логин
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login attempt for:', email);

    // Ищем пользователя через вашу модель
    const user = await User.findByEmail(email);
    console.log('👤 User found:', !!user);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Проверяем пароль через вашу модель
    const isPasswordValid = await User.comparePassword(password, user.password_hash);
    console.log('🔑 Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Генерируем оба токена
    const { accessToken, refreshToken } = generateTokens(user.user_id);
    
    // Сохраняем refresh token в базе
    await User.updateRefreshToken(user.user_id, refreshToken);
    await User.updateLastLogin(user.user_id);

    console.log('✅ Login successful for:', user.email);

    res.json({
      message: 'Login successful',
      accessToken, // ← ИСПРАВЛЕНО: было token, теперь accessToken
      refreshToken, // ← ДОБАВЛЕНО
      user: {
        id: user.user_id,
        email: user.email,
        username: user.username,
        date_of_birth: user.date_of_birth,
        country: user.country,
        created_at: user.created_at,
        last_login: user.last_login
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: error.message || 'Server error during login' });
  }
}); // ← ДОБАВЛЕНА закрывающая скобка для login

// 🔄 ОБНОВЛЕНИЕ ACCESS TOKEN
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    console.log('🔄 Refresh token attempt');

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Проверяем refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Проверяем что refresh token есть в базе
    const user = await User.findByRefreshToken(decoded.userId, refreshToken);
    if (!user) {
      console.log('❌ Refresh token not found in database');
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Генерируем новые токены
    const tokens = generateTokens(user.user_id);
    
    // Обновляем refresh token в базе
    await User.updateRefreshToken(user.user_id, tokens.refreshToken);

    console.log('✅ Token refreshed for user:', user.email);

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.user_id,
        email: user.email,
        username: user.username,
        date_of_birth: user.date_of_birth,
        country: user.country
      }
    });

  } catch (error) {
    console.error('❌ Refresh token error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    res.status(500).json({ error: 'Server error during token refresh' });
  }
});

// 🚪 ВЫХОД
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        await User.clearRefreshToken(decoded.userId);
      } catch (error) {
        console.log('Token already invalid during logout');
      }
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ error: 'Server error during logout' });
  }
});

module.exports = router;