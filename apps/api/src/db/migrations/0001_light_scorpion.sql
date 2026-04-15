CREATE TABLE "academic_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tahun_ajaran" varchar(20) NOT NULL,
	"kode_tahun" varchar(4) NOT NULL,
	"tanggal_mulai" date NOT NULL,
	"tanggal_selesai" date NOT NULL,
	"is_active" boolean DEFAULT false,
	"last_nis_sequence" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "academic_years_tahun_ajaran_unique" UNIQUE("tahun_ajaran")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"action" varchar(50) NOT NULL,
	"target_type" varchar(50),
	"target_id" text,
	"details" text,
	"ip_address" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"major_id" uuid NOT NULL,
	"homeroom_teacher_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "distribusi_peserta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ujian_id" uuid NOT NULL,
	"ruang_id" uuid NOT NULL,
	"siswa_id" uuid NOT NULL,
	"nomor_meja" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"type" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"nip" varchar(50) NOT NULL,
	"rank" varchar(50),
	"grade" varchar(50),
	"position" varchar(100),
	"gender" varchar(20),
	"birth_place" varchar(100),
	"birth_date" date,
	"photo_url" varchar(255),
	"task" varchar(100),
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employees_nip_unique" UNIQUE("nip")
);
--> statement-breakpoint
CREATE TABLE "jadwal_ujian" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ujian_id" uuid NOT NULL,
	"tanggal" date NOT NULL,
	"waktu_mulai" time NOT NULL,
	"waktu_selesai" time NOT NULL,
	"mata_pelajaran" varchar(150) NOT NULL,
	"kelas" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jenis_surats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama_jenis" varchar(150) NOT NULL,
	"kode_jenis" varchar(50) NOT NULL,
	"format_penomoran" text NOT NULL,
	"butuh_kka" boolean DEFAULT true,
	"butuh_derajat" boolean DEFAULT true,
	"aktif" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "majors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(150) NOT NULL,
	"code" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "majors_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "master_kka" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kode" varchar(50) NOT NULL,
	"keterangan" varchar(255) NOT NULL,
	"aktif" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "master_kka_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint
