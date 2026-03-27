import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

/**
 * Custom permission statements for MandaApp
 * Extends default Better Auth admin statements with app-specific resources
 */
const statement = {
  ...defaultStatements,
  news: ["create", "update", "delete", "publish"],
  gallery: ["create", "update", "delete"],
  student: ["view", "update", "input"],
  schedule: ["create", "update", "delete"],
  settings: ["view", "update"],
} as const;

export const ac = createAccessControl(statement);

// ─── Role: Super Admin ───
// Akses penuh ke seluruh sistem
export const adminRole = ac.newRole({
  ...adminAc.statements,
  news: ["create", "update", "delete", "publish"],
  gallery: ["create", "update", "delete"],
  student: ["view", "update", "input"],
  schedule: ["create", "update", "delete"],
  settings: ["view", "update"],
});

// ─── Role: Kepala Madrasah/Sekolah ───
// Overview, approval, laporan, kelola guru, galeri, berita
export const kepalaMadrasahRole = ac.newRole({
  news: ["create", "update", "delete", "publish"],
  gallery: ["create", "update", "delete"],
  student: ["view", "update", "input"],
  schedule: ["create", "update", "delete"],
  settings: ["view"],
});

// ─── Role: Wakil Kepala Madrasah/Sekolah ───
// Serupa Kepala (tanpa hapus data kritis), galeri, berita
export const wakilKepalaRole = ac.newRole({
  news: ["create", "update", "publish"],
  gallery: ["create", "update"],
  student: ["view", "update"],
  schedule: ["create", "update"],
  settings: ["view"],
});

// ─── Role: Kepala Unit ───
// Kelola unit/divisi, laporan unit, galeri, berita
export const kepalaUnitRole = ac.newRole({
  news: ["create", "update"],
  gallery: ["create", "update"],
  student: ["view"],
  schedule: ["create", "update"],
});

// ─── Role: Wali Kelas ───
// Kelola & input data siswa binaannya, absensi, galeri, berita
export const waliKelasRole = ac.newRole({
  news: ["create", "update"],
  gallery: ["create", "update"],
  student: ["view", "update", "input"],
  schedule: ["create", "update"],
});

// ─── Role: Pembina Ekstra ───
// Jadwal ekstra, galeri, berita
export const pembinaEkstraRole = ac.newRole({
  news: ["create", "update"],
  gallery: ["create", "update"],
  schedule: ["create", "update"],
});

// ─── Role: Guru ───
// Jadwal pelajaran, input nilai, data siswa, galeri, berita
export const guruRole = ac.newRole({
  news: ["create", "update"],
  gallery: ["create", "update"],
  student: ["view"],
  schedule: ["create", "update"],
});

// ─── Role: Siswa (Student) ───
// Akses terbatas: lihat jadwal, kartu pelajar, profil sendiri
export const studentRole = ac.newRole({
  student: ["view"],
});
