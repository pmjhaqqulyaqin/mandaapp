import { Request, Response } from "express";
import { getAuditLogs, logAuditEvent } from "./service";
import { auth } from "../auth";
import { db } from "../../db";
import { user, employees, studentProfiles, auditLogs, pages, suratKeluars, suratMasuks, schoolEvents, nisActivityLogs, nisBatches, ppdbTesConfig, classSchedules, session, account } from "../../db/schema";
import { eq } from "drizzle-orm";
import { SettingsService } from "../settings/service";

// All available menu keys
const ALL_MENU_KEYS = [
  "overview", "news", "calendar", "teacher-duties", "student-card", "students", "buku-induk", "classes", "employees", "nis",
  "gallery", "contacts", "pages", "menus", "settings", "users", "updates", "e-office", "ptsp", "exams", "ppdb", "penilaian-pmb", "ijazah", "attendance", "jurnal", "kbm", "subjects", "alumni", "mutasi"
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ALL_MENU_KEYS,
  kepala_madrasah: ["overview", "news", "calendar", "teacher-duties", "student-card", "students", "buku-induk", "classes", "employees", "gallery", "contacts", "e-office", "exams", "ppdb", "penilaian-pmb", "ijazah", "attendance", "jurnal", "kbm", "subjects", "alumni", "mutasi"],
  wakil_kepala: ["overview", "news", "calendar", "teacher-duties", "student-card", "students", "buku-induk", "classes", "employees", "gallery", "contacts", "e-office", "exams", "ppdb", "penilaian-pmb", "ijazah", "attendance", "jurnal", "kbm", "subjects", "alumni", "mutasi"],
  kepala_unit: ["overview", "news", "calendar", "teacher-duties", "student-card", "gallery", "contacts", "exams", "penilaian-pmb", "attendance"],
  wali_kelas: ["overview", "news", "calendar", "teacher-duties", "student-card", "students", "buku-induk", "gallery", "penilaian-pmb", "ijazah", "attendance", "jurnal"],
  pembina_ekstra: ["overview", "news", "calendar", "teacher-duties", "student-card", "gallery", "penilaian-pmb"],
  guru: ["overview", "news", "calendar", "teacher-duties", "student-card", "exams", "penilaian-pmb", "attendance", "jurnal"],
  student: ["overview", "calendar", "student-card"],
  kepala_tu: ["overview", "news", "calendar", "teacher-duties", "student-card", "students", "buku-induk", "classes", "employees", "gallery", "contacts", "e-office", "exams", "ppdb", "penilaian-pmb", "ijazah", "attendance", "jurnal", "kbm", "subjects", "alumni", "mutasi"],
  pegawai_tu: ["overview", "news", "calendar", "teacher-duties", "student-card", "students", "buku-induk", "employees", "e-office", "ppdb", "penilaian-pmb", "ijazah", "attendance", "kbm", "subjects", "alumni", "mutasi"],
  operator: ["overview", "news", "calendar", "teacher-duties", "student-card", "students", "buku-induk", "employees", "gallery", "e-office", "ppdb", "penilaian-pmb", "ijazah", "attendance", "kbm", "subjects", "alumni", "mutasi"],
};

