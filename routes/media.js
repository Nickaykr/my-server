import { Router } from 'express';
const router = Router();
import mediaController from '../controllers/MediaController.js';
import { getMediaList, getMediaByStatus, getPopularMedia, getMediaByGenre, setRating } from '../controllers/mediaListController.js'; 
import { auth } from '../middleware/auth.js';

router.get('/', getMediaList);
router.get('/filter', getMediaByStatus);
router.get('/popular', getPopularMedia);
router.get('/genre/:genreName', getMediaByGenre);
router.get('/:id', auth, mediaController.getMediaById); 
router.post('/rate', auth, setRating);

export default router;