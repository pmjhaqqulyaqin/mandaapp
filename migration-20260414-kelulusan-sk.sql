-- Migration: Add SK fields to ppdb_config and validation_code to ppdb_pendaftar
ALTER TABLE "ppdb_config" ADD COLUMN IF NOT EXISTS "nomor_sk" varchar(100);
ALTER TABLE "ppdb_config" ADD COLUMN IF NOT EXISTS "nama_sk" text;
ALTER TABLE "ppdb_pendaftar" ADD COLUMN IF NOT EXISTS "validation_code" varchar(100);
