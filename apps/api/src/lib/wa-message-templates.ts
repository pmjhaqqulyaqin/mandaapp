/**
 * WhatsApp Message Templates — Presensi Siswa
 * Format: WhatsApp markdown (*bold*, _italic_)
 * 
 * Supports custom templates from admin dashboard (site_settings).
 * Template variables:
 *   {emoji}        → Status emoji (✅, ⏰, ❌, etc.)
 *   {status}       → Status label (HADIR, TERLAMBAT, etc.)
 *   {saran}        → Saran/advice per status
 *   {nama}         → Nama siswa
 *   {kelas}        → Kelas siswa
 *   {tanggal}      → Tanggal (format: Selasa, 20 Oktober 2026)
 *   {waktu}        → Jam (format: 07:00 WITA)
 *   {nama_ortu}    → Nama orang tua (atau "Bapak/Ibu Wali Murid")
 *   {nama_sekolah} → Nama sekolah (dari site_settings)
 */

import { db } from "../db";
import { siteSettings } from "../db/schema";
import { eq, or } from "drizzle-orm";

// ─── Status Config ────────────────────────────────────────

export const STATUS_CONFIG: Record<string, {
  emoji: string;
  label: string;
  advice: string;
}> = {
  'Hadir':     { emoji: '✅', label: 'HADIR',              advice: 'Alhamdulillah, putra/putri Anda hadir tepat waktu hari ini.' },
  'Terlambat': { emoji: '⏰', label: 'TERLAMBAT',          advice: '⚠️ Mohon memastikan putra/putri Anda berangkat lebih awal agar tidak terlambat.' },
  'Alpa':      { emoji: '❌', label: 'TIDAK HADIR (ALPA)',  advice: '⚠️ Putra/putri Anda tidak hadir tanpa keterangan. Mohon hubungi wali kelas jika ada keperluan.' },
  'Bolos':     { emoji: '🚫', label: 'BOLOS',              advice: '🚨 Putra/putri Anda terdeteksi meninggalkan sekolah tanpa izin. Mohon segera hubungi wali kelas.' },
  'Sakit':     { emoji: '🏥', label: 'SAKIT',              advice: 'Semoga lekas sembuh. Surat keterangan sakit dapat diserahkan saat masuk kembali.' },
  'Izin':      { emoji: '📋', label: 'IZIN',               advice: 'Izin putra/putri Anda telah tercatat oleh pihak sekolah.' },
  'Pulang':    { emoji: '🏠', label: 'PULANG',             advice: 'Putra/putri Anda sudah selesai kegiatan belajar dan pulang dari sekolah.' },
};

// ─── Default Template ─────────────────────────────────────

export const DEFAULT_WA_TEMPLATE = `{emoji} *NOTIFIKASI KEHADIRAN SISWA*
_{nama_sekolah}_
━━━━━━━━━━━━━━━━━━

Assalamualaikum Wr. Wb.
Yth. *{nama_ortu}*,

Berikut informasi kehadiran putra/putri Anda:

👤 Nama  : *{nama}*
🏫 Kelas : {kelas}
📅 Tanggal: {tanggal}
⏰ Waktu : {waktu} WITA

📌 Status: *{status}* {emoji}

{saran}

━━━━━━━━━━━━━━━━━━
_Pesan otomatis dari SIMANDA_
_{nama_sekolah}_`;

// ─── Template Cache ───────────────────────────────────────

let _cachedTemplate: string | null = null;
let _cachedSchoolName: string | null = null;
let _cachedTemplateTs = 0;
const TEMPLATE_CACHE_TTL = 120_000; // 2 menit

async function resolveTemplate(): Promise<{ template: string; schoolName: string }> {
  if (_cachedTemplate && _cachedSchoolName && Date.now() - _cachedTemplateTs < TEMPLATE_CACHE_TTL) {
    return { template: _cachedTemplate, schoolName: _cachedSchoolName };
  }

  try {
    const rows = await db.select({ key: siteSettings.key, value: siteSettings.value })
      .from(siteSettings)
      .where(or(
        eq(siteSettings.key, 'wa_message_template'),
        eq(siteSettings.key, 'school_name'),
      ));

    const map: Record<string, string> = {};
    rows.forEach(r => { map[r.key] = r.value || ''; });

    _cachedTemplate = map['wa_message_template'] && map['wa_message_template'].trim().length > 10
      ? map['wa_message_template']
      : DEFAULT_WA_TEMPLATE;
    _cachedSchoolName = map['school_name'] || 'MAN 2 Lombok Timur';
    _cachedTemplateTs = Date.now();
  } catch (err) {
    _cachedTemplate = DEFAULT_WA_TEMPLATE;
    _cachedSchoolName = 'MAN 2 Lombok Timur';
    _cachedTemplateTs = Date.now();
  }

  return { template: _cachedTemplate, schoolName: _cachedSchoolName };
}

/** Force-refresh template cache (called when admin saves new template) */
export function invalidateTemplateCache() {
  _cachedTemplate = null;
  _cachedSchoolName = null;
  _cachedTemplateTs = 0;
}

// ─── Format Message ───────────────────────────────────────

export async function formatAttendanceWaMessage(params: {
  studentName: string;
  className: string;
  status: string;
  date: string;
  time: string;
  parentName?: string;
}): Promise<string> {
  const { studentName, className, status, date, time, parentName } = params;
  const config = STATUS_CONFIG[status] || { emoji: '📋', label: status, advice: '' };

  const formattedDate = (() => {
    try {
      return new Date(date).toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    } catch { return date; }
  })();

  const { template, schoolName } = await resolveTemplate();

  // Replace all variables
  const message = template
    .replace(/\{emoji\}/g, config.emoji)
    .replace(/\{status\}/g, config.label)
    .replace(/\{saran\}/g, config.advice)
    .replace(/\{nama\}/g, studentName)
    .replace(/\{kelas\}/g, className)
    .replace(/\{tanggal\}/g, formattedDate)
    .replace(/\{waktu\}/g, time)
    .replace(/\{nama_ortu\}/g, parentName || 'Bapak/Ibu Wali Murid')
    .replace(/\{nama_sekolah\}/g, schoolName);

  return message;
}
