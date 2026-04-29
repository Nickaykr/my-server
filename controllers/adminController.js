import { pool } from '../config/database.js'; 

export const getAllMediaAdmin = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.media_id, m.title, m.type, m.original_title, m.is_animation,
             COUNT(s.season_id) as total_seasons
      FROM media m
      LEFT JOIN seasons s ON m.media_id = s.media_id
      GROUP BY m.media_id
      ORDER BY m.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Ошибка при получении списка медиа" });
  }
};

export const updateSeasonDetails = async (req, res) => {
  const { id } = req.params; // Это season_id
  const { 
    main_title, 
    original_title, 
    description, 
    release_year, 
    age_rating, 
    duration,
    episode_count,
    genres, 
    people,
    media_id 
  } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Обновляем таблицу MEDIA (название и оригинал)
    await connection.query(
      `UPDATE media SET title = ?, original_title = ? WHERE media_id = ?`,
      [main_title, original_title, media_id]
    );

    //Обновляем таблицу SEASONS 
    await connection.query(
      `UPDATE seasons SET 
        description = ?, 
        release_year = ?, 
        age_rating = ?, 
        duration = ?, 
        episode_count = ? 
      WHERE season_id = ?`,
      [description, release_year, age_rating, duration, episode_count, id]
    );

    // Обновляем ЖАНРЫ (схема: удалить старые -> вставить новые)
    await connection.query(`DELETE FROM media_genres WHERE media_id = ?`, [media_id]);
    if (genres && genres.length > 0) {
      const genreValues = genres.map(genreId => [media_id, genreId]);
      await connection.query(
        `INSERT INTO media_genres (media_id, genre_id) VALUES ?`, 
        [genreValues]
      );
    }

    // Обновляем КОМАНДУ (Люди)
    await connection.query(`DELETE FROM media_people WHERE season_id = ?`, [id]);
    if (people && people.length > 0) {
      const peopleValues = people.map(p => [id, p.person_id, p.role_id, p.character_name || null]);
      await connection.query(
        `INSERT INTO media_people (season_id, person_id, role_id, character_name) VALUES ?`,
        [peopleValues]
      );
    }

    await connection.commit();
    res.json({ message: "Данные успешно обновлены" });

  } catch (error) {
    await connection.rollback();
    console.error("Ошибка обновления сезона:", error);
    res.status(500).json({ error: "Ошибка при сохранении данных" });
  } finally {
    connection.release();
  }
};

export const getAllGenres = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT genre_id, name FROM genres ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Не удалось загрузить жанры" });
  }
};

export const getAllPeople = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT person_id, full_name, photo_url FROM people ORDER BY full_name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Не удалось загрузить людей" });
  }
};

export const getAllRoles = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT role_id, name FROM role ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Не удалось загрузить роли" });
  }
};

export const getAllUsers = async (req, res) => {
    try {
        const [rows] = await pool.query(`
           SELECT 
                u.user_id, 
                u.username, 
                u.email, 
                u.avatar_url, 
                u.is_admin,
                s.name AS sub_name,
                us.end_date AS sub_endDate,
                -- Проверяем активность: дата окончания больше текущей
                (us.end_date > NOW()) AS sub_isActive 
            FROM users u
            LEFT JOIN (
                -- Находим ID последней подписки для каждого юзера
                SELECT user_id, MAX(user_subscriptions_id) as last_sub_id
                FROM user_subscriptions
                GROUP BY user_id
            ) last_sub ON u.user_id = last_sub.user_id
            LEFT JOIN user_subscriptions us ON last_sub.last_sub_id = us.user_subscriptions_id
            LEFT JOIN subscription_plans s ON us.plan_id = s.subscription_plans_id;
        `);

        const users = rows.map(row => ({
            user_id: row.user_id,
            username: row.username,
            email: row.email,
            avatar_url: row.avatar_url,
            is_admin: !!row.is_admin,
            subscription: row.sub_name ? {
                name: row.sub_name,
                endDate: row.sub_endDate,
                isActive: Boolean(row.sub_isActive)
            } : null
        }));
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Ошибка при получении юзеров" });
    }
};

// Лишить пользователя подписки
export const removeUserSubscription = async (req, res) => {
    const { id } = req.params; // ID пользователя

    try {
        // Удаляем запись из таблицы связей
        await pool.query('DELETE FROM user_subscriptions WHERE user_id = ?', [id]);
        
        res.json({ message: "Подписка аннулирована" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Ошибка при удалении подписки" });
    }
};

export const createAdminSubscription = async (req, res) => {
    const { subscription_plans_id } = req.body;
    const targetUserId = req.params.id; 
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        //Проверяем, есть ли уже активная подписка у ЭТОГО юзера
        const [activeSubs] = await connection.query(
            'SELECT end_date FROM user_subscriptions WHERE user_id = ? AND is_active = 1 AND end_date > NOW()',
            [targetUserId]
        );

        let startDate = new Date();
        if (activeSubs.length > 0) {
            startDate = new Date(activeSubs[0].end_date);
        }

        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);

        //Сбрасываем старые статусы
        await connection.query(
            'UPDATE user_subscriptions SET is_active = 0 WHERE user_id = ?', 
            [targetUserId]
        );

        // Вставляем новую подписку
        await connection.query(
            'INSERT INTO user_subscriptions (user_id, plan_id, start_date, end_date, is_active) VALUES (?, ?, ?, ?, 1)',
            [targetUserId, subscription_plans_id, startDate, endDate]
        );

        await connection.commit();
        res.json({ success: true, message: 'Подписка выдана администратором' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: 'Ошибка сервера' });
    } finally {
        connection.release();
    }
};