CREATE TABLE "menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"label" varchar(150) NOT NULL,
	"url" varchar(255) NOT NULL,
	"icon" varchar(255),
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nis_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" varchar(50) NOT NULL,
	"details" text,
	"student_id" uuid,
	"nis_value" varchar(50),
	"user_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nis_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"jumlah_siswa" integer NOT NULL,
	"start_sequence" integer NOT NULL,
	"end_sequence" integer NOT NULL,
	"operator" text,
	"status" varchar(20) DEFAULT 'completed',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"layout" text,
	"cover_image" text,
	"meta_description" text,
	"author_id" text,
	"status" varchar(20) DEFAULT 'Draft',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "panitia_ujian" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ujian_id" uuid NOT NULL,
	"pegawai_id" uuid NOT NULL,
	"jabatan" varchar(100) NOT NULL,
	"urutan" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "penugasan_pengawas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jadwal_id" uuid NOT NULL,
	"ruang_id" uuid NOT NULL,
	"pengawas_id" uuid NOT NULL,
	"kode_label" varchar(10),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ppdb_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tahun_ajaran" varchar(20) NOT NULL,
	"nama_sistem" varchar(100) DEFAULT 'SIMPMB 2026',
	"is_active" boolean DEFAULT true,
	"tanggal_pengumuman" timestamp,
	"batas_daftar_ulang" timestamp,
	"nomor_sk" varchar(100),
	"nama_sk" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ppdb_daftar_ulang" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pendaftar_id" uuid NOT NULL,
	"bukti_pembayaran_url" varchar(500),
	"ijazah_url" varchar(500),
	"kk_url" varchar(500),
	"kip_url" varchar(500),
	"photo_url" varchar(500),
	"ukuran_baju" varchar(10),
	"ukuran_celana" varchar(50),
	"status" varchar(30) DEFAULT 'menunggu_validasi',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ppdb_daftar_ulang_pendaftar_id_unique" UNIQUE("pendaftar_id")
);
--> statement-breakpoint
CREATE TABLE "ppdb_data_diri" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pendaftar_id" uuid NOT NULL,
	"nik" varchar(20) NOT NULL,
	"nama_lengkap" varchar(255) NOT NULL,
	"tempat_lahir" varchar(100) NOT NULL,
	"tanggal_lahir" date NOT NULL,
	"jenis_kelamin" varchar(20) NOT NULL,
	"alamat" text NOT NULL,
	"nama_ayah" varchar(255),
	"pekerjaan_ayah" varchar(100),
	"nama_ibu" varchar(255),
	"pekerjaan_ibu" varchar(100),
	"no_hp_ortu" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ppdb_data_sekolah" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pendaftar_id" uuid NOT NULL,
	"npsn" varchar(20),
	"nama_sekolah" varchar(255) NOT NULL,
	"status_sekolah" varchar(20) NOT NULL,
	"alamat_sekolah" text,
	"tahun_lulus" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ppdb_dokumen" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pendaftar_id" uuid NOT NULL,
	"jenis_dokumen" varchar(50) NOT NULL,
	"file_path" varchar(500) NOT NULL,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ppdb_jalur" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" uuid NOT NULL,
	"nama_jalur" varchar(50) NOT NULL,
	"kuota" integer DEFAULT 0 NOT NULL,
	"nilai_minimum" integer DEFAULT 70 NOT NULL,
	"requires_prestasi" boolean DEFAULT false,
	"jadwal_buka" timestamp,
	"jadwal_tutup" timestamp,
	"persyaratan" text,
	"deskripsi" text,
	"bobot_nilai" integer DEFAULT 100,
	"bobot_prestasi" integer DEFAULT 0,
	"is_active" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ppdb_nilai_raport" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pendaftar_id" uuid NOT NULL,
	"semester" integer NOT NULL,
	"b_indonesia" varchar(5),
	"b_inggris" varchar(5),
	"matematika" varchar(5),
	"ipa" varchar(5),
	"ips" varchar(5),
	"rata_rata" varchar(10),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ppdb_nilai_tes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pendaftar_id" uuid NOT NULL,
	"tes_config_id" uuid NOT NULL,
	"nilai" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ppdb_pendaftar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jalur_id" uuid NOT NULL,
	"no_pendaftaran" varchar(50) NOT NULL,
	"nisn" varchar(20) NOT NULL,
	"email" varchar(255),
	"status" varchar(30) DEFAULT 'menunggu',
	"catatan_admin" text,
	"nilai_akhir" varchar(10),
	"ranking" integer,
	"validation_code" varchar(100),
	"tgl_daftar" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ppdb_pendaftar_no_pendaftaran_unique" UNIQUE("no_pendaftaran")
);
--> statement-breakpoint
CREATE TABLE "ppdb_prestasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pendaftar_id" uuid NOT NULL,
	"jenis" varchar(50) NOT NULL,
	"tingkat" varchar(50) NOT NULL,
	"nama_kegiatan" varchar(255) NOT NULL,
	"peringkat" varchar(50),
	"tahun" integer,
	"file_sertifikat" varchar(500),
	"bobot_nilai" varchar(10),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ppdb_tes_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jalur_id" uuid NOT NULL,
	"nama_tes" varchar(150) NOT NULL,
	"bobot" integer DEFAULT 10 NOT NULL,
	"is_active" boolean DEFAULT true,
	"penguji_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ruang_ujian" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ujian_id" uuid NOT NULL,
	"nama_ruang" varchar(100) NOT NULL,
	"kapasitas" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "school_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"event_date" date NOT NULL,
	"end_date" date,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"color" varchar(20),
	"academic_year" varchar(20) NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar(50) NOT NULL,
	"type" varchar(100) NOT NULL,
	"applicant_name" varchar(255) NOT NULL,
	"nisn" varchar(50),
	"birth_place" varchar(100),
	"birth_date" date,
	"address" text,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"purpose" text,
	"attachment_url" varchar(500),
	"form_data" text,
	"status" varchar(20) DEFAULT 'pending',
	"admin_reply" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "service_requests_ticket_id_unique" UNIQUE("ticket_id")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text,
	"group" varchar(50),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "surat_keluars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"jenis_surat_id" uuid NOT NULL,
	"nomor_urut" integer NOT NULL,
	"nomor_lengkap" varchar(255) NOT NULL,
	"derajat_kode" varchar(20),
	"kode_satker" varchar(50),
	"kka_kode" varchar(50),
	"bulan" varchar(2),
	"tahun" varchar(4) NOT NULL,
	"perihal" text NOT NULL,
	"tujuan" varchar(255),
	"file_url" varchar,
	"tanggal_generate" timestamp DEFAULT now(),
	"user_id_pengambil" text,
	CONSTRAINT "surat_keluars_nomor_lengkap_unique" UNIQUE("nomor_lengkap")
);
--> statement-breakpoint
CREATE TABLE "surat_masuk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nomor_urut" integer,
	"nomor_agenda" varchar(50) NOT NULL,
	"nomor_surat_asli" varchar(150) NOT NULL,
	"tanggal_surat" date NOT NULL,
	"tanggal_diterima" timestamp DEFAULT now(),
	"tahun" varchar(4),
	"pengirim" varchar(255) NOT NULL,
	"perihal" text NOT NULL,
	"sifat" varchar(50),
	"derajat" varchar(20),
	"file_url" varchar,
	"user_id_penerima" text,
	CONSTRAINT "surat_masuk_nomor_agenda_unique" UNIQUE("nomor_agenda")
);
--> statement-breakpoint
CREATE TABLE "ujian" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama_ujian" varchar(255) NOT NULL,
	"jenis" varchar(50) NOT NULL,
	"tahun_ajaran" varchar(20) NOT NULL,
	"semester" varchar(10) NOT NULL,
	"tanggal_mulai" date NOT NULL,
	"tanggal_selesai" date NOT NULL,
	"ketua_panitia_id" uuid,
	"status" varchar(20) DEFAULT 'aktif',
	"pengaturan" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "news_announcements" DROP CONSTRAINT "news_announcements_author_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "gallery_images" ALTER COLUMN "url" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "news_announcements" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "student_profiles" ALTER COLUMN "class_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "card_settings" ADD COLUMN "terms_text" text;--> statement-breakpoint
