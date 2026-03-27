import { Router } from 'express';
import { getPagesHandler, getPageBySlugHandler, createPageHandler, updatePageHandler, deletePageHandler } from './controller';

const router = Router();

router.get('/', getPagesHandler);
router.get('/slug/:slug', getPageBySlugHandler);
router.post('/', createPageHandler);
router.patch('/:id', updatePageHandler);
router.delete('/:id', deletePageHandler);

export default router;
