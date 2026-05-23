import { Router } from 'express';
const router = Router();
import { getCommunityRules } from '../controllers/moderatoin.js';

router.get('/rules', getCommunityRules);

export default router;