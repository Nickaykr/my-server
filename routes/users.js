const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/user');

const router = express.Router();

// Получение профиля пользователя
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновление профиля
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, avatar_url, date_of_birth, country } = req.body;
    
    // Здесь можно добавить логику обновления пользователя в БД
    res.json({ 
      message: 'Profile updated successfully',
      user: { 
        ...req.user, 
        username: username || req.user.username,
        avatar_url: avatar_url || req.user.avatar_url,
        date_of_birth: date_of_birth || req.user.date_of_birth,
        country: country || req.user.country
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;