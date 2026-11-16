import { Router } from 'express';
import { search, select } from '../controllers/food.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.get('/', authenticate, search);
router.post('/:sourceId/select', authenticate, select);

export default router;
