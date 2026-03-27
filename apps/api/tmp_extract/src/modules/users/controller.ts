import { Request, Response } from "express";
import { getAuditLogs, logAuditEvent } from "./service";
import { auth } from "../auth";
import { db } from "../../db";
import { user } from "../../db/schema";
import { eq } from "drizzle-orm";
import { SettingsService } from "../settings/service";

// All available menu keys
const ALL_MENU_KEYS = [
  "overview", "news", "calendar", "student-card",
  "gallery", "contacts", "pages", "menus", "settings", "users", "updates",
];

// Default permissions: which menus each role gets when no config exists
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ALL_MENU_KEYS,
  kepala_madrasah: ["overview", "news", "calendar", "student-card", "gallery", "contacts"],
  wakil_kepala: ["overview", "news", "calendar", "student-card", "gallery", "contacts"],
  kepala_unit: ["overview", "news", "calendar", "student-card", "gallery", "contacts"],
  wali_kelas: ["overview", "news", "calendar", "student-card", "gallery"],
  pembina_ekstra: ["overview", "news", "calendar", "student-card", "gallery"],
  guru: ["overview", "news", "calendar", "student-card"],
  student: ["overview", "calendar", "student-card"],
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
    { value: "student", label: "Siswa" },
  ];
  res.json(roles);
}

// Allows a new user (non-admin) to select their own role (guru/student only)
const SELF_SELECTABLE_ROLES = ["guru", "student"];

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
