import { db } from "../../db";
import { waNotificationLog, studentProfiles, parentProfiles, siteSettings } from "../../db/schema";
import { eq, and, or, desc, count, sql, gte, isNotNull, isNull } from "drizzle-orm";
import { sendWhatsApp, getWaGatewayStatus, normalizePhone, invalidateTokenCache } from "../../lib/whatsapp";
import { formatAttendanceWaMessage, invalidateTemplateCache, DEFAULT_WA_TEMPLATE, STATUS_CONFIG } from "../../lib/wa-message-templates";

/**
 * Convert a Date to WITA date string (Asia/Makassar, UTC+8).
 */
function toWitaDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

export class WaService {

  // ─── Gateway Status ─────────────────────────────────────
  static async getStatus() {
    return getWaGatewayStatus();
  }

  // ─── WA Settings (token, toggles — stored in site_settings) ───

  static async getSettings() {
    const keys = ['wa_fonnte_token', 'parent_notif_wa', 'wa_notify_statuses'];
    const rows = await db.select().from(siteSettings).where(
      or(...keys.map(k => eq(siteSettings.key, k)))
    );

    const map: Record<string, string> = {};
    rows.forEach(r => { map[r.key] = r.value || ''; });

    const token = map['wa_fonnte_token'] || '';

    return {
      tokenConfigured: token.length > 5,
      tokenMasked: token.length > 5
        ? '****' + token.slice(-6)
        : '',
      waEnabled: map['parent_notif_wa'] === 'true',
      notifyStatuses: map['wa_notify_statuses']
        ? JSON.parse(map['wa_notify_statuses'])
        : ['Hadir', 'Terlambat', 'Alpa', 'Bolos', 'Sakit', 'Izin', 'Pulang'],
    };
  }

  static async saveSettings(data: {
    fonnteToken?: string;
    waEnabled?: boolean;
    notifyStatuses?: string[];
  }) {
    const updates: Array<{ key: string; value: string; group: string }> = [];

    if (data.fonnteToken !== undefined && data.fonnteToken.trim().length > 0) {
      updates.push({ key: 'wa_fonnte_token', value: data.fonnteToken.trim(), group: 'whatsapp' });
    }
    if (data.waEnabled !== undefined) {
      updates.push({ key: 'parent_notif_wa', value: String(data.waEnabled), group: 'parent_portal' });
    }
    if (data.notifyStatuses !== undefined) {
      updates.push({ key: 'wa_notify_statuses', value: JSON.stringify(data.notifyStatuses), group: 'whatsapp' });
    }

    for (const { key, value, group } of updates) {
      const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(siteSettings).set({ value, updatedAt: new Date() }).where(eq(siteSettings.key, key));
      } else {
        await db.insert(siteSettings).values({ key, value, group });
      }
    }

    // Invalidate token cache so new token takes effect immediately
    invalidateTokenCache();

