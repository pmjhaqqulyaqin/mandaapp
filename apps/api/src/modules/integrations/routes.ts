import { Router } from 'express';
import { requireApiKey } from '../../middlewares/apiKey';
import { requireAuth } from '../auth/middleware';
import * as Controller from './controller';

export const integrationsRoutes = Router();

// Public endpoints (secured by API Key)
integrationsRoutes.get('/v1/employees', requireApiKey, Controller.getEmployeesSync);
integrationsRoutes.get('/v1/classes-students', requireApiKey, Controller.getClassesStudentsSync);
integrationsRoutes.get('/v1/attendances', requireApiKey, Controller.getAttendancesSync);

// Admin endpoints (secured by session auth — admin only)
integrationsRoutes.get('/admin/apps', requireAuth(['admin']), Controller.getApps);
integrationsRoutes.post('/admin/apps', requireAuth(['admin']), Controller.createApp);
integrationsRoutes.put('/admin/apps/:id', requireAuth(['admin']), Controller.updateAppStatus);
integrationsRoutes.delete('/admin/apps/:id', requireAuth(['admin']), Controller.deleteApp);
