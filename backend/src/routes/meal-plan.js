import { Router } from 'express';
import { create, list, read, suggest } from '../controllers/meal-plan.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.post('/suggestions', authenticate, suggest);
router.get('/', authenticate, list);
router.post('/', authenticate, create);
router.get('/:id', authenticate, read);

export default router;
