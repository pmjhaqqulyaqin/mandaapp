import { Router } from 'express';
import { getMenusHandler, createMenuHandler, updateMenuHandler, deleteMenuHandler } from './controller';

const router = Router();

router.get('/', getMenusHandler);
router.post('/', createMenuHandler);
router.patch('/:id', updateMenuHandler);
router.delete('/:id', deleteMenuHandler);

export default router;
