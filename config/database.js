import 'dotenv/config';
import { createPool } from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'test_database',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Создаем пул соединений
const pool = createPool(dbConfig);

// Функция для проверки подключения
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Успешно подключились к MySQL базе данных');
   
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к MySQL:', error.message);
    return false;
  }
}

// Экспортируем пул и функцию для тестирования
export {
  pool,
  testConnection
};