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
        u.user_id, u.email, u.username, u.avatar_url, al.role_name,
        u.date_of_birth, u.country, u.created_at, u.last_login,
        us.end_date as sub_end_date,
        us.is_active as sub_is_active, us.plan_id as subscription_plans_id,
        sp.name as plan_name
      FROM users u
      LEFT JOIN user_access_levels al ON u.role_id = al.ID
      LEFT JOIN user_subscriptions us ON u.user_id = us.user_id AND us.is_active = 1 AND us.end_date > CURRENT_TIMESTAMP
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.subscription_plans_id
      WHERE u.user_id = ?
      ORDER BY us.end_date DESC
      LIMIT 1
    `, [req.user.user_id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const countQuery = `
      SELECT status_id, COUNT(*) as count 
      FROM user_media_lists 
      WHERE user_id = ? 
      GROUP BY status_id
    `;
    const [counts] = await pool.execute(countQuery, [req.user.user_id]);

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
        role: userData.role_name,

        //поля подписки
        subscription: {
          subscription_plans_id: userData.subscription_plans_id,
          plan: userData.plan_name || 'Free',
          endDate: userData.sub_end_date,
          isActive: Boolean(userData.sub_is_active && new Date(userData.sub_end_date) > new Date())
        },
        lists_counts: counts
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

// Получение списков текущего пользователя по конкретному статусу
router.get('/lists', auth, async (req, res) => {
  try {
    const userId = req.user.user_id; // Извлекаем ID авторизованного пользователя из auth middleware
    const { statusId } = req.query;  // Получаем id статуса из параметров строки 

    if (!statusId) {
      return res.status(400).json({ error: 'Параметр statusId обязателен для фильтрации' });
    }

    const query = `
     SELECT 
        ml.media_lists_id,
        ml.season_id,
        ml.status_id,
        ml.updated_at,
        s.title AS season_name,
        m.title AS media_title,
        s.poster_url,
        r.rating AS user_rating
      FROM user_media_lists ml
      LEFT JOIN seasons s ON ml.season_id = s.season_id
      LEFT JOIN media m ON s.media_id = m.media_id
      LEFT JOIN ratings r ON r.season_id = ml.season_id AND r.user_id = ml.user_id
      WHERE ml.user_id = ? AND ml.status_id = ?
      ORDER BY ml.updated_at DESC
    `;

    // Выполняем запрос к базе данных MySQL
    const [rows] = await pool.execute(query, [userId, statusId]);

    // Возвращаем результат фронтенду
    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('❌ Ошибка получения списков пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера: ' + error.message });
  }
});

export default router;