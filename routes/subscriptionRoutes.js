import { Router } from 'express';
const router = Router();
import { pool } from '../config/database.js';
import  { auth } from '../middleware/auth.js';

router.get('/plans', async (req, res) => {
  try {
    const [plans] = await pool.query(
      'SELECT * FROM subscription_plans ORDER BY price ASC'
    );
    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении планов' });
  }
});

// POST /api/subscriptions/subscribe
router.post('/subscribe', auth, async (req, res) => {
    const { subscription_plans_id }  = req.body;
    const userId = req.user.user_id;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction(); // Начинаем транзакцию для обеспечения атомарности
      // Рассчитываем дату окончания
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      //Деактивируем всё старое
      await connection.query(
          'UPDATE user_subscriptions SET is_active = 0 WHERE user_id = ?', 
          [userId]
      );

      // Создаем новую запись
      await connection.query(
          'INSERT INTO user_subscriptions (user_id, plan_id, end_date, is_active) VALUES (?, ?, ?, 1)',
          [userId, subscription_plans_id, endDate]
      );

      await connection.commit(); // Фиксируем транзакцию

      res.json({ success: true, message: 'Подписка успешно активирована' });
    } catch (error) {
      await connection.rollback(); // Откатываем транзакцию в случае ошибки
      console.error('Sub error:', error);
      
      res.status(500).json({ error: 'Ошибка при оформлении' });
    } finally {
      connection.release(); // Возвращаем соединение в пул
    }
});

export default router;