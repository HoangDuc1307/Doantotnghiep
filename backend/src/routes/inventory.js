import { Router } from 'express';
import { create, list, remove, update } from '../controllers/inventory.controller.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();
router.use(authenticate);

router.get('/', list);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);

export default router;
