import { Router } from 'express';
import { suggest } from '../controllers/meal-plan.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.post('/suggestions', authenticate, suggest);

export default router;
