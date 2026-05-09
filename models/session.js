import { pool } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export const getCountByUserId = async (userId) => {
    const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM user_sessions WHERE user_id = ?',
        [userId]
    );
    return rows[0].count;
}

export const findByDeviceId = async (userId, deviceId) => {
    const [rows] = await pool.execute(
        'SELECT * FROM user_sessions WHERE user_id = ? AND device_id = ?',
        [userId, deviceId]
    );
    return rows.length > 0 ? rows[0] : null;
}

export const upsertSession = async (userId, clientSessionId, refreshToken, deviceName, connection)=> {
    const db = connection || pool;
    // Если клиент прислал ID — используем его, если нет — создаем новый "паспорт"
    const finalSessionId = clientSessionId || uuidv4();
    try {
        const query = `
            INSERT INTO user_sessions (user_id, device_id, refresh_token, device_name)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                refresh_token = VALUES(refresh_token), 
                last_login = NOW()
        `;
        await db.execute(query, [userId, finalSessionId, refreshToken, deviceName]);
        
        return finalSessionId;
    } catch (error) {
        console.error('Error in upsertSession:', error);
        throw error;
    }
}

// Поиск сессии по токену
export const findByToken = async (token) => {
    const [rows] = await pool.execute(
        'SELECT * FROM user_sessions WHERE refresh_token = ?',
        [token]
    );
    return rows[0] || null;
}

// Обновление токена для конкретной сессии
export const updateToken = async (sessionId, newToken) => {
    await pool.execute(
        'UPDATE user_sessions SET refresh_token = ?, last_login = NOW() WHERE sessions_id = ?',
        [newToken, sessionId]
    );
}

export const deleteSession = async (token) => {
    try {
        // Удаляем запись, где совпадает refresh_token
        const [result] = await pool.execute(
        'DELETE FROM user_sessions WHERE refresh_token = ?',
        [token]
        );
        return result.affectedRows > 0;
    } catch (error) {
        console.error('Error in deleteSession:', error);
        throw error;
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
