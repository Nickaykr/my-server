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