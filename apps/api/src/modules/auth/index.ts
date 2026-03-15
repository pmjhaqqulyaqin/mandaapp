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
  baseURL: (process.env.BETTER_AUTH_URL || "http://localhost:3001").replace(/\/$/, "").endsWith("/api/auth") 
    ? (process.env.BETTER_AUTH_URL || "http://localhost:3001").replace(/\/$/, "")
    : `${(process.env.BETTER_AUTH_URL || "http://localhost:3001").replace(/\/$/, "")}/api/auth`,

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
    (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, ""),
    "http://localhost:5174",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ],
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
    defaultCookieAttributes: {
      sameSite: "None", // Required for cross-domain sessions (vercel.app -> railway.app)
      secure: true,     // Must be true when sameSite is "None"
    }
  }
});

// Create Express handler for better-auth (initialized once)
import { toNodeHandler } from "better-auth/node";
export const authHandler = toNodeHandler(auth);
