import 'dotenv/config';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { create, updateLastLogin, findByEmail, comparePassword, getDeviceLimit, findById } from '../models/user.js';
import { upsertSession, getCountByUserId, findByDeviceId, findByToken, updateToken, deleteSession } from '../models/session.js';
import { pool } from '../config/database.js'; 

const router = Router();

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
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { email, password, username, date_of_birth, country, device_id, device_name } = req.body;

    // Создаем пользователя через модель
    const user = await create({
      email,
      password,
      username,
      date_of_birth,
      country
    }, connection);

    // Генерируем токен
    const { accessToken, refreshToken } = generateTokens(user);
    
    // Сохраняем refresh token в базе
    await upsertSession(
        user.user_id, 
        device_id, 
        refreshToken, 
        device_name || 'Unknown Device', 
        connection                     
    );
    await updateLastLogin(user.user_id, connection);

    await connection.commit();

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
    await connection.rollback();
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: error.message || 'Server error during registration' });
  } finally {
    connection.release();
  }
});

// Логин
router.post('/login', async (req, res) => {
  try {
    const { email, password, device_id, device_name } = req.body;

    if (!device_id) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Ищем пользователя 
    const user = await findByEmail(email);
  
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }


    // Проверяем пароль 
    const isPasswordValid = await comparePassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Проверяем, сколько устройств уже залогинено
    const activeSessions = await getCountByUserId(user.user_id);
    console.log(`device_id`);
    const currentDeviceSession = await findByDeviceId(user.user_id, device_id);

    const deviceLimit = await getDeviceLimit(user.user_id);

    // Если лимит 1 (бесплатный)
    const isFreeTier = deviceLimit === 1;

    if (!currentDeviceSession && activeSessions >= deviceLimit) {
      return res.status(403).json({ 
        error: 'Limit reached', 
        message: isFreeTier 
          ? "На этом аккаунте нету активной подписки, обновите или приобретите подписку" 
          : `Вы достигли лимита устройств для вашего тарифа (${deviceLimit}).` 
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    
    await upsertSession(user.user_id, device_id, refreshToken, device_name);
    await updateLastLogin(user.user_id);

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
    // Проверяем валидность JWT
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const session = await findByToken(refreshToken);
    
    if (!session || session.user_id !== decoded.userId) {
      console.log('❌ Refresh token not found in sessions or user mismatch');
      return res.status(403).json({ error: 'Session expired or invalid' });
    }

    //Получаем данные пользователя для генерации новых токенов
    const user = await findById(session.user_id);
    if (!user) return res.status(403).send();

    // Генерируем новую пару
    const tokens = generateTokens(user);
    
    // ОБНОВЛЯЕМ ТОКЕН ТОЛЬКО ДЛЯ ЭТОЙ СЕССИИ
    // Мы передаем session.id или (user_id + device_id), чтобы обновить конкретную строку
    await updateToken(session.sessions_id, tokens.refreshToken);

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (e) {
    console.error('Refresh error:', e);
    if (refreshToken) {
        await deleteSession(refreshToken); 
        console.log("🗑️ Невалидная сессия удалена из БД");
    }
    res.status(403).send();
  }
});

//ВЫХОД
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    await deleteSession(refreshToken);

    console.log('✅ Session cleared successfully');
    res.json({ message: 'Logout successful' });

  } catch (error) {
    console.error('❌ Logout error:', error);
    // Даже если произошла ошибка, для клиента выход считается успешным
    res.status(500).json({ error: 'Server error during logout' });
}});

export default router;