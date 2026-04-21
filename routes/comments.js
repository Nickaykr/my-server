import { Router } from 'express';
const router = Router();
import { addComment, getMediaComments } from '../controllers/commentController.js';
import { auth } from '../middleware/auth.js';

// Роут для добавления комментария 
router.post('/add', auth, addComment);

// Роут для получения комментариев к конкретному фильму
router.get('/media/:id', getMediaComments);

export default router;