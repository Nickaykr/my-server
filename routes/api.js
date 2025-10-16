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

// GET /api/media - получить все медиа (ИСПРАВЛЕННАЯ ВЕРСИЯ)
router.get('/media', async (req, res) => {
  try {
    const { type, limit = 20, offset = 0, search } = req.query;
    
    console.log('📡 Query parameters:', { type, limit, offset, search });
    
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
        updated_at
      FROM media 
      WHERE 1=1
    `;

    // Фильтр по типу
    if (type && ['movie', 'series'].includes(type)) {
      query += ` AND type = '${type}'`;
    }

    // Поиск по названию
    if (search) {
      query += ` AND (title LIKE '%${search}%' OR original_title LIKE '%${search}%')`;
    }

    // Сортировка и пагинация - используем интерполяцию
    query += ` ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    
    // Используем pool.query вместо pool.execute
    const [media] = await pool.query(query);
    
    console.log(`✅ Found ${media.length} media items`);
    
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
    console.error('❌ Error fetching media:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error: ' + error.message,
      code: error.code,
      details: 'Check if media table exists and has data'
    });
  }
});

// GET /api/media/new - получить новинки (упрощенная версия)
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
      ORDER BY created_at DESC 
      LIMIT 10
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

// GET /api/media/popular - получить популярные медиа (упрощенная версия)
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
        kinopoisk_rating
      FROM media 
      ORDER BY COALESCE(imdb_rating, kinopoisk_rating) DESC
      LIMIT 10
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

// Упрощенный GET /api/media/:id
router.get('/media/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📡 /media/:id called with id:', id);
    
    const [media] = await pool.execute(
      `SELECT * FROM media WHERE media_id = ?`,
      [id]
    );
    
    if (media.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Media not found' 
      });
    }
    
    res.json({
      success: true,
      data: media[0]
    });
  } catch (error) {
    console.error('❌ Error fetching media by ID:', error);
    res.status(500).json({ 
      success: false,
      error: 'Database error: ' + error.message
    });
  }
});

module.exports = router;