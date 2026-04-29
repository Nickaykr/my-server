import express from 'express';
import { getAllMediaAdmin, updateSeasonDetails, 
    getAllGenres, getAllPeople, getAllRoles,  getAllUsers, removeUserSubscription,
    createAdminSubscription} from '../controllers/adminController.js';
import  { auth } from '../middleware/auth.js';
import { isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Все роуты здесь будут защищены
router.get('/media', auth, isAdmin, getAllMediaAdmin);
router.get('/genres', auth, isAdmin, getAllGenres);
router.get('/people', auth, isAdmin, getAllPeople);
router.get('/roles', auth, isAdmin, getAllRoles);
router.get('/users', auth, isAdmin, getAllUsers);
router.put('/media/:id', auth, isAdmin, updateSeasonDetails);
router.put('/users/:userId/subscription', auth, isAdmin, removeUserSubscription);
router.post('/users/:id/subscription', auth, isAdmin, createAdminSubscription);

export default router;