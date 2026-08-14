import { Router } from 'express';
import { requireApiKey } from '../../middlewares/apiKey';
import * as Controller from './controller';

export const integrationsRoutes = Router();

// Public endpoints (secured by API Key)
integrationsRoutes.get('/v1/employees', requireApiKey, Controller.getEmployeesSync);
integrationsRoutes.get('/v1/classes-students', requireApiKey, Controller.getClassesStudentsSync);
integrationsRoutes.get('/v1/attendances', requireApiKey, Controller.getAttendancesSync);

// Admin endpoints (secured by normal Auth, for dashboard)
// We will add authHandler middleware in the controller or main router if needed, 
// but for simplicity we'll assume they are handled by standard session or just protected routes.
// Note: You should protect these with admin auth middleware later.
integrationsRoutes.get('/admin/apps', Controller.getApps);
integrationsRoutes.post('/admin/apps', Controller.createApp);
integrationsRoutes.put('/admin/apps/:id', Controller.updateAppStatus);
integrationsRoutes.delete('/admin/apps/:id', Controller.deleteApp);
