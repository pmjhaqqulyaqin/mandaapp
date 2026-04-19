import { Request, Response, NextFunction } from 'express';
import { auth } from './index';
import { fromNodeHeaders } from 'better-auth/node';
import { db } from '../../db';
import { user as userTable } from '../../db/schema';
import { eq } from 'drizzle-orm';

// Extend Express Request to carry authenticated user info
declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        role: string;
        email: string;
        name: string;
      };
    }
  }
}

type UserRole =
  | 'admin'
  | 'kepala_madrasah'
  | 'wakil_kepala'
  | 'kepala_unit'
  | 'wali_kelas'
  | 'pembina_ekstra'
  | 'guru'
  | 'kepala_tu'
  | 'pegawai_tu'
  | 'student';

/**
 * Authentication middleware — verifies session via better-auth.
 * Sets `req.authUser` with { id, role, email, name } on success.
 * Returns 401 if no valid session found.
 */
export function requireAuth(allowedRoles?: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!session?.user) {
        return res.status(401).json({ error: 'Unauthorized. Silakan login terlebih dahulu.' });
      }

      const user = session.user as any;
      const role = user.role || 'student';

      // Check if user is banned
      if (user.banned) {
        return res.status(403).json({ error: 'Akun Anda telah diblokir.' });
      }

      // Role-based access check
      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role as UserRole)) {
        return res.status(403).json({ error: 'Anda tidak memiliki akses ke resource ini.' });
      }

      // Attach user info to request
      req.authUser = {
        id: user.id,
        role,
        email: user.email,
        name: user.name,
      };

      next();
    } catch (error) {
      console.error('[AUTH MIDDLEWARE] Session verification failed:', error);
      return res.status(401).json({ error: 'Session tidak valid. Silakan login ulang.' });
    }
  };
}

/**
 * Shortcut: require admin role only
 */
export const requireAdmin = requireAuth(['admin']);

/**
 * Shortcut: require any staff role (non-student)
 */
export const requireStaff = requireAuth([
  'admin', 'kepala_madrasah', 'wakil_kepala', 'kepala_unit',
  'wali_kelas', 'pembina_ekstra', 'guru', 'kepala_tu', 'pegawai_tu'
]);
