const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const [result] = await pool.execute('SELECT 1 as test');
    res.json({ 
      status: 'OK', 
      server: 'running',
      database: 'connected',
      test: result
    });
  } catch (error) {
    res.json({ 
      status: 'OK', 
      server: 'running', 
      database: 'disconnected: ' + error.message
    });
  }
});

router.get('/media', async (req, res) => {
  try {
    const { type, limit = 20, offset = 0, search, is_animation } = req.query;
    
    let query = `
      SELECT 
        media_id,
        title,
        original_title,
        description,
        type,
        release_year,
        age_rating,
        duration,
        total_seasons,
        poster_url,
        background_url,
        trailer_url,
        imdb_rating,
        kinopoisk_rating,
        created_at,
        updated_at,
        is_animation 
      FROM media 
      WHERE 1=1
    `;

    const params = [];

    if (type && ['movie', 'tv_series'].includes(type)) {
      query += ` AND type = ?`;
      params.push(type);
    }

    if (is_animation !== undefined && is_animation !== 'undefined') {
      const animValue = (is_animation === 'true' || is_animation === '1') ? 1 : 0;
      query += ` AND is_animation = ?`;
      params.push(animValue);
    }

    if (search && search.trim() !== '') {
      query += ` AND (title LIKE ? OR original_title LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const [media] = await pool.query(query, params);
    
    res.json({
      success: true,
      data: media,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: media.length
      }
    });

  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/media/new - получить новинки 
router.get('/media/new', async (req, res) => {
  try {
    console.log('📡 /media/new called');
    
    const [media] = await pool.execute(`
      SELECT 
        media_id,
        title,
        poster_url,
        release_year,
        type,
        age_rating
      FROM media 
		  WHERE status = 'released'
      ORDER BY created_at DESC 
    `);
    
    console.log(`✅ /media/new returning ${media.length} items`);
    
    res.json({
      success: true,
      data: media
    });
  } catch (error) {
    console.error('❌ Error fetching new media:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error: ' + error.message
    });
  }
});

// GET /api/media/comingSoon - получить новинки 
router.get('/media/comingSoon', async (req, res) => {
  try {
    console.log('📡 /media/new called');
    
    const [media] = await pool.execute(`
      SELECT 
        media_id,
        title,
        poster_url,
        release_year,
        type,
        age_rating
        duration,  
        description   
      FROM media 
		  WHERE status = 'coming_soon'
      ORDER BY created_at DESC 
    `);
    
    console.log(`✅ / media/new returning ${media.length} items`);
    
    res.json({
      success: true,
      data: media
    });
  } catch (error) {
    console.error('❌ Error fetching new media:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error: ' + error.message
    });
  }
});

// GET /api/media/popular - получить популярные медиа 
router.get('/media/popular', async (req, res) => {
  try {
    console.log('📡 /media/popular called');
    
    const [media] = await pool.execute(`
      SELECT 
        media_id,
        title,
        poster_url,
        release_year,
        type,
        age_rating,
        imdb_rating,
        kinopoisk_rating,
        duration,  
        description   
      FROM media 
      ORDER BY COALESCE(imdb_rating, kinopoisk_rating) DESC
      LIMIT 9
    `);
    
    console.log(`✅ /media/popular returning ${media.length} items`);
    
    res.json({
      success: true,
      data: media
    });
  } catch (error) {
    console.error('❌ Error fetching popular media:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error: ' + error.message
    });
  }
});

// GET /api/media/genre/:genreName - получить медиа по жанру
router.get('/media/genre/:genreName', async (req, res) => {
  try {
    const { genreName } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    console.log(`📡 /media/genre/${genreName} called, limit: ${limit}, offset: ${offset}`);
    
    const [media] = await pool.execute(`
      SELECT 
        m.media_id,
        m.title,
        m.original_title,
        m.type,
        m.release_year,
        m.age_rating,
        m.duration,
        m.total_seasons,
        m.poster_url,
        m.imdb_rating,
        m.kinopoisk_rating,
        m.description,
        GROUP_CONCAT(DISTINCT g.name) as genres
      FROM media m
      JOIN media_genres mg ON m.media_id = mg.media_id
      JOIN genres g ON mg.genre_id = g.genre_id
      WHERE g.slug = ?
      GROUP BY m.media_id
      ORDER BY 
        m.release_year DESC,
        m.imdb_rating DESC
      LIMIT ? OFFSET ?
    `, [genreName, limit.toString(), offset.toString()]); 
    
    console.log(`✅ Found ${media.length} items for slug: ${genreName}`);
    
    const formattedMedia = media.map(item => ({
      ...item,
      genres: item.genres ? item.genres.split(',') : [],
      total_seasons: item.total_seasons || null,
      duration: item.duration || 0
    }));
    
    res.json({
      success: true,
      data: formattedMedia,
      genre: genreName,
      pagination: { limit, offset, total: formattedMedia.length }
    });
  } catch (error) {
    console.error(`❌ Error fetching ${req.params.genreName} media:`, error);
    res.status(500).json({ 
      success: false,
      error: 'Database error: ' + error.message
    });
  }
});

router.get('/cinema-clubs', async (req, res) => {
  try {
    const { type, limit = 10 } = req.query;
    
    console.log('🎯 Cinema clubs with pool.query:', { type, limit });
    
    let query = `
      SELECT 
        club_id,
        title,
        description, 
        type,
        cover_image,
        created_at
      FROM cinema_clubs
      WHERE 1=1
    `;
    
    const params = [];
    
    if (type && type !== 'undefined') {
      query += ` AND type = ?`;
      params.push(type);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ?`;
    
    const limitNum = Number(limit) || 10;
    params.push(limitNum);
    
    console.log('🔍 Query:', query);
    console.log('🔍 Params:', params);

    // Используем pool.query вместо pool.execute
    const [clubs] = await pool.query(query, params);
    
    console.log(`✅ Found ${clubs.length} cinema clubs with pool.query`);

    // Для каждого клуба получаем количество медиа и сами медиа
    for (let club of clubs) {
      try {
        // Получаем количество медиа
        const [countResult] = await pool.query(
          'SELECT COUNT(*) as media_count FROM club_media WHERE club_id = ?',
          [club.club_id]
        );
        club.media_count = countResult[0].media_count;
        
        // Получаем медиа
        const [media] = await pool.query(`
          SELECT m.* FROM media m
          JOIN club_media cm ON m.media_id = cm.media_id
          WHERE cm.club_id = ?
          ORDER BY cm.sort_order LIMIT 6
        `, [club.club_id]);
        
        club.media = media || [];
      } catch (mediaError) {
        console.error(`❌ Error loading media for club ${club.club_id}:`, mediaError);
        club.media_count = 0;
        club.media = [];
      }
    }
    
    res.json({ success: true, data: clubs });
  } catch (error) {
    console.error('❌ Error in cinema clubs with pool.query:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить конкретный киноклуб с полной информацией
router.get('/cinema-clubs/:id', async (req, res) => {
  try {
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
});


module.exports = router;