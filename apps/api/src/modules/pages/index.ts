import { Router } from 'express';
import { getPagesHandler, getPageBySlugHandler, createPageHandler, updatePageHandler, deletePageHandler } from './controller';
import { requireStaff } from '../auth/middleware';

const router = Router();

// Public - pages are viewable by anyone
router.get('/', getPagesHandler);
router.get('/slug/:slug', getPageBySlugHandler);

// Protected (staff only)
router.post('/', requireStaff, createPageHandler);
router.patch('/:id', requireStaff, updatePageHandler);
router.delete('/:id', requireStaff, deletePageHandler);

export default router;
