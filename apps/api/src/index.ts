console.log('--- SERVER INITIALIZING ---');
import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

console.log('--- BASIC IMPORTS COMPLETED ---');

import { db } from './db';
import { authHandler } from './modules/auth';
import { studentRoutes } from './modules/students/routes';
import { newsRoutes } from './modules/news/routes';
import { schedulesRoutes } from './modules/schedules/routes';
import { cardsRoutes } from './modules/cards/routes';
import { galleryRoutes } from './modules/gallery/routes';
import { contactsRoutes } from './modules/contacts/routes';
import { settingsRoutes } from './modules/settings/routes';
import { usersRoutes } from './modules/users/routes';
import pagesRoutes from './modules/pages';
import menusRoutes from './modules/menus';
import { setupAdmin } from './modules/auth/setup';
import { checkDatabase } from './modules/auth/db-check';
import { systemRoutes } from './modules/system/routes';

console.log('--- MODULE IMPORTS COMPLETED ---');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('--- STARTING SERVER ---');
console.log('PORT:', PORT);
console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('BETTER_AUTH_URL:', process.env.BETTER_AUTH_URL);

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
    ].filter(Boolean) as string[];

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || /https:\/\/.*vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Auth routes
app.get("/api/auth/setup-admin", setupAdmin);
app.get("/api/auth/db-check", checkDatabase);
app.all("/api/auth/*", authHandler);

// API Routes
app.use("/api/students", studentRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/schedules", schedulesRoutes);
app.use("/api/cards", cardsRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/pages", pagesRoutes);
app.use("/api/menus", menusRoutes);
app.use("/api/system", systemRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