export async function getAuditLogsHandler(req: Request, res: Response) {
  try {
    const {
      userId,
      action,
      startDate,
      endDate,
      limit,
      offset,
    } = req.query;

    const result = await getAuditLogs({
      userId: userId as string | undefined,
      action: action as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Gagal mengambil audit logs" });
  }
}

// Returns the list of available roles for the dropdown
export function getRolesHandler(_req: Request, res: Response) {
  const roles = [
    { value: "admin", label: "Super Admin" },
    { value: "kepala_madrasah", label: "Kepala Madrasah/Sekolah" },
    { value: "wakil_kepala", label: "Wakil Kepala Madrasah/Sekolah" },
    { value: "kepala_unit", label: "Kepala Unit" },
    { value: "wali_kelas", label: "Wali Kelas" },
    { value: "pembina_ekstra", label: "Pembina Ekstra" },
    { value: "guru", label: "Guru" },
    { value: "kepala_tu", label: "Kepala TU" },
    { value: "pegawai_tu", label: "Pegawai TU" },
    { value: "operator", label: "Operator" },
    { value: "student", label: "Siswa" },
    { value: "orang_tua", label: "Orang Tua / Wali" },
  ];
  res.json(roles);
}

// Allows a new user (non-admin) to select their own role (guru/student only)
const SELF_SELECTABLE_ROLES = ["guru", "student", "orang_tua"];

export async function selectOwnRoleHandler(req: Request, res: Response) {
  try {
    // Verify the user's session
    const session = await auth.api.getSession({ headers: req.headers as any });
    if (!session?.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const { role } = req.body;
    if (!role || !SELF_SELECTABLE_ROLES.includes(role)) {
      return res.status(400).json({ error: "Role tidak valid. Pilih 'guru' atau 'student'." });
    }

    // Update the user's role
    await db.update(user)
      .set({ role })
      .where(eq(user.id, session.user.id));

    // Log the audit event
    await logAuditEvent({
      userId: session.user.id,
      action: "select_role",
      targetType: "user",
      targetId: session.user.id,
      details: JSON.stringify({ role }),
      ipAddress: req.ip || undefined,
    });

    res.json({ success: true, role });
  } catch (error) {
    console.error("Error selecting role:", error);
    res.status(500).json({ error: "Gagal menyimpan peran" });
  }
}

// Combined: set role + create credential password (for Google OAuth users)
const SETUP_SELECTABLE_ROLES = ["guru", "student", "orang_tua"];

export async function setupAccountHandler(req: Request, res: Response) {
  try {
    const session = await auth.api.getSession({ headers: req.headers as any });
    if (!session?.user) {
      return res.status(401).json({ error: "Tidak terautentikasi" });
    }

    const { role, password } = req.body;

    // Validate role
    if (!role || !SETUP_SELECTABLE_ROLES.includes(role)) {
      return res.status(400).json({ error: "Role tidak valid. Pilih guru, student, atau orang_tua." });
    }

    // Validate password
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password minimal 8 karakter." });
    }

    // 1. Set role
    await db.update(user)
      .set({ role })
      .where(eq(user.id, session.user.id));

    // 2. Set password (creates credential account if doesn't exist)
    try {
      await auth.api.setPassword({
        body: { newPassword: password },
        headers: req.headers as any,
      });
    } catch (pwErr: any) {
      // If user already has a password, this might throw — that's ok
      console.warn("[SETUP] setPassword warning:", pwErr?.message);
    }

    // 3. Audit log
    await logAuditEvent({
      userId: session.user.id,
      action: "setup_account",
      targetType: "user",
      targetId: session.user.id,
      details: JSON.stringify({ role, hasPassword: true }),
      ipAddress: req.ip || undefined,
    });

    res.json({ success: true, role });
  } catch (error) {
    console.error("Error setting up account:", error);
    res.status(500).json({ error: "Gagal menyiapkan akun" });
  }
}


export async function getUsersDropdownHandler(_req: Request, res: Response) {
  try {
    const list = await db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }).from(user);
    res.json(list);
  } catch(error) {
    console.error(error);
    res.status(500).json({ error: "Gagal memuat pengguna" });
  }
}

// ─── Role Menu Permissions ───

const ROLE_PERMISSIONS_KEY = "role_menu_permissions";
const ROLE_PERMISSIONS_GROUP = "permissions";

export async function getRoleMenuPermissionsHandler(_req: Request, res: Response) {
  try {
    const settings = await SettingsService.getAll();
    const setting = settings.find((s) => s.key === ROLE_PERMISSIONS_KEY);

    let permissions: Record<string, string[]>;
    if (setting?.value) {
      permissions = JSON.parse(setting.value);
      // Merge in any new menu keys from defaults that weren't in the saved DB version
      // This ensures newly added menus (e.g. "attendance") appear automatically
      for (const [role, defaultMenus] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
        if (!permissions[role]) {
          permissions[role] = defaultMenus;
        } else {
          for (const menuKey of defaultMenus) {
            if (!permissions[role].includes(menuKey)) {
              permissions[role].push(menuKey);
            }
          }
        }
      }
    } else {
      permissions = { ...DEFAULT_ROLE_PERMISSIONS };
    }

    // Admin always has all menus
    permissions.admin = ALL_MENU_KEYS;

    res.json({
      permissions,
      allMenus: ALL_MENU_KEYS,
    });
  } catch (error) {
    console.error("Error fetching role menu permissions:", error);
    res.status(500).json({ error: "Gagal mengambil konfigurasi hak akses menu" });
  }
}

