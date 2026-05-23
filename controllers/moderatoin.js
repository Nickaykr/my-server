import { pool } from '../config/database.js';

export async function getCommunityRules(req, res) {
  try {
    const [rules] = await pool.execute(`
      SELECT * FROM community_rules 
      where is_active = 1
    `, );
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('❌ Error in community rules:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}