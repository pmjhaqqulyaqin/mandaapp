import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

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
import { systemRoutes } from './modules/system/routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Diagnostic logging for auth routes
app.all("/api/auth/*", (req, res, next) => {
  console.log(`[AUTH REQUEST] ${req.method} ${req.url}`);
  console.log(`[AUTH PATH] ${req.path}`);
  console.log(`[AUTH HEADERS] Protocol: ${req.protocol}, X-Forwarded-Proto: ${req.headers['x-forwarded-proto']}, Origin: ${req.headers.origin}`);
  console.log(`[AUTH DEBUG] Cookies Present:`, !!req.headers.cookie);
  next();
});

// Cookie logging for debugging
app.use((req, res, next) => {
  if (req.path.includes('/api/auth')) {
    console.log(`[AUTH DEBUG] ${req.method} ${req.path}`);
    console.log(`[AUTH DEBUG] Incoming Cookies:`, req.headers.cookie ? 'Present' : 'None');
    
    // Intercept outgoing headers to log Set-Cookie
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding?: any, cb?: any) {
      const setCookie = res.getHeader('set-cookie');
      if (setCookie) {
        console.log(`[AUTH DEBUG] Outgoing Set-Cookie:`, Array.isArray(setCookie) ? setCookie.join(', ') : setCookie);
      }
      return originalEnd.call(this, chunk, encoding, cb);
    } as any;
  }
  next();
});

// Trust proxy is required for 'Secure' cookies to work when running behind 
// Railway's or Vercel's lead balancer/reverse proxy
app.set('trust proxy', true);

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
  allowedHeaders: ['Content-Type', 'X-User-Id', 'Authorization', 'Accept'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Auth handler
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
