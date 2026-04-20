const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentController');
const { auth } = require('../middleware/auth');

// Роут для добавления комментария 
router.post('/add', auth, commentsController.addComment);

// Роут для получения комментариев к конкретному фильму
router.get('/media/:id', commentsController.getMediaComments);

module.exports = router;