export async function updateRoleMenuPermissionsHandler(req: Request, res: Response) {
  try {
    const { role, menus } = req.body;

    if (!role || !Array.isArray(menus)) {
      return res.status(400).json({ error: "Role dan menus harus disediakan" });
    }

    // Cannot modify admin permissions
    if (role === "admin") {
      return res.status(400).json({ error: "Tidak dapat mengubah izin untuk Super Admin" });
    }

    // Validate menu keys
    const invalidMenus = menus.filter((m: string) => !ALL_MENU_KEYS.includes(m));
    if (invalidMenus.length > 0) {
      return res.status(400).json({ error: `Menu tidak valid: ${invalidMenus.join(", ")}` });
    }

    // Get existing permissions
    const settings = await SettingsService.getAll();
    const setting = settings.find((s) => s.key === ROLE_PERMISSIONS_KEY);
    let permissions: Record<string, string[]>;
    if (setting?.value) {
      permissions = JSON.parse(setting.value);
    } else {
      permissions = { ...DEFAULT_ROLE_PERMISSIONS };
    }

    // Update the specific role
    permissions[role] = menus;
    // Admin is always complete
    permissions.admin = ALL_MENU_KEYS;

    // Save
    await SettingsService.upsert(
      ROLE_PERMISSIONS_KEY,
      JSON.stringify(permissions),
      ROLE_PERMISSIONS_GROUP
    );

    // Audit log
    const session = await auth.api.getSession({ headers: req.headers as any });
    if (session?.user) {
      await logAuditEvent({
        userId: session.user.id,
        action: "update_role_permissions",
        targetType: "role",
        targetId: role,
        details: JSON.stringify({ menus }),
        ipAddress: req.ip || undefined,
      });
    }

    res.json({ success: true, permissions });
  } catch (error) {
    console.error("Error updating role menu permissions:", error);
    res.status(500).json({ error: "Gagal menyimpan konfigurasi hak akses menu" });
  }
}

export async function deleteUserHandler(req: Request, res: Response) {
  const targetId = req.params.id;
  if (!targetId) return res.status(400).json({ error: "Missing user ID" });

  try {
    // 1. Set NULL on nullable foreign keys
    await db.update(employees).set({ userId: null }).where(eq(employees.userId, targetId));
    await db.update(studentProfiles).set({ userId: null }).where(eq(studentProfiles.userId, targetId));
    await db.update(auditLogs).set({ userId: null }).where(eq(auditLogs.userId, targetId));
    await db.update(pages).set({ authorId: null }).where(eq(pages.authorId, targetId));
    await db.update(suratKeluars).set({ userIdPengambil: null }).where(eq(suratKeluars.userIdPengambil, targetId));
    await db.update(suratMasuks).set({ userIdPenerima: null }).where(eq(suratMasuks.userIdPenerima, targetId));
    await db.update(schoolEvents).set({ createdBy: null }).where(eq(schoolEvents.createdBy, targetId));
    await db.update(nisActivityLogs).set({ userId: null }).where(eq(nisActivityLogs.userId, targetId));
    await db.update(nisBatches).set({ operator: null }).where(eq(nisBatches.operator, targetId));
    await db.update(ppdbTesConfig).set({ pengujiId: null }).where(eq(ppdbTesConfig.pengujiId, targetId));

    // 2. Cascade delete on NOT NULL foreign keys
    await db.delete(classSchedules).where(eq(classSchedules.teacherId, targetId));

    // 3. Delete from BetterAuth explicitly to avoid leaving orphaned records 
    // if BetterAuth admin plugin is not hooked up to this endpoint.
    await db.delete(session).where(eq(session.userId, targetId));
    await db.delete(account).where(eq(account.userId, targetId));
    await db.delete(user).where(eq(user.id, targetId));

    // Or optionally use auth.api.removeUser if we can pass headers correctly
    // await auth.api.removeUser({ headers: req.headers as any, body: { userId: targetId } });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Gagal menghapus pengguna karena masalah database. Detail: " + error.message });
  }
}

