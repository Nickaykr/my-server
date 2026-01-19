require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const router = express.Router();

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.user_id }, 
    process.env.JWT_ACCESS_SECRET, 
    { expiresIn: '15m' } 
  );
  const refreshToken = jwt.sign(
    { userId: user.user_id }, 
    process.env.JWT_REFRESH_SECRET, 
    { expiresIn: '30d' } 
  );
  return { accessToken, refreshToken };
};

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { email, password, username, date_of_birth, country } = req.body;

    // Создаем пользователя через модель
    const user = await User.create({
      email,
      password,
      username,
      date_of_birth,
      country
    });

    // Генерируем токен
    const { accessToken, refreshToken } = generateTokens(user);
    
    // Сохраняем refresh token в базе
    await User.updateRefreshToken(user.user_id, refreshToken);
    await User.updateLastLogin(user.user_id);

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,    
      refreshToken,
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

    // Ищем пользователя 
    const user = await User.findByEmail(email);
  
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Проверяем пароль 
    const isPasswordValid = await User.comparePassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    
    await User.updateRefreshToken(user.user_id, refreshToken);
    await User.updateLastLogin(user.user_id);

    console.log('✅ Login successful for:', user.email);

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.user_id,
        email: user.email,
        username: user.username,
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: error.message || 'Server error during login' });
  }
}); 

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).send();

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.refresh_token !== refreshToken) {
      console.log('❌ Refresh token mismatch or user not found');
      return res.status(403).json({ error: 'Session expired or invalid' });
    }

    // Генерируем новую пару
    const tokens = generateTokens(user);
    
    await User.updateRefreshToken(user.user_id, tokens.refreshToken);

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (e) {
    res.status(403).send();
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