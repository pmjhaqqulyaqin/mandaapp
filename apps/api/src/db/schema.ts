import { pgTable, text, timestamp, boolean, uuid, varchar, date, integer, time } from "drizzle-orm/pg-core";

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
export const studentProfiles = pgTable("student_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id).notNull(),
  nisn: varchar("nisn", { length: 50 }).unique().notNull(),
  className: varchar("class_name", { length: 50 }).notNull(),
  birthPlace: varchar("birth_place", { length: 100 }),
  birthDate: date("birth_date"),
  gender: varchar("gender", { length: 20 }), // Laki-laki, Perempuan
  address: text("address"),
  photoUrl: varchar("photo_url", { length: 255 }),
  status: varchar("status", { length: 20 }).default("active")
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
  qrCodeContent: varchar("qr_code_content", { length: 50 }).default("nisn")
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
  icon: varchar("icon", { length: 50 }), // e.g. 'Home', 'Users', 'BookOpen'
  order: integer("order").default(0).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
