import { pool } from '../config/database.js';

export async function  getMediaById(req, res) {
  try {
    const { id } = req.params;

    const { type } = req.query;

    // Определяем колонку для поиска
    const searchColumn = type === 'media' ? 'm.media_id' : 's.season_id';

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
        s.episode_count,
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
      WHERE ${searchColumn} = ?
    `, [id]);

    if (mediaRows.length === 0) {
      return res.status(404).json({ message: "Медиа не найдено" });
    }

    const media = mediaRows[0];
    const actualMediaId = media.media_id; 
    const actualSeasonId = media.season_id;
  

    //Параллельно запрашиваем все связанные данные
    const [
      genresResponse, 
      peopleResponse, 
      extrasResponse, 
      ratingsResponse,
      userRatingResponse,
      userListresponse,
      pleerResponse
    ] = await Promise.all([
      pool.query(`
        SELECT g.name, g.genre_id
        FROM media_genres mg 
        JOIN genres g ON mg.genre_id = g.genre_id
        WHERE mg.media_id = ?`, [actualMediaId]),
      pool.query(`
        SELECT p.full_name, p.photo_url, r.name AS role_name, mp.character_name
        FROM media_people mp 
        JOIN people p ON mp.person_id = p.person_id 
        JOIN role r ON mp.role_id = r.role_id
        WHERE mp.season_id = ?`, [actualSeasonId]),
      pool.query(`
        SELECT me.url, tt.name as type_name 
        FROM media_extras me
        JOIN target_type tt ON me.type_id = tt.ID
        WHERE me.season_id = ?`, [actualSeasonId]),
      pool.query(`
        SELECT 
          ROUND(AVG(rating), 1) as average_rating, 
          COUNT(ratings_id) as total_votes 
        FROM ratings 
        WHERE season_id = ?`, [actualSeasonId]),
      pool.query(`
        SELECT 
          rating 
        FROM ratings 
        WHERE season_id = ? AND user_id = ?`, [actualSeasonId, req.user.user_id]),
     pool.query(`
        SELECT 
          uml.status_id AS user_status_id,
          ls.name AS status_name
        FROM user_media_lists uml
        JOIN list_statuses ls ON uml.status_id = ls.statuses_id 
        WHERE uml.season_id = ? AND uml.user_id = ?`, [actualSeasonId, req.user.user_id]),
      pool.query(`
        SELECT 
          ms.url, 
          ms.is_active, 
          tt.name as type_name, 
          p.name AS player_name,
          e.episode_number ,
          e.title,
          e.release_date
        FROM media_sources ms
        JOIN target_type tt ON ms.target_type_id = tt.ID
        JOIN pleer_name p ON ms.player_id = p.id
        LEFT JOIN episodes e ON ms.episode_id = e.episode_id 
        WHERE ms.seasons_id = ? AND ms.is_active = 1;`, [actualSeasonId])
    ]);
    

    media.genres = genresResponse[0];
    media.people = peopleResponse[0];
    media.extras = extrasResponse[0];
    media.average_rating = ratingsResponse[0][0].average_rating || 0;
    media.total_votes = ratingsResponse[0][0].total_votes || 0;
    media.user_rating = userRatingResponse[0][0]?.rating || 0; 
    media.user_list_id = userListresponse[0][0]?.user_status_id ; 
    media.user_list_name = userListresponse[0][0]?.status_name; 
    media.video = pleerResponse[0]; 

    res.json(media);

  } catch (error) {
    console.error("Ошибка в mediaController:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
};

export async function getList (req, res){
  try {
    const [rows] = await pool.execute('SELECT statuses_id, name FROM list_statuses');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Ошибка при получении статусов" });
  }
}

export async function postListUser (req, res) {
  const { season_id, status_id } = req.body;
  const userId = req.user.user_id; 

  console.log(season_id, status_id, userId)
  if (!season_id || userId === undefined) {
    return res.status(400).json({ message: "Не все поля заполнены (нужен сезон и юзер)" });
  }
  
  try {
    if (status_id === null || status_id === 'clear') {
      // Логика УДАЛЕНИЯ
      const deleteQuery = `DELETE FROM user_media_lists WHERE user_id = ? AND season_id = ?`;
      await pool.execute(deleteQuery, [userId, season_id]);
      return res.json({ success: true, message: "Удалено из списка" });
    }

    // Логика СОХРАНЕНИЯ / ОБНОВЛЕНИЯ
    const query = `
      INSERT INTO user_media_lists (user_id, season_id, status_id, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE 
        status_id = VALUES(status_id), 
        updated_at = CURRENT_TIMESTAMP
    `;

    await pool.execute(query, [userId, season_id, status_id]);
    res.json({ success: true, message: "Список успешно обновлен" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ошибка сервера" });
  }
}