import { Router } from 'express';
const router = Router();
import { addComment, getMediaComments, addReaction,  createCommentReport } from '../controllers/commentController.js';
import { auth } from '../middleware/auth.js';

// Роут для добавления комментария 
router.post('/add', auth, addComment);

// Роут для получения комментариев к конкретному фильму
router.get('/media/:id', auth, getMediaComments);

// Роут для добавления реакции к комментарию (лайк/дизлайк) 
router.post('/reaction', auth, addReaction);

// Роут для создания жалобы на комментарий
router.post('/report', auth, createCommentReport);

export default router;