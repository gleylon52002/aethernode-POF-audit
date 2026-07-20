import type { ZodSchema } from 'zod';
import { err, ok, type Result } from '../types/result';

// IPC handler'larında payload doğrulamak için merkezi yardımcı.
// Doğrulama başarısızsa güvenli Result<Err> döner; main process asla
// doğrulanmamış veriyi işlemez.
export function validate<T>(schema: ZodSchema<T>, payload: unknown): Result<T> {
  const parsed = schema.safeParse(payload);
  if (parsed.success) {
    return ok(parsed.data);
  }
  const first = parsed.error.issues[0];
  return err(
    `${first?.path.join('.') ?? 'payload'}: ${first?.message ?? 'validation failed'}`,
    'VALIDATION',
  );
}