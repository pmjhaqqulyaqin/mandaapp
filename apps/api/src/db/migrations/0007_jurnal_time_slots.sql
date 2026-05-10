CREATE TABLE IF NOT EXISTS "jurnal_time_slots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "day_of_week" integer NOT NULL,
  "jam_ke" integer NOT NULL,
  "waktu_mulai" time NOT NULL,
  "waktu_selesai" time NOT NULL,
  "label" varchar(50),
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  UNIQUE("day_of_week", "jam_ke")
);
