import { Router } from 'express';
const router = Router();
import mediaController from '../controllers/MediaController.js';
import { getMediaList, getMediaByStatus, getPopularMedia, getMediaByGenre, setRating, searchMedia } from '../controllers/mediaListController.js'; 
import { auth } from '../middleware/auth.js';

router.get('/filter', getMediaByStatus);
router.get('/popular', getPopularMedia);
router.post('/rate', auth, setRating);
router.get('/search', searchMedia);
router.get('/genre/:genreName', getMediaByGenre);
router.get('/:id', auth, mediaController.getMediaById); 
router.get('/', getMediaList);

export default router;