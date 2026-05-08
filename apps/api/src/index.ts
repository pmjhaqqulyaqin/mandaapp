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

import classesRoutes from './modules/classes/routes';
import employeesRoutes from './modules/employees/routes';
import { ptspRoutes } from './modules/ptsp/routes';
import { eventsRoutes } from './modules/events/routes';
import { nisRoutes } from './modules/nis/routes';
import { examRoutes } from './modules/exams/routes';
import { ppdbRoutes } from './modules/ppdb/routes';
import { attendanceRoutes } from './modules/attendance/routes';
import { jurnalRoutes } from './modules/jurnal/routes';
import analyticsRoutes from './modules/analytics/routes';
import { parentPortalRoutes } from './modules/parent-portal/routes';

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

import { ijazahRoutes } from './modules/ijazah/routes';

app.use("/api/classes", classesRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/ptsp", ptspRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/nis", nisRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/ppdb", ppdbRoutes);
app.use("/api/ijazah", ijazahRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/jurnal", jurnalRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/parent-portal", parentPortalRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import { db } from './db';
import { sql } from 'drizzle-orm';

async function runAutoMigration() {
  try {
    const cols = [
      'headmaster_signature_url',
      'kemenag_logo_url',
      'school_stamp_url',
      'custom_template_horizontal_front_url',
      'custom_template_horizontal_back_url',
      'custom_template_vertical_front_url',
      'custom_template_vertical_back_url'
    ];
    
    // Check if table exists first
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'card_settings'
      );
    `);
    
    // tableCheck.rows is where PostgreSQL puts the results
    const rows = (tableCheck as any).rows || tableCheck;
    if (rows[0] && rows[0].exists) {
      logger.info("Checking card_settings table schema...");
      for (const col of cols) {
        try {
          await db.execute(sql.raw(`ALTER TABLE "card_settings" ADD COLUMN IF NOT EXISTS "${col}" text;`));
        } catch (err: any) {
          // Ignore if column already exists (in case IF NOT EXISTS isn't supported on old PG)
        }
      }
      logger.info("Schema check completed.");
    }

    // Auto-create Ijazah tables if they don't exist
    logger.info("Checking ijazah tables...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ijazah_subjects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" varchar(150) NOT NULL,
        "group" varchar(50) NOT NULL,
        "order_num" integer DEFAULT 0,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ijazah_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "academic_year_id" uuid NOT NULL,
        "report_weight" integer DEFAULT 60,
        "exam_weight" integer DEFAULT 40,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ijazah_grades" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "student_id" uuid NOT NULL,
        "subject_id" uuid NOT NULL,
        "semester_1" integer,
        "semester_2" integer,
        "semester_3" integer,
        "semester_4" integer,
        "semester_5" integer,
        "exam_score" integer,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    // FK constraints (idempotent)
    try {
      await db.execute(sql`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ijazah_settings_academic_year_id_academic_years_id_fk') THEN
            ALTER TABLE "ijazah_settings" ADD CONSTRAINT "ijazah_settings_academic_year_id_academic_years_id_fk"
              FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ijazah_grades_student_id_student_profiles_id_fk') THEN
            ALTER TABLE "ijazah_grades" ADD CONSTRAINT "ijazah_grades_student_id_student_profiles_id_fk"
              FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ijazah_grades_subject_id_ijazah_subjects_id_fk') THEN
            ALTER TABLE "ijazah_grades" ADD CONSTRAINT "ijazah_grades_subject_id_ijazah_subjects_id_fk"
              FOREIGN KEY ("subject_id") REFERENCES "public"."ijazah_subjects"("id") ON DELETE cascade ON UPDATE no action;
          END IF;
        END $$;
      `);
    } catch (fkErr) {
      logger.warn({ err: fkErr }, "FK constraint setup (non-critical)");
    }
    logger.info("Ijazah tables ready.");

    // Auto-create ijazah_subject_mappings table
    logger.info("Checking ijazah_subject_mappings table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "ijazah_subject_mappings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "subject_id" uuid NOT NULL,
        "class_ids" jsonb DEFAULT '[]'::jsonb,
        "sem1" boolean DEFAULT false,
        "sem2" boolean DEFAULT false,
        "sem3" boolean DEFAULT false,
        "sem4" boolean DEFAULT false,
        "sem5" boolean DEFAULT false,
        "um" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    // Add semester column if missing (backward compat)
    try {
      await db.execute(sql.raw(`ALTER TABLE "ijazah_subjects" ADD COLUMN IF NOT EXISTS "semester" varchar(20) DEFAULT 'global';`));
    } catch (e) { /* already exists */ }
    // FK for mappings
    try {
      await db.execute(sql`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ijazah_subject_mappings_subject_id_ijazah_subjects_id_fk') THEN
            ALTER TABLE "ijazah_subject_mappings" ADD CONSTRAINT "ijazah_subject_mappings_subject_id_ijazah_subjects_id_fk"
              FOREIGN KEY ("subject_id") REFERENCES "public"."ijazah_subjects"("id") ON DELETE cascade ON UPDATE no action;
          END IF;
        END $$;
      `);
    } catch (fkErr) {
      logger.warn({ err: fkErr }, "Mapping FK setup (non-critical)");
    }
    logger.info("ijazah_subject_mappings table ready.");

    // Auto-create Attendance tables
    logger.info("Checking attendance tables...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "attendance_records" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "student_id" uuid NOT NULL REFERENCES "student_profiles"("id") ON DELETE CASCADE,
        "class_id" uuid REFERENCES "classes"("id"),
        "date" date NOT NULL,
        "check_in" time,
        "check_out" time,
        "status" varchar(20) NOT NULL,
        "method" varchar(20) DEFAULT 'manual',
        "note" text,
        "recorded_by" text REFERENCES "user"("id"),
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        UNIQUE("student_id", "date")
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "attendance_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "academic_year_id" uuid REFERENCES "academic_years"("id"),
        "check_in_time" time NOT NULL DEFAULT '06:30',
        "late_time" time NOT NULL DEFAULT '07:30',
        "check_out_time" time NOT NULL DEFAULT '13:00',
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    // Create indexes for attendance performance
    try {
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_attendance_class ON attendance_records(class_id);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);`);
    } catch (idxErr) { /* indexes may already exist */ }
    // Seed default settings if empty
    try {
      const settingsCheck = await db.execute(sql`SELECT COUNT(*) as c FROM attendance_settings;`);
      const rows = (settingsCheck as any).rows || settingsCheck;
      if (rows[0] && (Number(rows[0].c) === 0 || Number(rows[0].count) === 0)) {
        await db.execute(sql`
          INSERT INTO attendance_settings (id, check_in_time, late_time, check_out_time, is_active)
          VALUES (gen_random_uuid(), '06:30', '07:30', '13:00', true);
        `);
        logger.info("Seeded default attendance settings (06:30 / 07:30 / 13:00)");
      }
    } catch (seedErr) { /* non-critical */ }
    logger.info("Attendance tables ready.");

    // Auto-create Jurnal Mengajar tables
    logger.info("Checking jurnal mengajar tables...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "teaching_subjects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "employee_id" uuid NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
        "class_id" uuid NOT NULL REFERENCES "classes"("id"),
        "subject_name" varchar(150) NOT NULL,
        "day_of_week" integer NOT NULL,
        "jam_ke" varchar(20),
        "waktu_mulai" time,
        "waktu_selesai" time,
        "semester" varchar(10) DEFAULT 'ganjil',
        "tahun_ajaran" varchar(20),
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "jurnal_entries" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "teaching_subject_id" uuid REFERENCES "teaching_subjects"("id"),
        "teacher_id" uuid NOT NULL REFERENCES "employees"("id"),
        "class_id" uuid NOT NULL REFERENCES "classes"("id"),
        "subject_name" varchar(150) NOT NULL,
        "date" date NOT NULL,
        "jam_ke" varchar(20),
        "waktu_mulai" time,
        "waktu_selesai" time,
        "link_rpp" text,
        "materi_pembelajaran" text,
        "metode" varchar(255),
        "capaian_pembelajaran" text,
        "kendala_dan_solusi" text,
        "catatan" text,
        "evaluasi" text,
        "jumlah_hadir" integer DEFAULT 0,
        "jumlah_izin" integer DEFAULT 0,
        "jumlah_sakit" integer DEFAULT 0,
        "jumlah_alpa" integer DEFAULT 0,
        "total_siswa" integer DEFAULT 0,
        "status" varchar(20) DEFAULT 'draft',
        "approved_by" text REFERENCES "user"("id"),
        "approved_at" timestamp,
        "rejection_note" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "jurnal_student_attendance" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "jurnal_entry_id" uuid NOT NULL REFERENCES "jurnal_entries"("id") ON DELETE CASCADE,
        "student_id" uuid NOT NULL REFERENCES "student_profiles"("id"),
        "status" varchar(20) NOT NULL,
        "note" text,
        "created_at" timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "jurnal_attachments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "jurnal_entry_id" uuid NOT NULL REFERENCES "jurnal_entries"("id") ON DELETE CASCADE,
        "file_type" varchar(20) NOT NULL,
        "file_url" varchar(500) NOT NULL,
        "file_name" varchar(255),
        "file_size" integer,
        "caption" text,
        "created_at" timestamp DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "jurnal_templates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "teacher_id" uuid NOT NULL REFERENCES "employees"("id"),
        "subject_name" varchar(150) NOT NULL,
        "title" varchar(255) NOT NULL,
        "content" text NOT NULL,
        "usage_count" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    try {
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_jurnal_date ON jurnal_entries(date);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_jurnal_teacher ON jurnal_entries(teacher_id);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_jurnal_class ON jurnal_entries(class_id);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_jurnal_status ON jurnal_entries(status);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_teaching_employee ON teaching_subjects(employee_id);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_teaching_day ON teaching_subjects(day_of_week);`);
    } catch (idxErr) { /* indexes may already exist */ }
    logger.info("Jurnal mengajar tables ready.");

    // Add kode_guru column to employees if not exists
    await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS kode_guru VARCHAR(10);`);

    // Create jurnal_mapel_codes table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS jurnal_mapel_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kode VARCHAR(10) NOT NULL UNIQUE,
        subject_name VARCHAR(150) NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
    // Seed default mapel codes if table is empty
    const mapelCount = await db.execute(sql`SELECT COUNT(*) as cnt FROM jurnal_mapel_codes`);
    if (Number((mapelCount as any).rows?.[0]?.cnt || 0) === 0) {
      await db.execute(sql`
        INSERT INTO jurnal_mapel_codes (kode, subject_name) VALUES
        ('A','Al-Quran Hadits'),('B','Fikih'),('C','Akidah Akhlak'),('D','SKI'),
        ('E','Bahasa Arab'),('F','Pendidikan Pancasila'),('G','Bahasa Indonesia'),
        ('H','Bahasa Inggris'),('I','Matematika'),('J','Sejarah'),('K','Penjaskes'),
        ('L','Seni Budaya'),('M','Prakarya dan Kewirausahaan'),('N','Ilmu Tafsir'),
        ('O','Ilmu Hadits'),('P','Ushul Fikih'),('Q','Ekonomi'),('R','Geografi'),
        ('S','Sosiologi'),('T','Fisika'),('U','Kimia'),('V','Biologi'),
        ('W','Informatika'),('X','Bimbingan Konseling'),('Y','Tahfidz'),('Z','Mulok')
        ON CONFLICT (kode) DO NOTHING;
      `);
      logger.info("Seeded default mapel codes.");
    }

    // ─── Parent Portal ─────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS parent_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
        relation VARCHAR(20) DEFAULT 'wali',
        phone VARCHAR(50),
        notification_email BOOLEAN DEFAULT true,
        notification_wa BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
    logger.info("Parent portal tables ready.");

  } catch (err) {
    logger.error({ err }, "Auto-migration failed");
  }
}

app.listen(PORT, async () => {
  await runAutoMigration();
  logger.info({ port: PORT }, `Server is running on port ${PORT}`);
});
