import { pool } from '../config/database.js';

const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;

    //Основная информация 
    const [mediaRows] = await pool.query(`
      SELECT
        s.season_id,
        m.media_id,
        m.title AS main_title,       
        s.title AS season_title,
        m.original_title,
        m.type,
        s.release_year,
        s.age_rating,
        s.duration,
        m.total_seasons,
        s.poster_url,
        s.imdb_rating,
        s.kinopoisk_rating,
        s.description, 
        st.name as studio_name,   
        src.name as source_name, 
        sl.name AS status_name
      FROM media m
      LEFT JOIN sources src ON m.source_id = src.source_id
      LEFT JOIN seasons s ON m.media_id = s.media_id
      LEFT JOIN studios st ON s.studio_id = st.studio_id
      LEFT JOIN status_lookup sl ON s.status_id = sl.id 
      WHERE s.season_id = ?
    `, [id]);

    if (mediaRows.length === 0) {
      return res.status(404).json({ message: "Медиа не найдено" });
    }

    const media = mediaRows[0];
    const actualMediaId = media.media_id; 

    //Параллельно запрашиваем все связанные данные
    const [
      genresResponse, 
      peopleResponse, 
      extrasResponse, 
      ratingsResponse,
      userRatingResponse,
      pleerResponse
    ] = await Promise.all([
      pool.query(`
        SELECT g.name 
        FROM media_genres mg 
        JOIN genres g ON mg.genre_id = g.genre_id
        WHERE mg.media_id = ?`, [actualMediaId]),
      pool.query(`
        SELECT p.full_name, p.photo_url, r.name AS role_name, mp.character_name
        FROM media_people mp 
        JOIN people p ON mp.person_id = p.person_id 
        JOIN role r ON mp.role_id = r.role_id
        WHERE mp.season_id = ?`, [id]),
      pool.query(`
        SELECT me.url, tt.name as type_name 
        FROM media_extras me
        JOIN target_type tt ON me.type_id = tt.ID
        WHERE me.season_id = ?`, [id]),
      pool.query(`
        SELECT 
          ROUND(AVG(rating), 1) as average_rating, 
          COUNT(ratings_id) as total_votes 
        FROM ratings 
        WHERE season_id = ?`, [id]),
      pool.query(`
        SELECT 
          rating 
        FROM ratings 
        WHERE season_id = ? AND user_id = ?`, [id, req.user.user_id]),
      pool.query(`
        SELECT 
          ms.url, ms.is_active, tt.name as type_name, p.name AS player_name
        FROM media_sources ms
        JOIN target_type tt ON ms.target_type_id = tt.ID
        JOIN pleer_name p ON ms.player_id = p.id
        WHERE ms.seasons_id = ? AND ms.is_active = 1`, [id])
    ]);

    media.genres = genresResponse[0].map(g => g.name);
    media.people = peopleResponse[0];
    media.extras = extrasResponse[0];
    media.average_rating = ratingsResponse[0][0].average_rating || 0;
    media.total_votes = ratingsResponse[0][0].total_votes || 0;
    media.user_rating = userRatingResponse[0][0]?.rating || 0; 
    media.video = pleerResponse[0]; 

    res.json(media);

  } catch (error) {
    console.error("Ошибка в mediaController:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

export default {
  getMediaById
};