import { pgTable, text, timestamp, boolean, uuid, varchar, date, integer, time, jsonb } from "drizzle-orm/pg-core";

// Users (Integrated with better-auth)
export const user = pgTable("user", {
					id: text("id").primaryKey(),
					name: text("name").notNull(),
					email: text("email").notNull().unique(),
					emailVerified: boolean("email_verified").notNull(),
					image: text("image"),
					createdAt: timestamp("created_at").notNull(),
					updatedAt: timestamp("updated_at").notNull(),
     role: varchar("role", { length: 20 }).default("student"),
     banned: boolean("banned").default(false),
     banReason: text("ban_reason"),
     banExpires: timestamp("ban_expires"),
				});

export const session = pgTable("session", {
					id: text("id").primaryKey(),
					expiresAt: timestamp("expires_at").notNull(),
					token: text("token").notNull().unique(),
					createdAt: timestamp("created_at").notNull(),
					updatedAt: timestamp("updated_at").notNull(),
					ipAddress: text("ip_address"),
					userAgent: text("user_agent"),
					userId: text("user_id").notNull().references(() => user.id),
					impersonatedBy: text("impersonated_by"),
				});

export const account = pgTable("account", {
					id: text("id").primaryKey(),
					accountId: text("account_id").notNull(),
					providerId: text("provider_id").notNull(),
					userId: text("user_id").notNull().references(() => user.id),
					accessToken: text("access_token"),
					refreshToken: text("refresh_token"),
					idToken: text("id_token"),
					accessTokenExpiresAt: timestamp("access_token_expires_at"),
					refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
					scope: text("scope"),
					password: text("password"),
					createdAt: timestamp("created_at").notNull(),
					updatedAt: timestamp("updated_at").notNull()
				});

export const verification = pgTable("verification", {
					id: text("id").primaryKey(),
					identifier: text("identifier").notNull(),
					value: text("value").notNull(),
					expiresAt: timestamp("expires_at").notNull(),
					createdAt: timestamp("created_at"),
					updatedAt: timestamp("updated_at")
				});

// Core Entities

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id), // Nullable for bulk imports or non-login employees
  type: varchar("type", { length: 50 }).notNull(), // 'Guru' or 'Tenaga Kependidikan'
  name: varchar("name", { length: 150 }).notNull(),
  nip: varchar("nip", { length: 50 }).unique().notNull(), // NIP/NUPTK/No. Identitas
  rank: varchar("rank", { length: 50 }), // Pangkat
  grade: varchar("grade", { length: 50 }), // Golongan
  position: varchar("position", { length: 100 }), // Nama Jabatan
  gender: varchar("gender", { length: 20 }), // Laki-laki, Perempuan
  birthPlace: varchar("birth_place", { length: 100 }),
  birthDate: date("birth_date"),
  photoUrl: varchar("photo_url", { length: 255 }), // Ditambahkan untuk menyimpan URL foto
  task: varchar("task", { length: 100 }), // Tugas / Guru Mapel apa
  kodeGuru: varchar("kode_guru", { length: 10 }), // Kode singkat untuk jadwal Excel (1, 2, 3...)
  // Pembatasan (scheduling constraints)
  maxGapsPerWeek: integer("max_gaps_per_week"),         // Batas jumlah jam jeda per minggu
  maxTeachingDays: integer("max_teaching_days"),        // Batas hari mengajar
  minLessonsPerDay: integer("min_lessons_per_day"),     // Min pelajaran per hari
  maxLessonsPerDay: integer("max_lessons_per_day"),     // Max pelajaran per hari
  maxConsecutiveLessons: integer("max_consecutive_lessons"), // Max pelajaran berurutan
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 50 }).notNull(),
  homeroomTeacherId: uuid("homeroom_teacher_id").references(() => employees.id),
  // Pembatasan (scheduling constraints)
  lunchBreakStart: integer("lunch_break_start"),    // jam ke- mulai istirahat siang
  lunchBreakEnd: integer("lunch_break_end"),        // jam ke- selesai istirahat siang
  minLessonsPerDay: integer("min_lessons_per_day"), // min jumlah pelajaran per hari
  maxLessonsPerDay: integer("max_lessons_per_day"), // max jumlah pelajaran per hari
  numTeachingDays: integer("num_teaching_days"),    // jumlah hari mengajar per minggu
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// ═══ Class Slot Availability (Waktu Kosong Kelas per Hari × Jam) ══════════════

