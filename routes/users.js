import { Router } from 'express';
import  { auth } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = Router();

// Получение профиля пользователя
router.get('/profile', auth, async (req, res) => {
  try {
    // Делаем запрос к БД, чтобы получить свежие данные и информацию о подписке
    const [rows] = await pool.query(`
      SELECT 
        u.user_id, u.email, u.username, u.avatar_url, 
        u.date_of_birth, u.country, u.created_at, u.last_login,
        us.end_date as sub_end_date,
        us.is_active as sub_is_active, us.plan_id as subscription_plans_id,
        sp.name as plan_name
      FROM users u
      LEFT JOIN user_subscriptions us ON u.user_id = us.user_id AND us.is_active = 1 AND us.end_date > CURRENT_TIMESTAMP
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.subscription_plans_id
      WHERE u.user_id = ?
      ORDER BY us.end_date DESC
      LIMIT 1
    `, [req.user.user_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = rows[0];

    res.json({ 
      user: {
        id: userData.user_id,
        email: userData.email,
        username: userData.username,
        avatar_url: userData.avatar_url,
        date_of_birth: userData.date_of_birth,
        country: userData.country,
        created_at: userData.created_at,
        last_login: userData.last_login,
        //поля подписки
        subscription: {
          subscription_plans_id: userData.subscription_plans_id,
          plan: userData.plan_name || 'Free',
          endDate: userData.sub_end_date,
          isActive: Boolean(userData.sub_is_active && new Date(userData.sub_end_date) > new Date())
        }
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

    const updatedUser = {
      ...req.user,
      username: username || req.user.username,
      avatar_url: avatar_url || req.user.avatar_url,
      date_of_birth: date_of_birth || req.user.date_of_birth,
      country: country || req.user.country
    };

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

export default router;