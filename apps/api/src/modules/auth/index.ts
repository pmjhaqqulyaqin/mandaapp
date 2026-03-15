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
  studentRole,
} from "./permissions";

if (!process.env.BETTER_AUTH_SECRET) {
  console.warn("[AUTH WARNING] BETTER_AUTH_SECRET is not set in environment variables!");
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
  baseURL: (process.env.BETTER_AUTH_URL || "http://localhost:3001").replace(/\/$/, "").replace(/\/api\/auth$/, "") + "/api/auth",

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
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
        student: studentRole,
      },
      defaultRole: "student",
      adminRoles: ["admin"],
      defaultBanReason: "Pelanggaran aturan",
      bannedUserMessage:
        "Akun Anda telah diblokir. Silakan hubungi administrator jika Anda merasa ini adalah kesalahan.",
    }),
  ],
  advanced: {
    useSecureCookies: true,
    crossDomain: true, // Crucial for cross-domain cookie handling
    defaultCookieAttributes: {
      sameSite: "None",
      secure: true,
      httpOnly: true,
    }
  }
});

// Create Express handler for better-auth (initialized once)
import { toNodeHandler } from "better-auth/node";
export const authHandler = toNodeHandler(auth);
