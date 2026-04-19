import { Router } from 'express';
import { getMenusHandler, createMenuHandler, updateMenuHandler, deleteMenuHandler } from './controller';
import { requireStaff } from '../auth/middleware';

const router = Router();

// Public - menus are needed for navigation
router.get('/', getMenusHandler);

// Protected (staff only)
router.post('/', requireStaff, createMenuHandler);
router.patch('/:id', requireStaff, updateMenuHandler);
router.delete('/:id', requireStaff, deleteMenuHandler);

export default router;