ALTER TABLE "card_settings" ADD COLUMN "headmaster_signature_url" text;--> statement-breakpoint
ALTER TABLE "card_settings" ADD COLUMN "kemenag_logo_url" text;--> statement-breakpoint
ALTER TABLE "card_settings" ADD COLUMN "school_stamp_url" text;--> statement-breakpoint
ALTER TABLE "gallery_images" ADD COLUMN "uploaded_by" text;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "impersonated_by" text;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "full_name" varchar(255);--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "nis" varchar(50);--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "class_id" uuid;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "created_source" varchar(50) DEFAULT 'student_module';--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "banned" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ban_expires" timestamp;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_major_id_majors_id_fk" FOREIGN KEY ("major_id") REFERENCES "public"."majors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_homeroom_teacher_id_employees_id_fk" FOREIGN KEY ("homeroom_teacher_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribusi_peserta" ADD CONSTRAINT "distribusi_peserta_ujian_id_ujian_id_fk" FOREIGN KEY ("ujian_id") REFERENCES "public"."ujian"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribusi_peserta" ADD CONSTRAINT "distribusi_peserta_ruang_id_ruang_ujian_id_fk" FOREIGN KEY ("ruang_id") REFERENCES "public"."ruang_ujian"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribusi_peserta" ADD CONSTRAINT "distribusi_peserta_siswa_id_student_profiles_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."student_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal_ujian" ADD CONSTRAINT "jadwal_ujian_ujian_id_ujian_id_fk" FOREIGN KEY ("ujian_id") REFERENCES "public"."ujian"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nis_activity_logs" ADD CONSTRAINT "nis_activity_logs_student_id_student_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."student_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nis_activity_logs" ADD CONSTRAINT "nis_activity_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nis_batches" ADD CONSTRAINT "nis_batches_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nis_batches" ADD CONSTRAINT "nis_batches_operator_user_id_fk" FOREIGN KEY ("operator") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panitia_ujian" ADD CONSTRAINT "panitia_ujian_ujian_id_ujian_id_fk" FOREIGN KEY ("ujian_id") REFERENCES "public"."ujian"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panitia_ujian" ADD CONSTRAINT "panitia_ujian_pegawai_id_employees_id_fk" FOREIGN KEY ("pegawai_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penugasan_pengawas" ADD CONSTRAINT "penugasan_pengawas_jadwal_id_jadwal_ujian_id_fk" FOREIGN KEY ("jadwal_id") REFERENCES "public"."jadwal_ujian"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penugasan_pengawas" ADD CONSTRAINT "penugasan_pengawas_ruang_id_ruang_ujian_id_fk" FOREIGN KEY ("ruang_id") REFERENCES "public"."ruang_ujian"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "penugasan_pengawas" ADD CONSTRAINT "penugasan_pengawas_pengawas_id_employees_id_fk" FOREIGN KEY ("pengawas_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_daftar_ulang" ADD CONSTRAINT "ppdb_daftar_ulang_pendaftar_id_ppdb_pendaftar_id_fk" FOREIGN KEY ("pendaftar_id") REFERENCES "public"."ppdb_pendaftar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_data_diri" ADD CONSTRAINT "ppdb_data_diri_pendaftar_id_ppdb_pendaftar_id_fk" FOREIGN KEY ("pendaftar_id") REFERENCES "public"."ppdb_pendaftar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_data_sekolah" ADD CONSTRAINT "ppdb_data_sekolah_pendaftar_id_ppdb_pendaftar_id_fk" FOREIGN KEY ("pendaftar_id") REFERENCES "public"."ppdb_pendaftar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_dokumen" ADD CONSTRAINT "ppdb_dokumen_pendaftar_id_ppdb_pendaftar_id_fk" FOREIGN KEY ("pendaftar_id") REFERENCES "public"."ppdb_pendaftar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_jalur" ADD CONSTRAINT "ppdb_jalur_config_id_ppdb_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."ppdb_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_nilai_raport" ADD CONSTRAINT "ppdb_nilai_raport_pendaftar_id_ppdb_pendaftar_id_fk" FOREIGN KEY ("pendaftar_id") REFERENCES "public"."ppdb_pendaftar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_nilai_tes" ADD CONSTRAINT "ppdb_nilai_tes_pendaftar_id_ppdb_pendaftar_id_fk" FOREIGN KEY ("pendaftar_id") REFERENCES "public"."ppdb_pendaftar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_nilai_tes" ADD CONSTRAINT "ppdb_nilai_tes_tes_config_id_ppdb_tes_config_id_fk" FOREIGN KEY ("tes_config_id") REFERENCES "public"."ppdb_tes_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_pendaftar" ADD CONSTRAINT "ppdb_pendaftar_jalur_id_ppdb_jalur_id_fk" FOREIGN KEY ("jalur_id") REFERENCES "public"."ppdb_jalur"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_prestasi" ADD CONSTRAINT "ppdb_prestasi_pendaftar_id_ppdb_pendaftar_id_fk" FOREIGN KEY ("pendaftar_id") REFERENCES "public"."ppdb_pendaftar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_tes_config" ADD CONSTRAINT "ppdb_tes_config_jalur_id_ppdb_jalur_id_fk" FOREIGN KEY ("jalur_id") REFERENCES "public"."ppdb_jalur"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_tes_config" ADD CONSTRAINT "ppdb_tes_config_penguji_id_user_id_fk" FOREIGN KEY ("penguji_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruang_ujian" ADD CONSTRAINT "ruang_ujian_ujian_id_ujian_id_fk" FOREIGN KEY ("ujian_id") REFERENCES "public"."ujian"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_events" ADD CONSTRAINT "school_events_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_keluars" ADD CONSTRAINT "surat_keluars_jenis_surat_id_jenis_surats_id_fk" FOREIGN KEY ("jenis_surat_id") REFERENCES "public"."jenis_surats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_keluars" ADD CONSTRAINT "surat_keluars_user_id_pengambil_user_id_fk" FOREIGN KEY ("user_id_pengambil") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surat_masuk" ADD CONSTRAINT "surat_masuk_user_id_penerima_user_id_fk" FOREIGN KEY ("user_id_penerima") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ujian" ADD CONSTRAINT "ujian_ketua_panitia_id_employees_id_fk" FOREIGN KEY ("ketua_panitia_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;