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

router.post('/subscribe', auth, async (req, res) => {
    const { subscription_plans_id, promoCode }  = req.body;
    console.log('Полученные данные для подписки:', { subscription_plans_id, promoCode });
    const userId = req.user.user_id;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction(); // Начинаем транзакцию для обеспечения атомарности

      const [plan] = await connection.query(
        'SELECT price FROM subscription_plans WHERE subscription_plans_id = ?',
        [subscription_plans_id]
      )
      
      if (plan.length === 0) {
        throw new Error('План не найден');
      }

        let finalPrice = plan[0].price; // Цена "с витрины"
        let appliedPromoId = null;

        // Если передан промокод, проверяем его
        if (promoCode && promoCode.trim() !== ' ') {
            const [promo] = await connection.query(
                `SELECT 
                    promo_id, discount_percent, max_uses, current_uses
                    FROM promo_codes 
                    WHERE code = ? AND is_active = 1 AND expiration_date > NOW()`,
                [promoCode]
            );

            if (promo.length > 0) {
                appliedPromoId = promo[0].promo_id;
                // Считаем цену со скидкой
                finalPrice = finalPrice * (1 - promo[0].discount_percent / 100);
            }

            const promoData = promo[0];

            // ПРОВЕРКА: Не закончились ли активации?
            if (promoData.current_uses >= promoData.max_uses) {
                return res.status(400).json({ error: 'Данный промокод уже исчерпал лимит активаций' });
            }

            appliedPromoId = promoData.promo_id;
            // Считаем цену со скидкой
            finalPrice = finalPrice * (1 - promoData.discount_percent / 100);

            // ОБНОВЛЕНИЕ: Увеличиваем счетчик использований промокода на 1
            await connection.query(
                'UPDATE promo_codes SET current_uses = current_uses + 1 WHERE promo_id = ?',
                [appliedPromoId]
            );
        };

      // Ищем текущую активную подписку
      const [activeSubs] = await connection.query(
          'SELECT end_date FROM user_subscriptions WHERE user_id = ? AND is_active = 1 AND end_date > NOW()',
          [userId]
      );

      let startDate = new Date();
      // Если подписка есть, новая начнется сразу после старой
      if (activeSubs.length > 0) {
          startDate = new Date(activeSubs[0].end_date);
      }
      // Рассчитываем дату окончания
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      //Деактивируем всё старое
      await connection.query(
          'UPDATE user_subscriptions SET is_active = 0 WHERE user_id = ?', 
          [userId]
      );

      // Создаем новую запись
      await connection.query(
          `INSERT INTO user_subscriptions 
            (user_id, plan_id, amount, promo_code_id, start_date, end_date, is_active) 
            VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [userId, subscription_plans_id, finalPrice, appliedPromoId, startDate, endDate]
      );

      await connection.commit(); // Фиксируем транзакцию

      res.json({ 
        success: true, 
        message: 'Подписка оформлена', 
        price: finalPrice // Возвращаем финальную цену фронтенду для красоты
      });
    } catch (error) {
      await connection.rollback(); // Откатываем транзакцию в случае ошибки
      console.error('Sub error:', error);
      
      res.status(500).json({ error: 'Ошибка при оформлении' });
    } finally {
      connection.release(); // Возвращаем соединение в пул
    }
});

router.post('/validate', async (req, res) => {
    const { code } = req.body;
    console.log('Проверка промокода:', code);
    
    try {
        const [promo] = await pool.query(
            `SELECT * FROM promo_codes 
             WHERE code = ? AND is_active = 1 
             AND (expiration_date > NOW() OR expiration_date IS NULL)
             AND current_uses < max_uses`, 
            [code]
        );

        if (promo.length === 0) {
            return res.status(404).json({ error: 'Промокод недействителен или истек' });
        }

        res.json({ 
            success: true, 
            percent: promo[0].discount_percent 
        });
    } catch (e) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

export default router;