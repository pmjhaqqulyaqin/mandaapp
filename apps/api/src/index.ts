import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import logger from './lib/logger';


import { authHandler } from './modules/auth';
import { studentRoutes } from './modules/students/routes';
import { newsRoutes } from './modules/news/routes';
import { eofficeRouter } from './modules/eoffice/routes';
import { schedulesRoutes } from './modules/schedules/routes';
import { cardsRoutes } from './modules/cards/routes';
import { galleryRoutes } from './modules/gallery/routes';
import { contactsRoutes } from './modules/contacts/routes';
import { settingsRoutes } from './modules/settings/routes';
import { usersRoutes } from './modules/users/routes';
import pagesRoutes from './modules/pages';
import menusRoutes from './modules/menus';
import { systemRoutes } from './modules/system/routes';
import majorsRoutes from './modules/majors/routes';
import classesRoutes from './modules/classes/routes';
import employeesRoutes from './modules/employees/routes';
import { ptspRoutes } from './modules/ptsp/routes';
import { eventsRoutes } from './modules/events/routes';
import { nisRoutes } from './modules/nis/routes';
import { examRoutes } from './modules/exams/routes';
import { ppdbRoutes } from './modules/ppdb/routes';

dotenv.config();

const app = express();
app.use(compression());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info({ path: uploadDir }, 'Created missing uploads directory');
}

// HTTP request logging (structured JSON in production)
app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => {
      // Don't log health checks and static assets
      const url = (req as any).url || '';
      return url === '/health' || url.startsWith('/uploads/');
    },
  },
  // Don't log request/response bodies
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
}));

// Trust proxy is required for 'Secure' cookies to work when running behind 
// Railway's or Vercel's reverse proxy
app.set('trust proxy', true);

// Global rate limiting — 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak request. Silakan coba lagi nanti.' },
});
app.use(globalLimiter);

// Stricter rate limit for public form submissions (PPDB, contacts)
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Terlalu banyak percobaan pengiriman. Silakan coba lagi dalam 15 menit.' },
});
app.use('/api/ppdb/daftar', formLimiter);
app.use('/api/contacts', formLimiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.' },
});
app.use('/api/auth', authLimiter);

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'https://mandualotim.sch.id',
      'http://mandualotim.sch.id',
    ].filter(Boolean) as string[];

    // Allow requests with no origin (same-origin via Nginx proxy, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));
// On-the-fly thumbnail generator for gallery images (reduces ~900KB → ~40KB per image)
app.get('/uploads/thumb/:filename', async (req, res) => {
  try {
    const sharp = (await import('sharp')).default;
    const filePath = path.join(process.cwd(), 'uploads', req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Not found');
    }
    const width = Math.min(parseInt(req.query.w as string) || 400, 800);
    const buffer = await sharp(filePath)
      .resize(width, undefined, { withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable'); // 30 days
    res.send(buffer);
  } catch (err) {
    console.error('Thumbnail error:', err);
    res.status(500).send('Thumbnail generation failed');
  }
});

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  maxAge: '30d',
  setHeaders: (res, filePath) => {
    if (filePath.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="' + path.basename(filePath) + '"');
    }
  }
}));

// Auth handler
app.all("/api/auth/*", authHandler);

// API Routes
app.use("/api/students", studentRoutes);
app.use("/api/news", newsRoutes);
app.use('/api/eoffice', eofficeRouter);
app.use("/api/schedules", schedulesRoutes);
app.use("/api/cards", cardsRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/pages", pagesRoutes);
app.use("/api/menus", menusRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/majors", majorsRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/ptsp", ptspRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/nis", nisRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/ppdb", ppdbRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  logger.info({ port: PORT }, `Server is running on port ${PORT}`);
});
