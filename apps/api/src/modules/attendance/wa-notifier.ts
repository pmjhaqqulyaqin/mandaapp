import { db } from "../../db";
import { parentLinks, parentProfiles, user, waNotificationLog } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import { sendWhatsApp, normalizePhone } from "../../lib/whatsapp";
import { formatAttendanceWaMessage } from "../../lib/wa-message-templates";
import { ParentPortalService } from "../parent-portal/service";

interface ParentPhone {
  phone: string;
  name: string;
  source: 'parent_link' | 'parent_profile';
}

/**
 * Resolve semua nomor HP orang tua untuk 1 siswa.
 * Dual-source (deduplicated by normalized phone):
 *   1. parent_links → orang tua yang sudah pair via Portal (WA opt-in)
 *   2. parent_profiles → data Buku Induk (fallback)
 */
async function getParentPhones(studentId: string): Promise<ParentPhone[]> {
  const phones: ParentPhone[] = [];
  const seen = new Set<string>();

  // Source 1: parent_links (Portal Orang Tua — WA enabled)
  const links = await db.select({
    phone: parentLinks.phone,
    parentName: user.name,
  })
    .from(parentLinks)
    .innerJoin(user, eq(parentLinks.userId, user.id))
    .where(and(
      eq(parentLinks.studentId, studentId),
      eq(parentLinks.notificationWa, true),
    ));

  for (const link of links) {
    if (!link.phone) continue;
    const norm = normalizePhone(link.phone);
    if (seen.has(norm)) continue;
    seen.add(norm);
    phones.push({ phone: link.phone, name: link.parentName || '', source: 'parent_link' });
  }

  // Source 2: parent_profiles (Buku Induk — fallback)
  const profiles = await db.select({
    phone: parentProfiles.phone,
    name: parentProfiles.name,
  })
    .from(parentProfiles)
    .where(eq(parentProfiles.studentId, studentId));

  for (const p of profiles) {
    if (!p.phone) continue;
    const norm = normalizePhone(p.phone);
    if (seen.has(norm)) continue;
    seen.add(norm);
    phones.push({ phone: p.phone, name: p.name || '', source: 'parent_profile' });
  }

  return phones;
}

/**
 * Kirim notifikasi WA ke semua orang tua siswa.
 * Fire-and-forget (non-blocking). Logs setiap attempt ke wa_notification_log.
 */
export async function notifyParentsViaWA(
  studentId: string,
  studentName: string,
  className: string,
  status: string,
  date: string,
  time: string,
): Promise<void> {
  try {
    // 1. Global toggle check
    const settings = await ParentPortalService.getNotifSettings();
    if (!settings.waEnabled) return;

    // 2. Get parent phones
    const parents = await getParentPhones(studentId);
    if (parents.length === 0) return;

    // 3. Send to each parent (fire-and-forget)
    for (const parent of parents) {
      const message = formatAttendanceWaMessage({
        studentName, className, status, date, time,
        parentName: parent.name,
      });

      sendWhatsApp(parent.phone, message)
        .then(async (result) => {
          // Log to DB for audit trail
          try {
            await db.insert(waNotificationLog).values({
              studentId,
              phone: normalizePhone(parent.phone),
              parentName: parent.name,
              messageType: 'attendance',
              statusSent: status,
              deliveryStatus: result.success ? 'sent' : 'failed',
              errorMessage: result.error || null,
              gatewayMessageId: result.messageId || null,
            });
          } catch (logErr) {
            console.error('[WA-LOG] DB log failed:', logErr);
          }
        })
        .catch(err => {
          console.error(`[WA-NOTIF] Error → ${parent.phone}:`, err);
        });
    }
  } catch (err) {
    console.error('[WA-NOTIF] notifyParentsViaWA error:', err);
  }
}
