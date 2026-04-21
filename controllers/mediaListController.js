import { pool } from '../config/database.js';

export async function getMediaList(req, res) {
    try {
        const { type, limit = 20, offset = 0, search, is_animation } = req.query;
        
        let query = `
            SELECT 
                s.season_id,
                m.media_id,
                m.title AS main_title,       
                s.title AS season_title,
                m.original_title,
                s.description,
                m.type,
                s.release_year,
                s.age_rating,
                s.duration,
                m.total_seasons,
                s.poster_url,
                s.imdb_rating,
                s.kinopoisk_rating,
                m.created_at,
                m.updated_at,
                m.is_animation 
            FROM media m
            JOIN seasons s ON m.media_id = s.media_id
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
}

export async function getMediaByStatus(req, res) {
    try {
        const { status = 'release', limit = 10 } = req.query;

        const queryStatus = String(status);
        const queryLimit = parseInt(limit, 10);

        const query = `
            SELECT 
                s.season_id,
                m.media_id,
                m.title AS main_title,        
                s.title AS season_title,
                s.poster_url,
                s.release_year,
                m.type,
                s.age_rating,
                s.imdb_rating,
                s.kinopoisk_rating,
                s.duration,
                s.description,
                sl.name AS status_name
            FROM media m
            JOIN seasons s ON m.media_id = s.media_id
            LEFT JOIN status_lookup sl ON s.status_id = sl.id 
            WHERE sl.slug_name = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        `;

        // Передаем параметры в массив, чтобы избежать SQL-инъекций
        const [media] = await pool.query(query, [queryStatus, queryLimit]);
        console.log(`✅ /media?status=${status} returning ${media.length} items`);

        res.json({
            success: true,
            data: media
        });
    } catch (error) {
        console.error('❌ Error fetching media by status:', error);
        res.status(500).json({ 
            success: false,
            error: 'Database error: ' + error.message
        });
    }
}

export async function getPopularMedia(req, res) {
    try {
        
        const [media] = await pool.execute(`
            SELECT 
                s.season_id,
                m.media_id,
                m.title AS main_title,       
                s.title AS season_title,
                s.poster_url,
                s.release_year,
                m.type,
                s.age_rating,
                s.imdb_rating,
                s.kinopoisk_rating,
                s.duration,  
                s.description   
            FROM media m
            LEft JOIN seasons s ON m.media_id = s.media_id
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
}

export async function getMediaByGenre(req, res) {
    try {
        const { genreName } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        console.log(`📡 /media/genre/${genreName} called, limit: ${limit}, offset: ${offset}`);
        
        const [media] = await pool.execute(`
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
                GROUP_CONCAT(DISTINCT g.name) as genres
            FROM media m
            JOIN seasons s ON m.media_id = s.media_id AND s.season_number = 1
            JOIN media_genres mg ON m.media_id = mg.media_id
            JOIN genres g ON mg.genre_id = g.genre_id
            WHERE g.slug = ?
            GROUP BY m.media_id
            ORDER BY 
                s.release_year DESC,
                s.imdb_rating DESC
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
}

export async function setRating(req, res) {
  try {
    const { season_id, rating } = req.body;
    const userId = req.user.user_id; 

    await pool.query(`
      INSERT INTO ratings (user_id, season_id, rating, created_at) 
      VALUES (?, ?, ?, NOW()) 
      ON DUPLICATE KEY UPDATE rating = VALUES(rating)
    `, [userId, season_id, rating]);;

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Ошибка сервера" });
  }
}

