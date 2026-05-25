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

        // Получаем тип сортировки, по умолчанию ставим 'new'
        const sortBy = req.query.sortBy || 'new';

        const currentUserId = req.query.userId ? Number(req.query.userId) : 0;

        // Определяем строку сортировки для SQL
        let orderByClause = 'ORDER BY c.created_at DESC'; // По умолчанию (самые свежие)
        
        if (sortBy === 'old') {
            orderByClause = 'ORDER BY c.created_at ASC';
        } else if (sortBy === 'rating') {
            // Сортируем по оценке. Оценки NULL (если юзер не ставил рейтинг) улетают в самый низ
            orderByClause = 'ORDER BY r.rating DESC, c.created_at DESC';
        }
        console.log('Current User ID:', currentUserId);
        console.log('Sort By:', sortBy);
        const query = ` 
                SELECT 
                    u.username, 
                    u.avatar_url, 
                    c.text, 
                    c.is_spoiler, 
                    c.comment_id, 
                    c.user_id, 
                    c.created_at,
                    r.rating,
                    -- Считаем лайки (is_like = 1) для каждого комментария
                    (SELECT COUNT(*) FROM comment_reactions WHERE comment_id = c.comment_id AND is_like = 1) AS likes_count,
                    -- Считаем дизлайки (is_like = 0) для каждого комментария
                    (SELECT COUNT(*) FROM comment_reactions WHERE comment_id = c.comment_id AND is_like = 0) AS dislikes_count,
                    -- Узнаем реакцию залогиненного пользователя (1, 0 или NULL)
                    (SELECT is_like FROM comment_reactions WHERE comment_id = c.comment_id AND user_id = ?) AS my_reaction
                FROM comments c
                JOIN seasons s ON s.season_id = c.season_id
                JOIN users u ON c.user_id = u.user_id
                LEFT JOIN ratings r ON (u.user_id = r.user_id AND r.season_id = s.season_id)
                WHERE s.season_id = ? 
                ${orderByClause}; -- Свежие комментарии будут сверху
            `;

        const params = [currentUserId, id];

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

export async function addReaction(req, res) {
    // commentId — какой коммент оценивают, isLike — 1 (лайк) или 0 (дизлайк)
    const { commentId, isLike } = req.body; 
    
    // Извлекаем id пользователя, который совершает действие (из твоего middleware авторизации)
    const userId = req.user?.id || req.user?.user_id; 

    // Базовая валидация входящих данных
    if (!commentId || isLike === undefined) {
        return res.status(400).json({ success: false, message: 'Не переданы commentId или isLike' });
    }

    try {
        //Проверяем, существует ли уже какая-то реакция от этого юзера на этот комментарий
        const [existing] = await pool.execute(
        'SELECT * FROM comment_reactions WHERE user_id = ? AND comment_id = ?',
        [userId, commentId]
        );

        if (existing.length > 0) {
            const currentReaction = existing[0];
            
            // Сценарий А: Юзер нажал на ту же самую кнопку -> Отменяем реакцию (удаляем из БД)
            if (currentReaction.is_like === Number(isLike)) {
                await pool.execute(
                'DELETE FROM comment_reactions WHERE comment_reactions_id = ?',
                [currentReaction.comment_reactions_id]
                );
                return res.json({ success: true, action: 'removed', message: 'Реакция удалена' });
            } 
        
            // Сценарий Б: Юзер изменил мнение (передумал с лайка на дизлайк или наоборот) -> Обновляем
            else {
                await pool.execute(
                'UPDATE comment_reactions SET is_like = ? WHERE comment_reactions_id = ?',
                [isLike, currentReaction.comment_reactions_id]
                );
                return res.json({ success: true, action: 'updated', message: 'Реакция обновлена' });
            }
        }

        // Сценарий В: Реакции не было вообще -> Создаем новую запись (INSERT)
        await pool.execute(
        'INSERT INTO comment_reactions (user_id, comment_id, is_like) VALUES (?, ?, ?)',
        [userId, commentId, isLike]
        );
        
        return res.json({ success: true, action: 'created', message: 'Реакция успешно добавлена' });

    } catch (error) {
        console.error('❌ Ошибка в addReaction:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

export async function createCommentReport(req, res) {
  const { commentId, ruleId, isMedia } = req.body;
  const targetType = isMedia ? 'media' : 'comment';
  // Достаем id залогиненного пользователя, который отправляет жалобу
  const userId = req.user?.id || req.user?.user_id;

  // Валидация входных данных
  if (!commentId || !ruleId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Необходимы commentId и ruleId для отправки жалобы' 
    });
  }

  try {
    // Проверяем, не кидал ли ЭТОТ пользователь уже жалобу на ЭТОТ ЖЕ комментарий
    // Чтобы избежать накрутки и спама жалобами
    const [existing] = await pool.execute(
        `SELECT * FROM reports WHERE user_id = ? AND target_type = ? AND target_id = ?`,
        [userId, targetType, commentId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Вы уже отправили жалобу на этот комментарий. Она находится на рассмотрении.' 
      });
    }

    // Делаем INSERT в таблицу reports 
    // По умолчанию статус ставим 'pending'
    await pool.execute(
      `INSERT INTO reports (user_id, target_type, target_id, rule_id, status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [userId, targetType, commentId, ruleId]
    );

    return res.json({ 
      success: true, 
      message: 'Жалоба успешно отправлена модераторам.' 
    });

  } catch (error) {
    console.error('❌ Ошибка в createCommentReport:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}