import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { findById } from '../models/user.js';

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Доступ запрещен. Токен отсутствует.' });
    }

    //верифицируем токен
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    if (!decoded.userId) {
       console.error('❌ В токене отсутствует userId:', decoded);
       return res.status(401).json({ error: 'Невалидный токен: отсутствует ID пользователя' });
    }

    const user = await findById(decoded.userId); 
    
    if (!user) {
      return res.status(401).json({ error: 'Пользователь не найден.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Срок действия токена истек.' });
    }
    res.status(401).json({ error: 'Ошибка авторизации' });
  }
};
