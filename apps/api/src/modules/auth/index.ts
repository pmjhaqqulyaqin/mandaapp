import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "../../db";
import { user, session, account, verification } from "../../db/schema";
import {
  ac,
  adminRole,
  kepalaMadrasahRole,
  wakilKepalaRole,
  kepalaUnitRole,
  waliKelasRole,
  pembinaEkstraRole,
  guruRole,
  kepalaTURole,
  pegawaiTURole,
  studentRole,
  operatorRole,
} from "./permissions";

if (!process.env.BETTER_AUTH_SECRET) {
  console.error("[AUTH ERROR] BETTER_AUTH_SECRET is not set! Authentication will fail.");
} else {
  console.log("[AUTH CONFIG] BETTER_AUTH_SECRET is configured.");
}

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error("[AUTH ERROR] Google OAuth credentials (ID or SECRET) are missing!");
} else {
  console.log(`[AUTH CONFIG] Google Client ID: ${process.env.GOOGLE_CLIENT_ID.substring(0, 10)}... (Present)`);
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  baseURL: (() => {
    const rawUrl = process.env.BETTER_AUTH_URL || "http://localhost:3001";
    // baseURL must include the /api/auth path
    const base = rawUrl.replace(/\/$/, "").replace(/\/api\/auth$/, "");
    const finalUrl = base + "/api/auth";
    console.log(`[AUTH CONFIG] Final baseURL: ${finalUrl}`);
    return finalUrl;
  })(),

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "not-configured",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "not-configured",
      prompt: "select_account",
    },
  },
  onAPIError: {
    errorURL: (process.env.FRONTEND_URL || "http://localhost:5173") + "/login",
  },
  trustedOrigins: [
    "https://mandaapp-web-theta.vercel.app",
    "http://localhost:5173",
    "http://localhost:5174",
    (process.env.FRONTEND_URL || "").replace(/\/$/, ""),
  ].filter(Boolean),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "student",
      },
    },
  },
  plugins: [
    admin({
      ac,
      roles: {
        admin: adminRole,
        kepala_madrasah: kepalaMadrasahRole,
        wakil_kepala: wakilKepalaRole,
        kepala_unit: kepalaUnitRole,
        wali_kelas: waliKelasRole,
        pembina_ekstra: pembinaEkstraRole,
        guru: guruRole,
        kepala_tu: kepalaTURole,
        pegawai_tu: pegawaiTURole,
        student: studentRole,
        operator: operatorRole,
      },
      defaultRole: "student",
      adminRoles: ["admin"],
      defaultBanReason: "Pelanggaran aturan",
      bannedUserMessage:
        "Akun Anda telah diblokir. Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.",
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days in seconds
    updateAge: 60 * 60 * 24, // Refresh session token every 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // Cache cookie for 5 minutes to reduce DB lookups
    },
  },
  advanced: {
    useSecureCookies: true,
    crossDomain: true, // Crucial for cross-domain cookie handling
    defaultCookieAttributes: {
      sameSite: "None",
      secure: true,
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days - persist cookie across browser restarts
    }
  }
});

// Create Express handler for better-auth (initialized once)
import { toNodeHandler } from "better-auth/node";
export const authHandler = toNodeHandler(auth);
