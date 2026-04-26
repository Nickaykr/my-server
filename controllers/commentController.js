import { pool } from '../config/database.js';

export async function addComment(req, res) {
    try {
        const { season_id, user_id, text, is_spoiler } = req.body;

        if (!text || text.trim() === '') {
            return res.status(400).json({ success: false, message: 'Комментарий не может быть пустым' });
        }

        const [result] = await pool.query(
            `INSERT INTO comments (season_id, user_id, text, is_spoiler) VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    text = VALUES(text), 
                    is_spoiler = VALUES(is_spoiler),
                    created_at = CURRENT_TIMESTAMP`,
            [season_id, user_id, text, is_spoiler]
        );

        // Получаем созданный комментарий вместе с именем пользователя для мгновенного отображения
        const [newComment] = await pool.query(`
            SELECT c.*, u.username 
            FROM comments c 
            JOIN users u ON c.user_id = u.user_id
            WHERE c.comment_id = ?`, 
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            comment: newComment[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
}

export async function getMediaComments(req, res) {
    try {
        const { id } = req.params;
        
        let query =` 
            SELECT 
                u.username, avatar_url, c.text, c.is_spoiler, r.rating,
                c.comment_id, u.user_id
            FROM comments c
            JOIN seasons s ON s.season_id = c.season_id
            JOIN users u ON c.user_id = u.user_id
            LEFT JOIN ratings r ON (u.user_id = r.user_id AND r.season_id = s.season_id)
            WHERE s.season_id = ? `;

        const params = [id];

        const [comments] = await pool.query(query, params);
        
        res.json({
            success: true,
            data: comments,
            pagination: {
                total: comments.length
            }
        });

    } catch (error) {
        console.error('Query error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}