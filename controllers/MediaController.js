const { pool } = require('../config/database');

const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;

    //Основная информация 
    const [mediaRows] = await pool.query(`
      SELECT m.*, st.name as studio_name, src.name as source_name, sl.name AS status_name
      FROM media m
      LEFT JOIN studios st ON m.studio_id = st.studio_id
      LEFT JOIN sources src ON m.source_id = src.source_id
      LEFT JOIN seasons s ON m.media_id = s.media_id
      LEFT JOIN status_lookup sl ON s.status_id = sl.id 
      WHERE m.media_id = ?
    `, [id]);

    if (mediaRows.length === 0) {
      return res.status(404).json({ message: "Медиа не найдено" });
    }

    const media = mediaRows[0];

    //Параллельно запрашиваем все связанные данные
    const [
      genresResponse, 
      // peopleResponse, 
      extrasResponse, 
      seasonsResponse
    ] = await Promise.all([
      pool.query(`
        SELECT g.name 
        FROM media_genres mg 
        JOIN genres g ON mg.genre_id = g.genre_id
        WHERE mg.media_id = ?`, [id]),
      // pool.query(`
      //   SELECT p.full_name, p.photo_url, mp.role_name 
      //   FROM media_people mp 
      //   JOIN people p ON mp.person_id = p.person_id 
      //   WHERE mp.media_id = ?`, [id]),
      pool.query(`
        SELECT me.url, tt.name as type_name 
        FROM media_extras me
        JOIN target_type tt ON me.type_id = tt.ID
        WHERE me.media_id = ?`, [id]),
      pool.query(`
        SELECT * 
        FROM seasons 
        WHERE media_id = ? 
        ORDER BY season_number`, [id])
    ]);

    //Собираем всё в один объект
    media.genres = genresResponse[0].map(g => g.name) || [];
    // media.cast = peopleResponse[0] || [];
    media.extras = extrasResponse[0] || [];
    const seasons = seasonsResponse[0] || [];
    
    //Для сериалов подтягиваем эпизоды
    if (media.type === 'tv_series' || seasons.length > 0) {
      // Чтобы не делать N запросов в цикле, берем все эпизоды для всех сезонов сразу
      const seasonIds = seasons.map(s => s.season_id);
      if (seasonIds.length > 0) {
        const [episodes] = await pool.query(
          'SELECT * FROM episodes WHERE season_id IN (?) ORDER BY episode_number', 
          [seasonIds]
        );
        
        // Распределяем эпизоды по сезонам
        media.seasons = seasons.map(s => ({
          ...s,
          episodes: episodes.filter(e => e.season_id === s.season_id)
        }));
      } else {
        media.seasons = [];
      }
    }

    res.json(media);

  } catch (error) {
    console.error("Ошибка в mediaController:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

module.exports = {
  getMediaById
};