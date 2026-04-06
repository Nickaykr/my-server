const express = require('express');
const router = express.Router();
const { getMediaById } = require('../controllers/MediaController');
const mediaController = require('../controllers/mediaListController'); 

router.get('/', mediaController.getMediaList);
router.get('/filter', mediaController.getMediaByStatus);
router.get('/popular', mediaController.getPopularMedia);
router.get('/genre/:genreName', mediaController.getMediaByGenre);
router.get('/:id', getMediaById); 

module.exports = router;