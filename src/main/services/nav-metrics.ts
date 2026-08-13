/**
 * Gezinti dwell (sayfada kalma süresi) + path/subdomain yardımcıları.
 */
export function parsePage(url: string): {
  host: string;
  subdomain: string;
  path: string;
  page: string;
} {
  try {
    const u = new URL(url);
    const host = u.hostname || 'unknown';
    const path = (u.pathname || '/').replace(/\/+/g, '/') || '/';
    const labels = host.split('.').filter(Boolean);
    const subdomain =
      labels.length > 2 ? labels.slice(0, -2).join('.') || labels[0]! : labels[0] || host;
    return {
      host,
      subdomain,
      path,
      page: `${host}${path === '/' ? '' : path}`,
    };
  } catch {
    return { host: 'unknown', subdomain: 'unknown', path: '/', page: 'unknown' };
  }
}
