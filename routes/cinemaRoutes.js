import { Router } from 'express';
const router = Router();
import { getCinemaClubs, getClubById } from '../controllers/cinemaClubs.js';

router.get('/', getCinemaClubs);
router.get('/:id', getClubById);

export default router;