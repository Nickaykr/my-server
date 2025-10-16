const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  // Поиск пользователя по email
  static async findByEmail(email) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error in findByEmail:', error);
      throw new Error('Ошибка при поиске пользователя');
    }
  }

  // Поиск пользователя по ID
  static async findById(user_id) {
    try {
      const [rows] = await pool.execute(
        'SELECT user_id, email, username, avatar_url, date_of_birth, country, created_at, last_login FROM users WHERE user_id = ?',
        [user_id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error('Error in findById:', error);
      throw new Error('Ошибка при получении данных пользователя');
    }
  }

  // Создание нового пользователя
  static async create(userData) {
    try {
      const { email, password, username, date_of_birth, country } = userData;
      
      // Проверка на уникальность email
      const existingUser = await this.findByEmail(email);
      if (existingUser) {
        throw new Error('Пользователь с таким email уже существует');
      }

      // Хешируем пароль
      const password_hash = await bcrypt.hash(password, 12);
      
      const [result] = await pool.execute(
        'INSERT INTO users (email, password_hash, username, date_of_birth, country) VALUES (?, ?, ?, ?, ?)',
        [email, password_hash, username, date_of_birth, country]
      );
      
      return {
        user_id: result.insertId,
        email,
        username,
        date_of_birth,
        country
      };
    } catch (error) {
      console.error('Error in create:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Пользователь с таким email или username уже существует');
      }
      throw error;
    }
  }

  // Обновление времени последнего входа
  static async updateLastLogin(user_id) {
    try {
      await pool.execute(
        'UPDATE users SET last_login = NOW() WHERE user_id = ?',
        [user_id]
      );
    } catch (error) {
      console.error('Error in updateLastLogin:', error);
      throw new Error('Ошибка при обновлении времени входа');
    }
  }

  // Проверка пароля
  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

   // 🔄 ОБНОВЛЕНИЕ REFRESH TOKEN
  static async updateRefreshToken(user_id, refreshToken) {
    try {
      const [result] = await pool.execute(
        'UPDATE users SET refresh_token = ? WHERE user_id = ?',
        [refreshToken, user_id]
      );
      console.log('✅ Refresh token updated for user:', user_id);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Error updating refresh token:', error);
      throw new Error('Ошибка при обновлении токена');
    }
  }

  // 🔍 ПОИСК ПО REFRESH TOKEN
  static async findByRefreshToken(user_id, refreshToken) {
    try {
      const [rows] = await pool.execute(
        'SELECT user_id, email, username, date_of_birth, country, created_at, last_login FROM users WHERE user_id = ? AND refresh_token = ?',
        [user_id, refreshToken]
      );
      console.log('🔍 Refresh token search:', rows[0] ? 'FOUND' : 'NOT FOUND');
      return rows[0] || null;
    } catch (error) {
      console.error('❌ Error in findByRefreshToken:', error);
      throw new Error('Ошибка при проверке токена');
    }
  }

  // 🗑️ ОЧИСТКА REFRESH TOKEN (при выходе)
  static async clearRefreshToken(user_id) {
    try {
      const [result] = await pool.execute(
        'UPDATE users SET refresh_token = NULL WHERE user_id = ?',
        [user_id]
      );
      console.log('✅ Refresh token cleared for user:', user_id);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('❌ Error clearing refresh token:', error);
      throw new Error('Ошибка при очистке токена');
    }
  }
}

module.exports = User;