const express = require('express');
const router = express.Router();

// Простые тестовые маршруты без подключения к БД
router.get('/test', (req, res) => {
  res.json({ 
    message: 'API работает! Сервер подключен успешно!',
    timestamp: new Date().toISOString()
  });
});

router.get('/users', (req, res) => {
  // Заглушка вместо реального запроса к БД
  res.json([
    { id: 1, name: 'Тестовый пользователь 1', email: 'test1@example.com' },
    { id: 2, name: 'Тестовый пользователь 2', email: 'test2@example.com' }
  ]);
});

router.post('/users', (req, res) => {
  // Заглушка для создания пользователя
  const { name, email } = req.body;
  res.json({
    message: 'Пользователь создан (заглушка)',
    user: { id: 999, name, email },
    status: 'success'
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    server: 'running',
    database: 'not connected (test mode)'
  });
});

module.exports = router;