    return { success: true };
  }

  // ─── Stats Today ────────────────────────────────────────
  static async getStatsToday() {
    const today = toWitaDateStr(new Date());
    const todayStart = new Date(today + 'T00:00:00+08:00');

    const results = await db.select({
      deliveryStatus: waNotificationLog.deliveryStatus,
      total: count(),
    })
      .from(waNotificationLog)
      .where(gte(waNotificationLog.createdAt, todayStart))
      .groupBy(waNotificationLog.deliveryStatus);

    const stats: Record<string, number> = { sent: 0, failed: 0, pending: 0, total: 0 };
    for (const r of results) {
      stats[r.deliveryStatus] = Number(r.total);
      stats.total += Number(r.total);
    }
    stats.successRate = stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0;

    return { date: today, ...stats };
  }

  // ─── Logs (paginated, filterable) ───────────────────────
  static async getLogs(options: {
    page?: number;
    limit?: number;
    deliveryStatus?: string;
    date?: string; // YYYY-MM-DD
  }) {
    const page = options.page || 1;
    const limit = options.limit || 30;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (options.deliveryStatus) {
      conditions.push(eq(waNotificationLog.deliveryStatus, options.deliveryStatus));
    }
    if (options.date) {
      const dateStart = new Date(options.date + 'T00:00:00+08:00');
      const dateEnd = new Date(options.date + 'T23:59:59+08:00');
      conditions.push(gte(waNotificationLog.createdAt, dateStart));
      conditions.push(sql`${waNotificationLog.createdAt} <= ${dateEnd}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [logs, [{ total }]] = await Promise.all([
      db.select({
        id: waNotificationLog.id,
        studentId: waNotificationLog.studentId,
        phone: waNotificationLog.phone,
        parentName: waNotificationLog.parentName,
        statusSent: waNotificationLog.statusSent,
        deliveryStatus: waNotificationLog.deliveryStatus,
        errorMessage: waNotificationLog.errorMessage,
        createdAt: waNotificationLog.createdAt,
        studentName: studentProfiles.fullName,
        className: studentProfiles.className,
      })
        .from(waNotificationLog)
        .leftJoin(studentProfiles, eq(waNotificationLog.studentId, studentProfiles.id))
        .where(whereClause)
        .orderBy(desc(waNotificationLog.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() })
        .from(waNotificationLog)
        .where(whereClause),
    ]);

    // Mask phone numbers for privacy (show last 4 digits only)
    const maskedLogs = logs.map(l => ({
      ...l,
      phoneMasked: l.phone ? '****' + l.phone.slice(-4) : null,
    }));

    return {
      data: maskedLogs,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  }

  // ─── Test Send ──────────────────────────────────────────
  static async testSend(phone: string) {
    const message = await formatAttendanceWaMessage({
      studentName: 'Test Siswa',
      className: 'X IPA 1',
      status: 'Hadir',
      date: toWitaDateStr(new Date()),
      time: '07:00',
      parentName: 'Bapak/Ibu Test',
    });

    const result = await sendWhatsApp(phone, message);
    return { ...result, phone: normalizePhone(phone) };
  }

  // ─── Retry Failed ───────────────────────────────────────
  static async retryFailed(logId: string) {
    const [log] = await db.select().from(waNotificationLog).where(eq(waNotificationLog.id, logId));
    if (!log) return { success: false, error: 'Log not found' };
    if (log.deliveryStatus === 'sent') return { success: false, error: 'Already sent' };

    // Get student info for message re-creation
    let studentName = 'Siswa';
    let className = '';
    if (log.studentId) {
      const [student] = await db.select({
        fullName: studentProfiles.fullName,
        className: studentProfiles.className,
      }).from(studentProfiles).where(eq(studentProfiles.id, log.studentId));
      if (student) {
        studentName = student.fullName || 'Siswa';
        className = student.className || '';
      }
    }

    const message = await formatAttendanceWaMessage({
      studentName,
      className,
      status: log.statusSent,
      date: toWitaDateStr(log.createdAt || new Date()),
      time: new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit'
      }).format(log.createdAt || new Date()),
      parentName: log.parentName || undefined,
    });

    const result = await sendWhatsApp(log.phone, message);

    // Update log
    await db.update(waNotificationLog).set({
      deliveryStatus: result.success ? 'sent' : 'failed',
      errorMessage: result.error || null,
      gatewayMessageId: result.messageId || null,
      retryCount: sql`${waNotificationLog.retryCount} + 1`,
    }).where(eq(waNotificationLog.id, logId));

    return result;
  }

  // ─── Template Management ────────────────────────────────

  static async getTemplate() {
    const rows = await db.select({ value: siteSettings.value })
      .from(siteSettings)
      .where(eq(siteSettings.key, 'wa_message_template'))
      .limit(1);

    const customTemplate = rows.length > 0 && rows[0].value && rows[0].value.trim().length > 10
      ? rows[0].value
      : null;

    return {
      template: customTemplate || DEFAULT_WA_TEMPLATE,
      isCustom: !!customTemplate,
      defaultTemplate: DEFAULT_WA_TEMPLATE,
      availableVariables: [
        { key: '{nama}', desc: 'Nama siswa' },
        { key: '{kelas}', desc: 'Kelas siswa' },
        { key: '{tanggal}', desc: 'Tanggal (format: Selasa, 20 Oktober 2026)' },
        { key: '{waktu}', desc: 'Jam (format: 07:00)' },
        { key: '{status}', desc: 'Status kehadiran (HADIR, TERLAMBAT, dll)' },
        { key: '{emoji}', desc: 'Emoji status (✅, ⏰, ❌, dll)' },
        { key: '{saran}', desc: 'Pesan saran sesuai status' },
        { key: '{nama_ortu}', desc: 'Nama orang tua' },
        { key: '{nama_sekolah}', desc: 'Nama sekolah (dari Identitas Sekolah)' },
      ],
      statusConfig: STATUS_CONFIG,
    };
  }

  static async saveTemplate(template: string) {
    const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, 'wa_message_template')).limit(1);
    if (existing.length > 0) {
      await db.update(siteSettings).set({ value: template, updatedAt: new Date() }).where(eq(siteSettings.key, 'wa_message_template'));
    } else {
      await db.insert(siteSettings).values({ key: 'wa_message_template', value: template, group: 'whatsapp' });
    }
    invalidateTemplateCache();
    return { success: true };
  }

  static async resetTemplate() {
    const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, 'wa_message_template')).limit(1);
    if (existing.length > 0) {
      await db.update(siteSettings).set({ value: DEFAULT_WA_TEMPLATE, updatedAt: new Date() }).where(eq(siteSettings.key, 'wa_message_template'));
    }
    invalidateTemplateCache();
    return { success: true };
  }

  // ─── Preview Template ───────────────────────────────────
  static async previewTemplate(template: string) {
    // Temporarily use the provided template for preview
    const config = STATUS_CONFIG['Hadir'];
    const message = template
      .replace(/\{emoji\}/g, config.emoji)
      .replace(/\{status\}/g, config.label)
      .replace(/\{saran\}/g, config.advice)
      .replace(/\{nama\}/g, 'Ahmad Farid')
      .replace(/\{kelas\}/g, 'X IPA 1')
      .replace(/\{tanggal\}/g, 'Selasa, 20 Oktober 2026')
      .replace(/\{waktu\}/g, '07:00')
      .replace(/\{nama_ortu\}/g, 'Bapak Muhamad')
      .replace(/\{nama_sekolah\}/g, 'MAN 2 Lombok Timur');
    return { preview: message };
  }

  // ─── Coverage: Siswa tanpa nomor HP orang tua ───────────
  static async getCoverage() {
    // Get all active students
    const students = await db.select({
      id: studentProfiles.id,
      fullName: studentProfiles.fullName,
      nis: studentProfiles.nis,
      className: studentProfiles.className,
    })
      .from(studentProfiles)
      .where(and(
        eq(studentProfiles.status, 'active'),
        isNotNull(studentProfiles.classId),
      ))
      .orderBy(studentProfiles.className, studentProfiles.fullName);

    // Get all parent phones
    const parentPhones = await db.select({
      studentId: parentProfiles.studentId,
      phone: parentProfiles.phone,
    }).from(parentProfiles);

    const studentsWithPhone = new Set<string>();
    for (const p of parentPhones) {
      if (p.phone && p.phone.trim().length >= 8) {
        studentsWithPhone.add(p.studentId);
      }
    }

    const withPhone: typeof students = [];
    const withoutPhone: typeof students = [];
    for (const s of students) {
      if (studentsWithPhone.has(s.id)) {
        withPhone.push(s);
      } else {
        withoutPhone.push(s);
      }
    }

    return {
      totalStudents: students.length,
      withPhone: withPhone.length,
      withoutPhone: withoutPhone.length,
      coveragePercent: students.length > 0
        ? Math.round((withPhone.length / students.length) * 100 * 10) / 10
        : 0,
      studentsWithoutPhone: withoutPhone,
    };
  }

  // ─── Diagnostic: Check semua komponen WA ─────────────────
  static async diagnose(studentName?: string) {
    const checks: Record<string, { ok: boolean; detail: string }> = {};

    // 1. Token check
    try {
      const tokenRows = await db.select({ value: siteSettings.value })
        .from(siteSettings)
        .where(eq(siteSettings.key, 'wa_fonnte_token'))
        .limit(1);
      const token = tokenRows.length > 0 ? tokenRows[0].value : null;
      if (token && token.trim().length > 5) {
        checks['1_token'] = { ok: true, detail: `Token ada (****${token.slice(-6)})` };
      } else {
        checks['1_token'] = { ok: false, detail: 'Token Fonnte BELUM diisi di dashboard. Isi di Pengaturan WhatsApp → Token Fonnte.' };
      }
    } catch (err: any) {
      checks['1_token'] = { ok: false, detail: `Error baca token: ${err.message}` };
    }

    // 2. Toggle WA enabled
    try {
      const toggleRows = await db.select({ value: siteSettings.value })
        .from(siteSettings)
        .where(eq(siteSettings.key, 'parent_notif_wa'))
        .limit(1);
      const val = toggleRows.length > 0 ? toggleRows[0].value : null;
      if (val === 'true') {
        checks['2_toggle'] = { ok: true, detail: 'Toggle WA aktif (parent_notif_wa = true)' };
      } else {
        checks['2_toggle'] = { ok: false, detail: `Toggle WA NONAKTIF (parent_notif_wa = ${val || 'NULL/tidak ada'}). Aktifkan di Pengaturan WhatsApp.` };
      }
    } catch (err: any) {
      checks['2_toggle'] = { ok: false, detail: `Error baca toggle: ${err.message}` };
    }

    // 3. Student lookup (if name provided)
    let foundStudentId: string | null = null;
    if (studentName) {
      try {
        const students = await db.select({
          id: studentProfiles.id,
          fullName: studentProfiles.fullName,
          nis: studentProfiles.nis,
          className: studentProfiles.className,
        }).from(studentProfiles)
          .where(sql`LOWER(${studentProfiles.fullName}) LIKE LOWER(${'%' + studentName + '%'})`)
          .limit(5);

        if (students.length > 0) {
          foundStudentId = students[0].id;
          checks['3_student'] = { ok: true, detail: `Ditemukan ${students.length} siswa: ${students.map(s => `${s.fullName} (${s.nis}, ${s.className})`).join(', ')}` };
        } else {
          checks['3_student'] = { ok: false, detail: `Siswa "${studentName}" TIDAK ditemukan di database` };
        }
      } catch (err: any) {
        checks['3_student'] = { ok: false, detail: `Error cari siswa: ${err.message}` };
      }
    }

    // 4. Parent phones for that student
    if (foundStudentId) {
      try {
        const profiles = await db.select({
          name: parentProfiles.name,
          phone: parentProfiles.phone,
          type: parentProfiles.type,
        }).from(parentProfiles)
          .where(eq(parentProfiles.studentId, foundStudentId));

        if (profiles.length > 0) {
          const withPhone = profiles.filter(p => p.phone && p.phone.trim().length >= 8);
          const detail = profiles.map(p => `${p.type}: ${p.name} → ${p.phone || '(KOSONG)'} ${p.phone ? '→ ' + normalizePhone(p.phone) : ''}`).join(' | ');
          checks['4_parent_phones'] = {
            ok: withPhone.length > 0,
            detail: withPhone.length > 0
              ? `${withPhone.length}/${profiles.length} orang tua punya HP: ${detail}`
              : `SEMUA ${profiles.length} orang tua TIDAK punya nomor HP: ${detail}`,
          };
        } else {
          checks['4_parent_phones'] = { ok: false, detail: 'TIDAK ada data orang tua di tabel parent_profiles untuk siswa ini' };
        }
      } catch (err: any) {
        checks['4_parent_phones'] = { ok: false, detail: `Error cari parent: ${err.message}` };
      }
    }

    // 5. wa_notification_log table exists
    try {
      const logCount = await db.select({ total: count() }).from(waNotificationLog);
      checks['5_log_table'] = { ok: true, detail: `Tabel wa_notification_log OK (${logCount[0].total} record)` };
    } catch (err: any) {
      checks['5_log_table'] = { ok: false, detail: `Tabel wa_notification_log ERROR — migrasi 0027 belum jalan? Error: ${err.message}` };
    }

    // 6. Fonnte API connectivity test (ping)
    try {
      const tokenRows = await db.select({ value: siteSettings.value })
        .from(siteSettings)
        .where(eq(siteSettings.key, 'wa_fonnte_token'))
        .limit(1);
      const token = tokenRows.length > 0 ? tokenRows[0].value?.trim() : null;
      if (token) {
        const res = await fetch('https://api.fonnte.com/device', {
          method: 'POST',
          headers: { 'Authorization': token },
        });
        const data = await res.json();
        checks['6_fonnte_api'] = {
          ok: data.status === true,
          detail: data.status === true
            ? `Fonnte API OK — Device: ${data.device?.device_name || data.device || 'connected'}`
            : `Fonnte API ERROR — ${JSON.stringify(data).slice(0, 200)}`,
        };
      } else {
        checks['6_fonnte_api'] = { ok: false, detail: 'Skip — token belum ada' };
      }
    } catch (err: any) {
      checks['6_fonnte_api'] = { ok: false, detail: `Fonnte API unreachable: ${err.message}` };
    }

    // Summary
    const allOk = Object.values(checks).every(c => c.ok);
    const failedChecks = Object.entries(checks).filter(([, c]) => !c.ok).map(([k]) => k);

    return {
      allOk,
      failedChecks,
      checks,
      hint: allOk
        ? '✅ Semua komponen OK. WA seharusnya berjalan. Cek log Docker: docker logs api --tail 100'
        : `❌ Ada ${failedChecks.length} masalah. Perbaiki komponen yang gagal di atas.`,
    };
  }
}
