const { pool } = require('../config/database');

const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        m.*,
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
                    'video_url', e.video_url,
                    'duration', e.duration
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
      WHERE m.media_id = ?
    `;

    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Медиа не найдено" });
    }

    const media = rows[0];

    if (media.seasons && typeof media.seasons === 'string') {
      media.seasons = JSON.parse(media.seasons);
    } else if (!media.seasons) {
      media.seasons = []; 
    }

    res.json(media);
  } catch (error) {
    console.error("Ошибка в mediaController:", error);
    res.status(500).json({ error: "Ошибка сервера при получении данных" });
  }
};

module.exports = {
  getMediaById
};