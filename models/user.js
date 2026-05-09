import { pool } from '../config/database.js';
import { hash, compare } from 'bcryptjs';


// Поиск пользователя по email
export const findByEmail = async (email) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.*, al.role_name 
       FROM users u
       LEFT JOIN user_access_levels al ON u.role_id = al.ID
       WHERE u.email = ?`,
      [email]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error in findByEmail:', error);
    throw new Error('Ошибка при поиске пользователя');
  }
}

// Поиск пользователя по ID
export const findById = async (user_id) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.*, al.role_name 
       FROM users u
       LEFT JOIN user_access_levels al ON u.role_id = al.ID
       WHERE u.user_id = ?`,
      [user_id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Error in findById:', error);
    throw new Error('Ошибка при получении данных пользователя');
  }
}

export const getDeviceLimit = async (userId) => {
  const query = `
    SELECT IFNULL(sp.max_device, 1) as device_limit
    FROM users u
    LEFT JOIN user_subscriptions us ON u.user_id = us.user_id AND us.is_active = 1 AND us.end_date > NOW()
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.subscription_plans_id
    WHERE u.user_id = ?;
  `;
  
  const [rows] = await pool.execute(query, [userId]);
  // Если пользователь существует, вернется либо лимит из тарифа, либо 1
  return rows.length > 0 ? rows[0].device_limit : 1; 
}

// Создание нового пользователя
export const create = async (userData) => {
  try {
    const { email, password, username, date_of_birth, country } = userData;
    
    // Проверка на уникальность email
    const existingUser = await findByEmail(email);
    if (existingUser) {
      throw new Error('Пользователь с таким email уже существует');
    }

    // Хешируем пароль
    const password_hash = await hash(password, 12);

    console.log('Creating user with data:', { email, password_hash, username, date_of_birth, country });
    
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
export const updateLastLogin = async (user_id, connection = null) => {
  try {
    const db = connection || pool;
    await db.execute(
      'UPDATE users SET last_login = NOW() WHERE user_id = ?',
      [user_id]
    );
  } catch (error) {
    console.error('Error in updateLastLogin:', error);
    throw new Error('Ошибка при обновлении времени входа');
  }
}

// Проверка пароля
export const comparePassword = async (plainPassword, hashedPassword) => {
  return await compare(plainPassword, hashedPassword);
}

export const deleteAllSessions = async (userId) => {
  await pool.execute('DELETE FROM user_sessions WHERE user_id = ?', [userId]);
}
