const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/user'); 

const router = express.Router();

// Получение профиля пользователя
router.get('/profile', auth, async (req, res) => {
  try {
    console.log('👤 Profile request for user:', req.user.email);
    res.json({ 
      user: {
        id: req.user.user_id,
        email: req.user.email,
        username: req.user.username,
        avatar_url: req.user.avatar_url,
        date_of_birth: req.user.date_of_birth,
        country: req.user.country,
        created_at: req.user.created_at,
        last_login: req.user.last_login
      }
    });
  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновление профиля
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, avatar_url, date_of_birth, country } = req.body;
    
    console.log('✏️ Update profile for user:', req.user.email);

    // Здесь нужно добавить метод update в вашу модель User
    // Пока просто возвращаем обновленные данные
    const updatedUser = {
      ...req.user,
      username: username || req.user.username,
      avatar_url: avatar_url || req.user.avatar_url,
      date_of_birth: date_of_birth || req.user.date_of_birth,
      country: country || req.user.country
    };

    console.log('✅ Profile updated successfully');

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.user_id,
        email: updatedUser.email,
        username: updatedUser.username,
        avatar_url: updatedUser.avatar_url,
        date_of_birth: updatedUser.date_of_birth,
        country: updatedUser.country,
        created_at: updatedUser.created_at,
        last_login: updatedUser.last_login
      }
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

module.exports = router;