const express = require('express');
const router = express.Router();
const cinemaController = require('../controllers/cinemaClubs');

router.get('/', cinemaController.getCinemaClubs);
router.get('/:id', cinemaController.getClubById);

module.exports = router;