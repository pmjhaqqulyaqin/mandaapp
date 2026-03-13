console.log('--- SERVER INITIALIZING ---');
import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

console.log('--- IMPORTS COMPLETED ---');

import { db } from './db';
import { authHandler } from './modules/auth';
// ... rest remains roughly the same but with logs

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
    ].filter(Boolean) as string[];

    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || /https:\/\/.*vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Auth handler: use app.all() NOT app.use() — app.use() strips the mount path
// from req.url, breaking Better Auth's internal route matching for OAuth callbacks
app.get("/api/auth/setup-admin", setupAdmin);
app.all("/api/auth/*", authHandler);

app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

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
import { systemRoutes } from './modules/system/routes';
app.use("/api/system", systemRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