export const classSlotAvailability = pgTable("class_slot_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 1=Senin..6=Sabtu
  jamKe: integer("jam_ke").notNull(), // 1, 2, 3, ...
  status: varchar("status", { length: 20 }).notNull().default("available"), // 'available' | 'conditional' | 'unavailable'
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studentProfiles = pgTable("student_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id), // Made nullable for bulk import
  fullName: varchar("full_name", { length: 255 }), // Added for standalone student data
  nis: varchar("nis", { length: 50 }),
  nisn: varchar("nisn", { length: 50 }).unique().notNull(),
  nik: varchar("nik", { length: 50 }),
  noKk: varchar("no_kk", { length: 50 }),
  classId: uuid("class_id").references(() => classes.id),
  className: varchar("class_name", { length: 50 }), // Kept for legacy compatibility
  birthPlace: varchar("birth_place", { length: 100 }),
  birthDate: date("birth_date"),
  gender: varchar("gender", { length: 20 }), // Laki-laki, Perempuan
  agama: varchar("agama", { length: 50 }),
  kewarganegaraan: varchar("kewarganegaraan", { length: 50 }),
  anakKe: integer("anak_ke"),
  jumlahSaudara: integer("jumlah_saudara"),
  bahasaSehariHari: varchar("bahasa_sehari_hari", { length: 100 }),
  golonganDarah: varchar("golongan_darah", { length: 10 }),
  tempatTinggal: varchar("tempat_tinggal", { length: 100 }),
  jarakSekolahKm: varchar("jarak_sekolah_km", { length: 50 }),
  address: text("address"),
  photoUrl: varchar("photo_url", { length: 255 }),
  status: varchar("status", { length: 20 }).default("active"),
  isNotable: boolean("is_notable").default(false), // Ditambahkan untuk Alumni Berprestasi
  createdSource: varchar("created_source", { length: 50 }).default("student_module"), // student_module or nis_module
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const parentProfiles = pgTable("parent_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // ayah, ibu, wali
  name: varchar("name", { length: 255 }).notNull(),
  relationship: varchar("relationship", { length: 100 }), // for wali
  educationLevel: varchar("education_level", { length: 100 }),
  occupation: varchar("occupation", { length: 150 }),
  phone: varchar("phone", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const educationHistory = pgTable("education_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  previousSchoolName: varchar("previous_school_name", { length: 255 }),
  sttbDate: date("sttb_date"),
  sttbNumber: varchar("sttb_number", { length: 100 }),
  transferFromSchool: varchar("transfer_from_school", { length: 255 }),
  transferFromClass: varchar("transfer_from_class", { length: 50 }),
  transferAcceptDate: date("transfer_accept_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const physicalData = pgTable("physical_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  semester: integer("semester").notNull(),
  academicYear: varchar("academic_year", { length: 50 }),
  heightCm: integer("height_cm"),
  weightKg: integer("weight_kg"),
  hearingCondition: varchar("hearing_condition", { length: 100 }),
  visionCondition: varchar("vision_condition", { length: 100 }),
  dentalCondition: varchar("dental_condition", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// ═══════════════════════════════════════════════════════════════
// Buku Induk: Nilai Rapor (Matrix per Semester per Tahun Ajaran)
// ═══════════════════════════════════════════════════════════════

export const bukuIndukGrades = pgTable("buku_induk_grades", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  subjectName: varchar("subject_name", { length: 150 }).notNull(),
  semester: integer("semester").notNull(), // 1-12 (semester 1 kelas X s/d semester 2 kelas XII)
  academicYear: varchar("academic_year", { length: 20 }), // "2025/2026"
  classLevel: varchar("class_level", { length: 50 }), // "X", "XI", "XII"
  score: varchar("score", { length: 10 }), // nilai angka atau huruf
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// ═══════════════════════════════════════════════════════════════
// Buku Induk: Ketidakhadiran per Semester (Sakit, Izin, Alpa)
// ═══════════════════════════════════════════════════════════════

export const bukuIndukAttendance = pgTable("buku_induk_attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  semester: integer("semester").notNull(),
  academicYear: varchar("academic_year", { length: 20 }),
  classLevel: varchar("class_level", { length: 50 }),
  sick: integer("sick").default(0),
  excused: integer("excused").default(0),
  unexcused: integer("unexcused").default(0),
  promotionStatus: varchar("promotion_status", { length: 50 }), // "Naik ke Kls ..." / "Tidak Naik"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// ═══════════════════════════════════════════════════════════════
// Buku Induk: Kegiatan Ekstrakurikuler per Semester
// ═══════════════════════════════════════════════════════════════

export const bukuIndukExtracurriculars = pgTable("buku_induk_extracurriculars", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  activityName: varchar("activity_name", { length: 200 }).notNull(),
  semester: integer("semester").notNull(),
  academicYear: varchar("academic_year", { length: 20 }),
  classLevel: varchar("class_level", { length: 50 }),
  predicate: varchar("predicate", { length: 50 }), // A/B/C/D or Sangat Baik/Baik/Cukup
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// ═══════════════════════════════════════════════════════════════
// Buku Induk: Projek Penguatan Profil Pelajar Pancasila (P5)
// Hanya capaian akhir Fase, bukan per semester
// ═══════════════════════════════════════════════════════════════

export const bukuIndukP5 = pgTable("buku_induk_p5", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  fase: varchar("fase", { length: 10 }).notNull(), // "E", "F"
  projectName: varchar("project_name", { length: 255 }).notNull(),
  dimension: varchar("dimension", { length: 200 }), // Dimensi Pancasila
  predicate: varchar("predicate", { length: 50 }), // SB/B/C/K
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// ═══════════════════════════════════════════════════════════════
// Buku Induk: Status Akhir (Kelulusan / Mutasi Keluar)
// ═══════════════════════════════════════════════════════════════

export const bukuIndukFinalStatus = pgTable("buku_induk_final_status", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  statusType: varchar("status_type", { length: 50 }).notNull(), // 'Lulus', 'Pindah', 'Keluar'
  
  // Fields untuk Lulus
  graduationYear: varchar("graduation_year", { length: 20 }),
  ijazahNumber: varchar("ijazah_number", { length: 150 }).unique(),
  continueTo: varchar("continue_to", { length: 255 }), // Sekolah/Universitas/Bekerja
  
  // Fields untuk Pindah
  leaveClass: varchar("leave_class", { length: 50 }),
  destinationSchool: varchar("destination_school", { length: 255 }),
  destinationClass: varchar("destination_class", { length: 50 }),
  
  // Fields untuk Keluar
  leaveReason: text("leave_reason"),
  leaveDate: date("leave_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// ═══════════════════════════════════════════════════════════════
// Rekam Mutasi (Masuk, Keluar, Internal)
// ═══════════════════════════════════════════════════════════════

export const mutationRecords = pgTable("mutation_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),        // 'masuk' | 'keluar' | 'internal'
  reason: text("reason"),                                  // Alasan mutasi
  fromSchool: varchar("from_school", { length: 255 }),     // Sekolah asal (untuk masuk)
  toSchool: varchar("to_school", { length: 255 }),         // Sekolah tujuan (untuk keluar)
  fromClass: varchar("from_class", { length: 100 }),       // Kelas asal (untuk internal)
  toClass: varchar("to_class", { length: 100 }),           // Kelas tujuan (untuk internal)
  suratNumber: varchar("surat_number", { length: 100 }),   // Nomor surat pindah
  effectiveDate: date("effective_date"),                   // Tanggal efektif mutasi
  status: varchar("status", { length: 20 }).default("aktif"), // aktif | draft | batal
  documentUrl: varchar("document_url", { length: 500 }),   // File scan surat
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// ═══════════════════════════════════════════════════════════════
// Buku Induk: Mapel per Kelas
// ═══════════════════════════════════════════════════════════════

export const bukuIndukClassMapels = pgTable("buku_induk_class_mapels", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }).notNull().unique(),
  mapels: jsonb("mapels").default([]), // Array of strings e.g. ["Pend. Agama", "Matematika", ...]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const identityRevisions = pgTable("identity_revisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentProfileId: uuid("student_profile_id").references(() => studentProfiles.id).notNull(),
  field: varchar("field", { length: 50 }).notNull(),
  oldValue: varchar("old_value", { length: 255 }),
  newValue: varchar("new_value", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, approved, rejected
  requestDate: timestamp("request_date").defaultNow()
});

export const cardSettings = pgTable("card_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolName: varchar("school_name", { length: 100 }).notNull(),
  schoolSubtitle: varchar("school_subtitle", { length: 150 }).notNull(),
  schoolLogoUrl: varchar("school_logo_url", { length: 255 }),
  academicYear: varchar("academic_year", { length: 50 }).notNull(),
  selectedTemplate: varchar("selected_template", { length: 50 }).default("classic-blue"),
  orientation: varchar("orientation", { length: 20 }).default("vertical"),
  showQrCode: boolean("show_qr_code").default(true),
  qrCodeContent: varchar("qr_code_content", { length: 50 }).default("nisn"),
  termsText: text("terms_text"),
  headmasterSignatureUrl: text("headmaster_signature_url"),
  kemenagLogoUrl: text("kemenag_logo_url"),
  schoolStampUrl: text("school_stamp_url"),
  customTemplateHorizontalFrontUrl: text("custom_template_horizontal_front_url"),
  customTemplateHorizontalBackUrl: text("custom_template_horizontal_back_url"),
  customTemplateVerticalFrontUrl: text("custom_template_vertical_front_url"),
  customTemplateVerticalBackUrl: text("custom_template_vertical_back_url"),
});

export const cardPrintHistory = pgTable("card_print_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  printType: varchar("print_type", { length: 20 }).notNull().default("single"), // single, batch
  studentCount: integer("student_count").notNull().default(1),
  classFilter: varchar("class_filter", { length: 100 }),
  orientation: varchar("orientation", { length: 20 }).default("vertical"),
  templateUsed: varchar("template_used", { length: 50 }).default("classic-blue"),
  studentNames: text("student_names"), // comma-separated for quick display
  printedBy: text("printed_by").references(() => user.id),
  printedAt: timestamp("printed_at").defaultNow(),
});

export const newsAnnouncements = pgTable("news_announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // Academic, Event, Alert, General
  authorId: text("author_id"),
  publishDate: timestamp("publish_date").defaultNow(),
  status: varchar("status", { length: 20 }).default("Draft") // Published, Draft
});

export const classSchedules = pgTable("class_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  time: time("time").notNull(),
  ampm: varchar("ampm", { length: 2 }).notNull(), // AM, PM
  subject: varchar("subject", { length: 100 }).notNull(),
  location: varchar("location", { length: 100 }),
  teacherId: text("teacher_id").references(() => user.id).notNull(),
  className: varchar("class_name", { length: 50 }).notNull(),
  isActive: boolean("is_active").default(true)
});

export const galleryImages = pgTable("gallery_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  title: varchar("title", { length: 150 }).notNull(),
  description: text("description"),
  uploadedBy: text("uploaded_by"),
  uploadedAt: timestamp("uploaded_at").defaultNow()
});

export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  subject: varchar("subject", { length: 150 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const siteSettings = pgTable("site_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).unique().notNull(),
  value: text("value"),
  group: varchar("group", { length: 50 }),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id),
  action: varchar("action", { length: 50 }).notNull(), // login, create_user, ban_user, set_role, reset_password, etc.
  targetType: varchar("target_type", { length: 50 }), // user, session, settings
  targetId: text("target_id"),
  details: text("details"), // JSON string with extra info
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow()
});

// Dynamic Pages
export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  content: text("content").notNull(),
  layout: text("layout"), // Added for section-based layouts (JSON string)
  coverImage: text("cover_image"),
  metaDescription: text("meta_description"),
  authorId: text("author_id").references(() => user.id),
  status: varchar("status", { length: 20 }).default("Draft"), // Published, Draft
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Dynamic Navigation Menus
export const menus = pgTable("menus", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id"), // Self-referencing column for submenus. Added manually below in relations if needed.
  label: varchar("label", { length: 150 }).notNull(),
  url: varchar("url", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 255 }), // Increased to 255 to support absolute image URLs
  order: integer("order").default(0).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// E-Office (Surat Menyurat)
export const jenisSurats = pgTable("jenis_surats", {
  id: uuid("id").primaryKey().defaultRandom(),
  namaJenis: varchar("nama_jenis", { length: 150 }).notNull(), // e.g., Surat Dinas, SK, Surat Tugas
  kodeJenis: varchar("kode_jenis", { length: 50 }).notNull(), // e.g., SD, SK
  formatPenomoran: text("format_penomoran").notNull(), // e.g. "Nomor {{nomor_urut}} Tahun {{tahun}}"
  butuhKka: boolean("butuh_kka").default(true),
  butuhDerajat: boolean("butuh_derajat").default(true),
  aktif: boolean("aktif").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const suratKeluars = pgTable("surat_keluars", {
  id: uuid("id").primaryKey().defaultRandom(),
  jenisSuratId: uuid("jenis_surat_id").references(() => jenisSurats.id).notNull(),
  nomorUrut: integer("nomor_urut").notNull(),
  nomorLengkap: varchar("nomor_lengkap", { length: 255 }).unique().notNull(),
  derajatKode: varchar("derajat_kode", { length: 20 }), // SR, R, B
  kodeSatker: varchar("kode_satker", { length: 50 }),
  kkaKode: varchar("kka_kode", { length: 50 }),
  bulan: varchar("bulan", { length: 2 }),
  tahun: varchar("tahun", { length: 4 }).notNull(),
  perihal: text("perihal").notNull(),
  tujuan: varchar("tujuan", { length: 255 }),
  fileUrl: varchar("file_url"),
  tanggalGenerate: timestamp("tanggal_generate").defaultNow(),
  userIdPengambil: text("user_id_pengambil").references(() => user.id)
});

export const suratMasuks = pgTable("surat_masuk", {
  id: uuid("id").primaryKey().defaultRandom(),
  nomorUrut: integer("nomor_urut"),
  nomorAgenda: varchar("nomor_agenda", { length: 50 }).unique().notNull(),
  nomorSuratAsli: varchar("nomor_surat_asli", { length: 150 }).notNull(),
  tanggalSurat: date("tanggal_surat").notNull(),
  tanggalDiterima: timestamp("tanggal_diterima").defaultNow(),
  tahun: varchar("tahun", { length: 4 }), // Annual reset support
  pengirim: varchar("pengirim", { length: 255 }).notNull(),
  perihal: text("perihal").notNull(),
  sifat: varchar("sifat", { length: 50 }), // Sangat Segera, Segera, Biasa
  derajat: varchar("derajat", { length: 20 }), // SR, R, B
  fileUrl: varchar("file_url"),
  userIdPenerima: text("user_id_penerima").references(() => user.id)
});

export const masterKkas = pgTable("master_kka", {
  id: uuid("id").primaryKey().defaultRandom(),
  kode: varchar("kode", { length: 50 }).unique().notNull(),
  keterangan: varchar("keterangan", { length: 255 }).notNull(),
  aktif: boolean("aktif").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

// E-PTSP (Layanan Publik Terpadu)
export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: varchar("ticket_id", { length: 50 }).unique().notNull(),
  type: varchar("type", { length: 100 }).notNull(), // e.g. "Surat Keterangan", "Legalisir Online"
  applicantName: varchar("applicant_name", { length: 255 }).notNull(),
  nisn: varchar("nisn", { length: 50 }),
  birthPlace: varchar("birth_place", { length: 100 }),
  birthDate: date("birth_date"),
  address: text("address"),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  purpose: text("purpose"),
  attachmentUrl: varchar("attachment_url", { length: 500 }),
  formData: text("form_data"), // JSON string for service-specific dynamic fields
  status: varchar("status", { length: 20 }).default("pending"), // pending, processing, completed, rejected
  adminReply: text("admin_reply"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// School Events Calendar (Kalender Pendidikan)
export const schoolEvents = pgTable("school_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  eventDate: date("event_date").notNull(),
  endDate: date("end_date"),  // optional, for multi-day events
  category: varchar("category", { length: 50 }).default("general").notNull(),
  // Categories: holiday, semester_ganjil, semester_genap, first_day, orientation,
  // exam_sumatif, exam_madrasah, exam_other, report_filling, report_distribution, general
  color: varchar("color", { length: 20 }),  // optional override per event
  academicYear: varchar("academic_year", { length: 20 }).notNull(), // e.g. "2025/2026"
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// NIS Management (Nomor Induk Siswa)
export const academicYears = pgTable("academic_years", {
  id: uuid("id").primaryKey().defaultRandom(),
  tahunAjaran: varchar("tahun_ajaran", { length: 20 }).unique().notNull(), // "2025/2026"
  kodeTahun: varchar("kode_tahun", { length: 4 }).notNull(),              // "25"
  tanggalMulai: date("tanggal_mulai").notNull(),
  tanggalSelesai: date("tanggal_selesai").notNull(),
  isActive: boolean("is_active").default(false),
  lastNisSequence: integer("last_nis_sequence").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const nisBatches = pgTable("nis_batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  academicYearId: uuid("academic_year_id").references(() => academicYears.id).notNull(),
  jumlahSiswa: integer("jumlah_siswa").notNull(),
  startSequence: integer("start_sequence").notNull(),
  endSequence: integer("end_sequence").notNull(),
  operator: text("operator").references(() => user.id),
  status: varchar("status", { length: 20 }).default("completed"),
  createdAt: timestamp("created_at").defaultNow()
});

export const nisActivityLogs = pgTable("nis_activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: varchar("action", { length: 50 }).notNull(), // batch_generate, single_assign, edit, rollback
  details: text("details"),
  studentId: uuid("student_id").references(() => studentProfiles.id),
  nisValue: varchar("nis_value", { length: 50 }),
  userId: text("user_id").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow()
});

// Exam Management (Manajemen Ujian)
export const ujian = pgTable("ujian", {
  id: uuid("id").primaryKey().defaultRandom(),
  namaUjian: varchar("nama_ujian", { length: 255 }).notNull(),
  jenis: varchar("jenis", { length: 50 }).notNull(), // PTS, PAS, US, UMBK, or custom
  tahunAjaran: varchar("tahun_ajaran", { length: 20 }).notNull(),
  semester: varchar("semester", { length: 10 }).notNull(), // Ganjil, Genap
  tanggalMulai: date("tanggal_mulai").notNull(),
  tanggalSelesai: date("tanggal_selesai").notNull(),
  ketuaPanitiaId: uuid("ketua_panitia_id").references(() => employees.id),
  status: varchar("status", { length: 20 }).default("aktif"), // aktif, selesai, draft
  pengaturan: jsonb("pengaturan").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const panitiaUjian = pgTable("panitia_ujian", {
  id: uuid("id").primaryKey().defaultRandom(),
  ujianId: uuid("ujian_id").references(() => ujian.id, { onDelete: "cascade" }).notNull(),
  pegawaiId: uuid("pegawai_id").references(() => employees.id).notNull(),
  jabatan: varchar("jabatan", { length: 100 }).notNull(), // Ketua, Sekretaris, Anggota, etc.
  urutan: integer("urutan").default(0),
  createdAt: timestamp("created_at").defaultNow()
});

export const jadwalUjian = pgTable("jadwal_ujian", {
  id: uuid("id").primaryKey().defaultRandom(),
  ujianId: uuid("ujian_id").references(() => ujian.id, { onDelete: "cascade" }).notNull(),
  tanggal: date("tanggal").notNull(),
  waktuMulai: time("waktu_mulai").notNull(),
  waktuSelesai: time("waktu_selesai").notNull(),
  subjectId: uuid("subject_id").references(() => masterSubjects.id),
  kelas: text("kelas"), // comma-separated class names or JSON array
  createdAt: timestamp("created_at").defaultNow()
});

export const ruangUjian = pgTable("ruang_ujian", {
  id: uuid("id").primaryKey().defaultRandom(),
  ujianId: uuid("ujian_id").references(() => ujian.id, { onDelete: "cascade" }).notNull(),
  namaRuang: varchar("nama_ruang", { length: 100 }).notNull(),
  kapasitas: integer("kapasitas").notNull().default(30),
  createdAt: timestamp("created_at").defaultNow()
});

export const penugasanPengawas = pgTable("penugasan_pengawas", {
  id: uuid("id").primaryKey().defaultRandom(),
  jadwalId: uuid("jadwal_id").references(() => jadwalUjian.id, { onDelete: "cascade" }).notNull(),
  ruangId: uuid("ruang_id").references(() => ruangUjian.id, { onDelete: "cascade" }).notNull(),
  pengawasId: uuid("pengawas_id").references(() => employees.id).notNull(),
  kodeLabel: varchar("kode_label", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow()
});

export const distribusiPeserta = pgTable("distribusi_peserta", {
  id: uuid("id").primaryKey().defaultRandom(),
  ujianId: uuid("ujian_id").references(() => ujian.id, { onDelete: "cascade" }).notNull(),
  ruangId: uuid("ruang_id").references(() => ruangUjian.id, { onDelete: "cascade" }).notNull(),
  siswaId: uuid("siswa_id").references(() => studentProfiles.id).notNull(),
  nomorMeja: integer("nomor_meja"),
  createdAt: timestamp("created_at").defaultNow()
});

// PMB / SIMPMB (Penerimaan Murid Baru)
export const ppdbConfig = pgTable("ppdb_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  tahunAjaran: varchar("tahun_ajaran", { length: 20 }).notNull(), // "2026/2027"
  namaSistem: varchar("nama_sistem", { length: 100 }).default("SIMPMB 2026"),
  isActive: boolean("is_active").default(true),
  tanggalPengumuman: timestamp("tanggal_pengumuman"),
  batasDaftarUlang: timestamp("batas_daftar_ulang"),
  nomorSk: varchar("nomor_sk", { length: 100 }),
  namaSk: text("nama_sk"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const ppdbJalur = pgTable("ppdb_jalur", {
  id: uuid("id").primaryKey().defaultRandom(),
  configId: uuid("config_id").references(() => ppdbConfig.id, { onDelete: "cascade" }).notNull(),
  namaJalur: varchar("nama_jalur", { length: 50 }).notNull(), // "PRESTASI" | "REGULER"
  kuota: integer("kuota").notNull().default(0),
  nilaiMinimum: integer("nilai_minimum").notNull().default(70),
  requiresPrestasi: boolean("requires_prestasi").default(false),
  jadwalBuka: timestamp("jadwal_buka"),
  jadwalTutup: timestamp("jadwal_tutup"),
  persyaratan: text("persyaratan"), // JSON string or plain text
  deskripsi: text("deskripsi"),
  bobotNilai: integer("bobot_nilai").default(100), // percentage
  bobotPrestasi: integer("bobot_prestasi").default(0), // percentage
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const ppdbPendaftar = pgTable("ppdb_pendaftar", {
  id: uuid("id").primaryKey().defaultRandom(),
  jalurId: uuid("jalur_id").references(() => ppdbJalur.id).notNull(),
  noPendaftaran: varchar("no_pendaftaran", { length: 50 }).unique().notNull(), // PPDB2026/00001
  nisn: varchar("nisn", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  status: varchar("status", { length: 30 }).default("menunggu"), // menunggu, terverifikasi, diterima, ditolak, cadangan
  catatanAdmin: text("catatan_admin"),
  nilaiAkhir: varchar("nilai_akhir", { length: 10 }), // calculated final score
  ranking: integer("ranking"),
  validationCode: varchar("validation_code", { length: 100 }),
  tglDaftar: timestamp("tgl_daftar").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const ppdbDataDiri = pgTable("ppdb_data_diri", {
  id: uuid("id").primaryKey().defaultRandom(),
  pendaftarId: uuid("pendaftar_id").references(() => ppdbPendaftar.id, { onDelete: "cascade" }).notNull(),
  nik: varchar("nik", { length: 20 }).notNull(),
  namaLengkap: varchar("nama_lengkap", { length: 255 }).notNull(),
  tempatLahir: varchar("tempat_lahir", { length: 100 }).notNull(),
  tanggalLahir: date("tanggal_lahir").notNull(),
  jenisKelamin: varchar("jenis_kelamin", { length: 20 }).notNull(), // Laki-laki, Perempuan
  alamat: text("alamat").notNull(),
  namaAyah: varchar("nama_ayah", { length: 255 }),
  pekerjaanAyah: varchar("pekerjaan_ayah", { length: 100 }),
  namaIbu: varchar("nama_ibu", { length: 255 }),
  pekerjaanIbu: varchar("pekerjaan_ibu", { length: 100 }),
  noHpOrtu: varchar("no_hp_ortu", { length: 20 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const ppdbDataSekolah = pgTable("ppdb_data_sekolah", {
  id: uuid("id").primaryKey().defaultRandom(),
  pendaftarId: uuid("pendaftar_id").references(() => ppdbPendaftar.id, { onDelete: "cascade" }).notNull(),
  npsn: varchar("npsn", { length: 20 }),
  namaSekolah: varchar("nama_sekolah", { length: 255 }).notNull(),
  statusSekolah: varchar("status_sekolah", { length: 20 }).notNull(), // Negeri, Swasta
  alamatSekolah: text("alamat_sekolah"),
  tahunLulus: integer("tahun_lulus").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const ppdbNilaiRaport = pgTable("ppdb_nilai_raport", {
  id: uuid("id").primaryKey().defaultRandom(),
  pendaftarId: uuid("pendaftar_id").references(() => ppdbPendaftar.id, { onDelete: "cascade" }).notNull(),
  semester: integer("semester").notNull(), // 1-5
  bIndonesia: varchar("b_indonesia", { length: 5 }),
  bInggris: varchar("b_inggris", { length: 5 }),
  matematika: varchar("matematika", { length: 5 }),
  ipa: varchar("ipa", { length: 5 }),
  ips: varchar("ips", { length: 5 }),
  rataRata: varchar("rata_rata", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow()
});

export const ppdbPrestasi = pgTable("ppdb_prestasi", {
  id: uuid("id").primaryKey().defaultRandom(),
  pendaftarId: uuid("pendaftar_id").references(() => ppdbPendaftar.id, { onDelete: "cascade" }).notNull(),
  jenis: varchar("jenis", { length: 50 }).notNull(), // Akademik, Non-Akademik
  tingkat: varchar("tingkat", { length: 50 }).notNull(), // Kabupaten, Provinsi, Nasional
  namaKegiatan: varchar("nama_kegiatan", { length: 255 }).notNull(),
  peringkat: varchar("peringkat", { length: 50 }), // Juara 1, 2, 3, Harapan
  tahun: integer("tahun"),
  fileSertifikat: varchar("file_sertifikat", { length: 500 }),
  bobotNilai: varchar("bobot_nilai", { length: 10 }), // calculated
  createdAt: timestamp("created_at").defaultNow()
});

// Custom Tests / Ujian Internal (Ditambahkan sesuai revisi)
export const ppdbTesConfig = pgTable("ppdb_tes_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  jalurId: uuid("jalur_id").references(() => ppdbJalur.id, { onDelete: "cascade" }).notNull(),
  namaTes: varchar("nama_tes", { length: 150 }).notNull(),
  bobot: integer("bobot").notNull().default(10),
  isActive: boolean("is_active").default(true),
  pengujiId: text("penguji_id").references(() => user.id), // Tying test to specific examiner
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const ppdbNilaiTes = pgTable("ppdb_nilai_tes", {
  id: uuid("id").primaryKey().defaultRandom(),
  pendaftarId: uuid("pendaftar_id").references(() => ppdbPendaftar.id, { onDelete: "cascade" }).notNull(),
  tesConfigId: uuid("tes_config_id").references(() => ppdbTesConfig.id, { onDelete: "cascade" }).notNull(),
  nilai: integer("nilai").notNull().default(0), // e.g. 0-100
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const ppdbDokumen = pgTable("ppdb_dokumen", {
  id: uuid("id").primaryKey().defaultRandom(),
  pendaftarId: uuid("pendaftar_id").references(() => ppdbPendaftar.id, { onDelete: "cascade" }).notNull(),
  jenisDokumen: varchar("jenis_dokumen", { length: 50 }).notNull(), // SKL, KK, AKTA, FOTO
  filePath: varchar("file_path", { length: 500 }).notNull(),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const ppdbDaftarUlang = pgTable("ppdb_daftar_ulang", {
  id: uuid("id").primaryKey().defaultRandom(),
  pendaftarId: uuid("pendaftar_id").references(() => ppdbPendaftar.id, { onDelete: "cascade" }).unique().notNull(),
  buktiPembayaranUrl: varchar("bukti_pembayaran_url", { length: 500 }),
  ijazahUrl: varchar("ijazah_url", { length: 500 }),
  kkUrl: varchar("kk_url", { length: 500 }),
  kipUrl: varchar("kip_url", { length: 500 }),
  photoUrl: varchar("photo_url", { length: 500 }),
  ukuranBaju: varchar("ukuran_baju", { length: 10 }), // S, M, L, XL, XXL
  ukuranCelana: varchar("ukuran_celana", { length: 50 }),
  status: varchar("status", { length: 30 }).default("menunggu_validasi"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Pengolahan Nilai Ijazah Kelas XII
export const ijazahSettings = pgTable("ijazah_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  academicYearId: uuid("academic_year_id").references(() => academicYears.id).notNull(),
  reportWeight: integer("report_weight").default(60), // Persentase
  examWeight: integer("exam_weight").default(40), // Persentase
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const ijazahSubjects = pgTable("ijazah_subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 150 }).notNull(),
  shortName: varchar("short_name", { length: 20 }), // Singkatan mapel untuk header Excel (e.g. "QH" for "Al-Qur'an Hadits")
  group: varchar("group", { length: 50 }).notNull(), // Kelompok A, Kelompok B, Muatan Lokal, Mapel Pilihan
  semester: varchar("semester", { length: 20 }).default("global"), // Deprecated, kept for backward compat temporarily
  orderNum: integer("order_num").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const ijazahSubjectMappings = pgTable("ijazah_subject_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").references(() => ijazahSubjects.id, { onDelete: "cascade" }).notNull(),
  classIds: jsonb("class_ids").default([]), // array of strings (class UUIDs). Empty means applies to all classes.
  sem1: boolean("sem1").default(false),
  sem2: boolean("sem2").default(false),
  sem3: boolean("sem3").default(false),
  sem4: boolean("sem4").default(false),
  sem5: boolean("sem5").default(false),
  um: boolean("um").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const ijazahGrades = pgTable("ijazah_grades", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  subjectId: uuid("subject_id").references(() => ijazahSubjects.id, { onDelete: "cascade" }).notNull(),
  semester1: integer("semester_1"), 
  semester2: integer("semester_2"),
  semester3: integer("semester_3"),
  semester4: integer("semester_4"),
  semester5: integer("semester_5"),
  examScore: integer("exam_score"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Per-class subject selection persistence for Ekspor Leger & Ijazah
export const ijazahExportSelections = pgTable("ijazah_export_selections", {
  id: uuid("id").primaryKey().defaultRandom(),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }).notNull().unique(),
  selections: jsonb("selections").default([]), // Array of { name: string, order: number }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Attendance / Presensi Siswa
export const attendanceRecords = pgTable("attendance_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  classId: uuid("class_id").references(() => classes.id),
  date: date("date").notNull(),
  checkIn: time("check_in"),          // jam masuk
  checkOut: time("check_out"),        // jam pulang
  status: varchar("status", { length: 20 }).notNull(), // Hadir, Terlambat, Alpa, Sakit, Izin, Bolos
  method: varchar("method", { length: 20 }).default("manual"), // qr_scan, manual, usb_scanner, system
  note: text("note"),
  recordedBy: text("recorded_by").references(() => user.id), // nullable for public scanner
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const attendanceSettings = pgTable("attendance_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  academicYearId: uuid("academic_year_id").references(() => academicYears.id),
  checkInTime: time("check_in_time").notNull(),   // e.g. 06:30
  lateTime: time("late_time").notNull(),           // e.g. 07:30
  checkOutTime: time("check_out_time").notNull(),  // e.g. 13:00
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// ═══════════════════════════════════════════════════════════════
// Jurnal Mengajar (Teaching Journal / KBM)
// ═══════════════════════════════════════════════════════════════

// Master jadwal mengajar guru (dikelola admin)
export const teachingSubjects = pgTable("teaching_subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  classId: uuid("class_id").references(() => classes.id).notNull(),
  subjectId: uuid("subject_id").references(() => masterSubjects.id),
  dayOfWeek: integer("day_of_week").notNull(), // 1=Senin, 2=Selasa, ... 6=Sabtu
  jamKe: varchar("jam_ke", { length: 20 }), // "1-2", "3-4", etc.
  waktuMulai: time("waktu_mulai"),
  waktuSelesai: time("waktu_selesai"),
  semester: varchar("semester", { length: 10 }).default("ganjil"), // ganjil, genap
  tahunAjaran: varchar("tahun_ajaran", { length: 20 }), // "2025/2026"
  isActive: boolean("is_active").default(true),
  kbmGenerated: boolean("kbm_generated").default(false), // true if auto-generated from KBM scheduler
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Jurnal entry utama
export const jurnalEntries = pgTable("jurnal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  teachingSubjectId: uuid("teaching_subject_id").references(() => teachingSubjects.id),
  teacherId: uuid("teacher_id").references(() => employees.id).notNull(),
  classId: uuid("class_id").references(() => classes.id).notNull(),
  subjectId: uuid("subject_id").references(() => masterSubjects.id),
  date: date("date").notNull(),
  jamKe: varchar("jam_ke", { length: 20 }),
  waktuMulai: time("waktu_mulai"),
  waktuSelesai: time("waktu_selesai"),
  linkRpp: text("link_rpp"), // URL ke dokumen RPP

  // Content
  materiPembelajaran: text("materi_pembelajaran"),
  metode: varchar("metode", { length: 255 }), // Metode pembelajaran
  capaianPembelajaran: text("capaian_pembelajaran"),
  kendalaDanSolusi: text("kendala_dan_solusi"),

  // Catatan & Evaluasi
  catatan: text("catatan"),
  evaluasi: text("evaluasi"),

  // Attendance summary (auto-calculated dari jurnalStudentAttendance)
  jumlahHadir: integer("jumlah_hadir").default(0),
  jumlahIzin: integer("jumlah_izin").default(0),
  jumlahSakit: integer("jumlah_sakit").default(0),
  jumlahAlpa: integer("jumlah_alpa").default(0),
  totalSiswa: integer("total_siswa").default(0),

  // Status workflow
  status: varchar("status", { length: 20 }).default("draft"), // draft, submitted, approved, rejected
  approvedBy: text("approved_by").references(() => user.id),
  approvedAt: timestamp("approved_at"),
  rejectionNote: text("rejection_note"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Absensi per mata pelajaran (checklist kehadiran belajar per siswa)
export const jurnalStudentAttendance = pgTable("jurnal_student_attendance", {
  id: uuid("id").primaryKey().defaultRandom(),
  jurnalEntryId: uuid("jurnal_entry_id").references(() => jurnalEntries.id, { onDelete: "cascade" }).notNull(),
  studentId: uuid("student_id").references(() => studentProfiles.id).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // Hadir, Izin, Sakit, Alpa
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow()
});

// Lampiran/dokumentasi jurnal
export const jurnalAttachments = pgTable("jurnal_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  jurnalEntryId: uuid("jurnal_entry_id").references(() => jurnalEntries.id, { onDelete: "cascade" }).notNull(),
  fileType: varchar("file_type", { length: 20 }).notNull(), // photo, video
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileName: varchar("file_name", { length: 255 }),
  fileSize: integer("file_size"), // bytes
  caption: text("caption"),
  createdAt: timestamp("created_at").defaultNow()
});

// Template materi reusable
export const jurnalTemplates = pgTable("jurnal_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id").references(() => employees.id).notNull(),
  subjectName: varchar("subject_name", { length: 150 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Kode mata pelajaran untuk template Excel jadwal
export const jurnalMapelCodes = pgTable("jurnal_mapel_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  kode: varchar("kode", { length: 10 }).notNull().unique(),
  subjectName: varchar("subject_name", { length: 150 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Kelola waktu pelajaran per hari (jam ke berapa mulai & selesai)
export const jurnalTimeSlots = pgTable("jurnal_time_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  dayOfWeek: integer("day_of_week").notNull(), // 1=Senin, 2=Selasa, ... 6=Sabtu
  jamKe: integer("jam_ke").notNull(),           // 1, 2, 3, ... 12
  waktuMulai: time("waktu_mulai").notNull(),    // e.g. 07:00
  waktuSelesai: time("waktu_selesai").notNull(), // e.g. 07:45
  label: varchar("label", { length: 50 }),       // optional: "Istirahat", etc.
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Metode pembelajaran shared — semua guru bisa tambah, semua bisa pakai
export const teachingMethods = pgTable("teaching_methods", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════
// Portal Orang Tua (Parent Portal)
// ═══════════════════════════════════════════════════════════════

export const parentLinks = pgTable("parent_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }).notNull(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  relation: varchar("relation", { length: 20 }).default("wali"), // ayah, ibu, wali
  phone: varchar("phone", { length: 50 }),
  notificationEmail: boolean("notification_email").default(true),
  notificationWa: boolean("notification_wa").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ═══════════════════════════════════════════════════════════════
// Manajemen Pembagian Tugas KBM Guru
// ═══════════════════════════════════════════════════════════════

// Master mata pelajaran untuk KBM
export const kbmSubjects = pgTable("kbm_subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  kode: varchar("kode", { length: 10 }).notNull().unique(),
  nama: varchar("nama", { length: 150 }).notNull(),
  isActive: boolean("is_active").default(true),
  // Scheduler constraint fields
  maxJamKe: integer("max_jam_ke"),                    // null = no restriction, e.g. 6 = only jam 1-6
  minJamKe: integer("min_jam_ke"),                    // null = no restriction, e.g. 5 = only jam 5+
  allowSingleSplit: boolean("allow_single_split").default(false), // can be split to 1 JP (e.g. 3→2+1)
  isHeavy: boolean("is_heavy").default(false),         // heavy subject (no same-day in same class with other heavy)
  customSplitRule: jsonb("custom_split_rule"),          // override split: e.g. {"5": [3,2], "4": [2,2]}
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Distribusi jam mengajar (guru × kelas × mapel per semester)
export const distribusiJam = pgTable("distribusi_jam", {
  id: uuid("id").primaryKey().defaultRandom(),
  academicYearId: uuid("academic_year_id").references(() => academicYears.id).notNull(),
  semester: varchar("semester", { length: 10 }).notNull(), // 'ganjil' | 'genap'
  guruId: uuid("guru_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  kelasId: uuid("kelas_id").references(() => classes.id).notNull(),
  subjectId: uuid("subject_id").references(() => kbmSubjects.id).notNull(),
  jumlahJam: integer("jumlah_jam").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Template jenis tugas tambahan
export const tugasTambahanMaster = pgTable("tugas_tambahan_master", {
  id: uuid("id").primaryKey().defaultRandom(),
  namaTugas: varchar("nama_tugas", { length: 150 }).notNull(),
  kategori: varchar("kategori", { length: 50 }).notNull(), // 'struktural' | 'kurikulum' | 'kesiswaan'
  defaultSetaraJam: integer("default_setara_jam").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assignment tugas tambahan per guru per semester
export const tugasTambahan = pgTable("tugas_tambahan", {
  id: uuid("id").primaryKey().defaultRandom(),
  academicYearId: uuid("academic_year_id").references(() => academicYears.id).notNull(),
  semester: varchar("semester", { length: 10 }).notNull(),
  guruId: uuid("guru_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  masterId: uuid("master_id").references(() => tugasTambahanMaster.id).notNull(),
  keterangan: text("keterangan"),
  setaraJam: integer("setara_jam").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Master ruangan (persiapan Fase 2 scheduler)
export const ruangan = pgTable("ruangan", {
  id: uuid("id").primaryKey().defaultRandom(),
  nama: varchar("nama", { length: 100 }).notNull(),
  tipe: varchar("tipe", { length: 50 }).default("reguler"), // reguler, lab_ipa, lab_agama, lab_komputer, perpustakaan
  kapasitas: integer("kapasitas").default(40),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ═══ KBM Jadwal Version (Snapshot System) ════════════════════════════════════

export const jadwalVersion = pgTable("jadwal_version", {
  id: uuid("id").primaryKey().defaultRandom(),
  academicYearId: uuid("academic_year_id").references(() => academicYears.id).notNull(),
  semester: varchar("semester", { length: 10 }).notNull(),
  nama: varchar("nama", { length: 100 }).notNull(), // "Auto v1", "Manual Edit 19 Mei"
  isAktif: boolean("is_aktif").default(false),
  totalSlots: integer("total_slots").default(0),
  totalFailed: integer("total_failed").default(0),
  qualityScore: integer("quality_score"),
  metadata: jsonb("metadata"), // generateReport, passResults, etc.
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ═══ KBM Jadwal (Phase 2 — Auto Scheduler) ══════════════════════════════════

export const kbmJadwal = pgTable("kbm_jadwal", {
  id: uuid("id").primaryKey().defaultRandom(),
  academicYearId: uuid("academic_year_id").references(() => academicYears.id).notNull(),
  semester: varchar("semester", { length: 10 }).notNull(),
  versionId: uuid("version_id").references(() => jadwalVersion.id, { onDelete: "cascade" }),
  guruId: uuid("guru_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  kelasId: uuid("kelas_id").references(() => classes.id).notNull(),
  subjectId: uuid("subject_id").references(() => kbmSubjects.id).notNull(),
  ruanganId: uuid("ruangan_id").references(() => ruangan.id),
  dayOfWeek: integer("day_of_week").notNull(), // 1=Senin..6=Sabtu
  jamKe: integer("jam_ke").notNull(), // 1, 2, 3, ...
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ═══ Guru Unavailability (Hari Kosong Guru) ══════════════════════════════════

export const guruUnavailability = pgTable("guru_unavailability", {
  id: uuid("id").primaryKey().defaultRandom(),
  guruId: uuid("guru_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  academicYearId: uuid("academic_year_id").references(() => academicYears.id).notNull(),
  semester: varchar("semester", { length: 10 }).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 1=Senin..6=Sabtu
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ═══ Guru Slot Availability (Per Hari × Jam) ═════════════════════════════════

export const guruSlotAvailability = pgTable("guru_slot_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  guruId: uuid("guru_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  academicYearId: uuid("academic_year_id").references(() => academicYears.id).notNull(),
  semester: varchar("semester", { length: 10 }).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 1=Senin..6=Sabtu
  jamKe: integer("jam_ke").notNull(), // 1, 2, 3, ...
  status: varchar("status", { length: 20 }).notNull().default("available"), // 'available' | 'conditional' | 'unavailable'
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ═══ Schedule Config (Konfigurasi Global Scheduler) ══════════════════════════

export const scheduleConfig = pgTable("schedule_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  academicYearId: uuid("academic_year_id").references(() => academicYears.id).notNull(),
  semester: varchar("semester", { length: 10 }).notNull(),
  maxDailyJpThreshold: integer("max_daily_jp_threshold").default(20), // guru with JP > this gets daily limit
  maxDailyJpLimit: integer("max_daily_jp_limit").default(6),          // max JP per day for those gurus
  afternoonStartJam: integer("afternoon_start_jam").default(7),       // jam ke berapa mulai "siang"
  afternoonExcludeFriday: boolean("afternoon_exclude_friday").default(true), // skip friday for afternoon rule
  defaultSplitRules: jsonb("default_split_rules").default('{"2":[2],"3":[3],"4":[2,2],"5":[3,2],"6":[3,3]}'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ═══ Tracer Study (Pelacakan Alumni) ═════════════════════════════════════════

export const tracerStudies = pgTable("tracer_studies", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  targetYear: varchar("target_year", { length: 4 }), // e.g. "2024"
  status: varchar("status", { length: 20 }).default("Aktif"), // Aktif, Selesai
  targetResponses: integer("target_responses").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const tracerResponses = pgTable("tracer_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  studyId: uuid("study_id").references(() => tracerStudies.id, { onDelete: "cascade" }).notNull(),
  studentId: uuid("student_id").references(() => studentProfiles.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 50 }).notNull(), // Bekerja, Kuliah, Wirausaha, Mencari Kerja
  companyOrCampus: varchar("company_or_campus", { length: 255 }),
  description: text("description"),
  payload: jsonb("payload"),
  buktiUrl: varchar("bukti_url", { length: 500 }),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

// Jadwal Tugas Guru
export const masterDutyTypes = pgTable("master_duty_types", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 150 }).notNull(), // e.g., "Pembina Upacara", "Piket Pagi"
  color: varchar("color", { length: 20 }).default("#14b8a6"), // hex color
  icon: varchar("icon", { length: 20 }).default("📋"), // emoji or icon name
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const teacherDuties = pgTable("teacher_duties", {
  id: uuid("id").primaryKey().defaultRandom(),
  dutyDate: date("duty_date").notNull(),
  teacherId: uuid("teacher_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
  dutyTypeId: uuid("duty_type_id").references(() => masterDutyTypes.id, { onDelete: "cascade" }).notNull(),
  notes: text("notes"),
  academicYear: varchar("academic_year", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Master mata pelajaran sentral
export const masterSubjects = pgTable("master_subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  kode: varchar("kode", { length: 20 }).unique().notNull(),
  nama: varchar("nama", { length: 255 }).notNull(),
  shortName: varchar("short_name", { length: 50 }),
  kelompok: varchar("kelompok", { length: 50 }).default("Umum"),
  orderNum: integer("order_num").default(0),
  maxJamKe: integer("max_jam_ke"),
  minJamKe: integer("min_jam_ke"),
  allowSingleSplit: boolean("allow_single_split").default(false),
  isHeavy: boolean("is_heavy").default(false),
  customSplitRule: jsonb("custom_split_rule"),
  // Pembatasan (scheduling constraints)
  doubleLessonsOverBreaks: boolean("double_lessons_over_breaks").default(false),
  canBeOverLunch: boolean("can_be_over_lunch").default(false),
  oncePerDay: boolean("once_per_day").default(false),
  isTemporary: boolean("is_temporary").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ═══ Subject Slot Availability (Waktu Kosong Mapel per Hari × Jam) ════════════

export const subjectSlotAvailability = pgTable("subject_slot_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  subjectId: uuid("subject_id").references(() => masterSubjects.id, { onDelete: "cascade" }).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 1=Senin..6=Sabtu
  jamKe: integer("jam_ke").notNull(), // 1, 2, 3, ...
  status: varchar("status", { length: 20 }).notNull().default("available"), // 'available' | 'conditional' | 'unavailable'
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
