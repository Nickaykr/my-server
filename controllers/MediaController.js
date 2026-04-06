const { pool } = require('../config/database');

const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        m.*,
        st.name as studio_name,   
        src.name as source_name,
        sl.name AS status_name,
        -- Источники для самого фильма 
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'player_name', ms.player_name, 
              'source_type', ms.source_type, 
              'url', ms.url
            )
          )
          FROM media_sources ms 
          WHERE ms.media_id = m.media_id AND ms.episode_id IS NULL
        ) AS main_sources,
        
        -- Сезоны и эпизоды
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'season_id', s.season_id,
              'season_number', s.season_number,
              'title', s.title,
              'description', s.description,
              'poster_url', s.poster_url,
              'episodes', (
                SELECT JSON_ARRAYAGG(
                  JSON_OBJECT(
                    'episode_id', e.episode_id,
                    'episode_number', e.episode_number,
                    'title', e.title,
                    'duration', e.duration,
                    'sources', (
                      SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                          'player_name', es.player_name, 
                          'url', es.url
                        )
                      )
                      FROM media_sources es 
                      WHERE es.episode_id = e.episode_id
                    )
                  )
                )
                FROM episodes e
                WHERE e.season_id = s.season_id
                
              )
            )
          )
          FROM seasons s
          WHERE s.media_id = m.media_id
        ) AS seasons
      FROM media m
      LEFT JOIN studios st ON m.studio_id = st.studio_id
      LEFT JOIN sources src ON m.source_id = src.source_id
      LEFT JOIN status_lookup sl ON m.status_id = sl.id 
      WHERE m.media_id = ?
    `;

    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Медиа не найдено" });
    }

    const media = rows[0];

    // Парсим JSON, так как MySQL возвращает их как строки
    const parseField = (field) => {
      try {
        return typeof field === 'string' ? JSON.parse(field) : field;
      } catch (e) {
        return field || [];
      }
    };

    media.seasons = parseField(media.seasons) || [];
    media.main_sources = parseField(media.main_sources) || [];

    res.json(media);
  } catch (error) {
    console.error("Ошибка в mediaController:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

module.exports = {
  getMediaById
};