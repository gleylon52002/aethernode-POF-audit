// Tüm sürecin ortak kullandığı temel tipler.

export type ID = string;

export type Ok<T = unknown> = { ok: true; data: T };
export type Err = { ok: false; error: string; code?: string };
export type Result<T = unknown> = Ok<T> | Err;

export function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}
export function err(error: string, code?: string): Err {
  return { ok: false, error, code };
}