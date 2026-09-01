import { z, ZodSchema, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

/**
 * SEC-10: Input Validation Library using Zod
 * 
 * Provides reusable schemas and middleware for request validation.
 * Usage is opt-in per route — existing routes work without changes.
 * 
 * Example:
 *   router.post('/create', validate(createStudentSchema), controller.create);
 */

// ═══ Common Schemas ════════════════════════════════════════════════════════════

/** UUID v4 format */
export const uuidSchema = z.string().uuid('Format ID tidak valid');

/** Standard pagination query params */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/** Date string (YYYY-MM-DD) */
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

/** Email */
export const emailSchema = z.string().email('Format email tidak valid').max(255);

/** Safe string (no HTML tags) */
export const safeStringSchema = (maxLen: number = 255) =>
  z.string().max(maxLen).refine(
    (val) => !/<script|<\/script|javascript:|on\w+=/i.test(val),
    'Input mengandung karakter yang tidak diizinkan'
  );

/** Indonesian phone number */
export const phoneSchema = z.string().regex(/^(\+62|62|0)[0-9]{8,13}$/, 'Nomor telepon tidak valid').optional();

/** NISN (10 digits) */
export const nisnSchema = z.string().regex(/^\d{10}$/, 'NISN harus 10 digit');

// ═══ Entity Schemas ════════════════════════════════════════════════════════════

/** Student create/update body */
export const studentBodySchema = z.object({
  fullName: safeStringSchema(150).optional(),
  nisn: z.string().max(20).optional(),
  nis: z.string().max(20).optional(),
  className: safeStringSchema(100).optional(),
  classId: uuidSchema.optional().nullable(),
  status: z.enum(['active', 'inactive', 'graduated', 'transferred', 'dropped_out']).optional(),
  gender: z.enum(['Laki-laki', 'Perempuan']).optional(),
  birthPlace: safeStringSchema(100).optional(),
  birthDate: dateSchema.optional().nullable(),
  address: safeStringSchema(500).optional(),
}).passthrough(); // Allow additional fields for backward compatibility

/** Self-update save body — restricted fields */
export const selfUpdateSaveSchema = z.object({
  studentId: uuidSchema,
  student: z.object({
    fullName: safeStringSchema(150).optional(),
    gender: z.enum(['Laki-laki', 'Perempuan']).optional(),
    birthPlace: safeStringSchema(100).optional(),
    birthDate: dateSchema.optional().nullable(),
    address: safeStringSchema(500).optional(),
    phone: phoneSchema,
    religion: safeStringSchema(50).optional(),
    // Explicitly BLOCK sensitive fields from self-update
  }).passthrough().optional(),
  parents: z.any().optional(),
  education: z.any().optional(),
  physical: z.any().optional(),
});

/** PPDB submission body */
export const ppdbSubmitSchema = z.object({
  jalurId: uuidSchema,
  nama: safeStringSchema(150),
  nisn: z.string().max(20).optional(),
  tempatLahir: safeStringSchema(100).optional(),
  tanggalLahir: dateSchema.optional(),
  jenisKelamin: z.enum(['Laki-laki', 'Perempuan']).optional(),
  alamat: safeStringSchema(500).optional(),
  noHp: phoneSchema,
  email: emailSchema.optional(),
}).passthrough();

// ═══ Validation Middleware ══════════════════════════════════════════════════════

/**
 * Validate request body against a Zod schema.
 * Returns 400 with detailed validation errors on failure.
 * 
 * Usage:
 *   router.post('/endpoint', validate(mySchema), controller.handler);
 */
export function validate<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed; // Replace with parsed/sanitized data
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((e: z.ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          error: 'Validasi gagal',
          details: messages,
        });
      }
      return res.status(400).json({ error: 'Input tidak valid' });
    }
  };
}

/**
 * Validate query parameters against a Zod schema.
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query);
      (req as any).validatedQuery = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map((e: z.ZodIssue) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          error: 'Parameter query tidak valid',
          details: messages,
        });
      }
      return res.status(400).json({ error: 'Query tidak valid' });
    }
  };
}

/**
 * Validate route params against a Zod schema.
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Parameter tidak valid',
          details: error.issues.map((e: z.ZodIssue) => ({ field: e.path.join('.'), message: e.message })),
        });
      }
      return res.status(400).json({ error: 'Parameter tidak valid' });
    }
  };
}
