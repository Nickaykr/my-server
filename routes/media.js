const express = require('express');
const router = express.Router();
const { getMediaById } = require('../controllers/MediaController');
const mediaController = require('../controllers/mediaListController'); 
const { auth } = require('../middleware/auth');

router.get('/', mediaController.getMediaList);
router.get('/filter', mediaController.getMediaByStatus);
router.get('/popular', mediaController.getPopularMedia);
router.get('/genre/:genreName', mediaController.getMediaByGenre);
router.get('/:id', auth, getMediaById); 
router.post('/rate', auth, mediaController.setRating);

module.exports = router;