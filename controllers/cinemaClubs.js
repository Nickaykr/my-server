const { pool } = require('../config/database');

exports.getCinemaClubs = async (req, res) => {
  try {
    const { type, limit = 10 } = req.query;
    
    let query = `
      SELECT club_id, title, description, type, cover_image, created_at
      FROM cinema_clubs
      WHERE 1=1
    `;
    
    const params = [];
    if (type && type !== 'undefined') {
      query += ` AND type = ?`;
      params.push(type);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(Number(limit) || 10);

    //Получаем основные данные клубов
    const [clubs] = await pool.query(query, params);

    // Обрабатываем каждый клуб (картинки + вложенные медиа)
    const processedClubs = await Promise.all(clubs.map(async (club) => {
      // Исправляем путь к картинке
      let coverImage = club.cover_image;
      if (coverImage && !coverImage.startsWith('/')) {
        coverImage = '/' + coverImage;
      }

      try {
        // Получаем количество медиа в этом клубе
        const [countResult] = await pool.query(
          'SELECT COUNT(*) as media_count FROM club_media WHERE club_id = ?',
          [club.club_id]
        );

        // Получаем превью фильмов для этого клуба
        const [media] = await pool.query(`
          SELECT m.* FROM media m
          JOIN club_media cm ON m.media_id = cm.media_id
          WHERE cm.club_id = ?
          ORDER BY cm.sort_order LIMIT 6
        `, [club.club_id]);

        return {
          ...club,
          cover_image: coverImage,
          media_count: countResult[0].media_count || 0,
          media: media || []
        };
      } catch (err) {
        console.error(`Ошибка загрузки данных для клуба ${club.club_id}:`, err);
        return { ...club, cover_image: coverImage, media_count: 0, media: [] };
      }
    }));

    res.json({ success: true, data: processedClubs });

  } catch (error) {
    console.error('❌ Error in cinema clubs:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

exports.getClubById = async (req, res) => {
  try{
    const { id } = req.params;
    
    const [club] = await pool.execute(`
      SELECT * FROM cinema_clubs WHERE club_id = ?
    `, [id]);
    
    const [media] = await pool.execute(`
      SELECT m.* FROM media m
      JOIN club_media cm ON m.media_id = cm.media_id
      WHERE cm.club_id = ?
      ORDER BY cm.sort_order
    `, [id]);
    
    res.json({ 
      success: true, 
      data: {
        ...club[0],
        media
      }
    });
  } catch (error) {
    console.error('Error fetching cinema club:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};