import { Request, Response, NextFunction } from 'express';
import path from 'path';

/**
 * Sanitize a filename to prevent path traversal attacks.
 * Only allows alphanumeric, hyphens, underscores, dots, and spaces.
 * Rejects any path separators or parent-directory sequences.
 */
export function sanitizeFilename(filename: string): string | null {
  if (!filename || typeof filename !== 'string') return null;

  // Reject if it contains path traversal sequences
  if (
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('\0')  // null byte injection
  ) {
    return null;
  }

  // Only allow safe characters: alphanumeric, hyphens, underscores, dots, spaces
  const safe = /^[a-zA-Z0-9_\-. ]+$/;
  if (!safe.test(filename)) return null;

  // Ensure the resolved path stays within the expected directory
  return filename;
}

/**
 * Validate that a resolved file path is within the allowed base directory.
 * Prevents path traversal even if sanitizeFilename is bypassed.
 */
export function isPathWithinDir(filePath: string, baseDir: string): boolean {
  const resolved = path.resolve(filePath);
  const resolvedBase = path.resolve(baseDir);
  return resolved.startsWith(resolvedBase + path.sep) || resolved === resolvedBase;
}

/**
 * Middleware: validate :filename param against path traversal.
 * Use on any route that serves files from the uploads directory.
 */
export function validateFilenameParam(req: Request, res: Response, next: NextFunction) {
  const filename = req.params.filename;

  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  const sanitized = sanitizeFilename(filename);
  if (!sanitized) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  // Double-check: resolved path must stay within uploads directory
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const resolvedPath = path.join(uploadsDir, sanitized);

  if (!isPathWithinDir(resolvedPath, uploadsDir)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  // Attach sanitized filename so downstream handlers use the safe version
  (req as any).sanitizedFilename = sanitized;
  next();
}

/**
 * Validate UUID format (v4).
 * Returns true if the string is a valid UUID, false otherwise.
 */
export function isValidUUID(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Middleware: validate :id param as UUID.
 */
export function validateUUIDParam(paramName: string = 'id') {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    if (!id || !isValidUUID(id)) {
      return res.status(400).json({ error: `Invalid ${paramName} format` });
    }
    next();
  };
}

/**
 * Truncate a string to a maximum length (safe for DB columns).
 */
export function truncateString(str: string | null | undefined, maxLength: number): string | null {
  if (!str) return null;
  return str.substring(0, maxLength);
}
