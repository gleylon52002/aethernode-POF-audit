// Minimal, telemetri içermeyen yerel loglayıcı. Hiçbir veriyi
// ağ üzerinden göndermez — yalnızca konsola yazar.
type Level = 'info' | 'warn' | 'error';

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  const ts = new Date().toISOString();
  const line = meta ? `${ts} [${level}] ${message} ${JSON.stringify(meta)}` : `${ts} [${level}] ${message}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (m: string, meta?: Record<string, unknown>) => emit('info', m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => emit('warn', m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit('error', m, meta),
};