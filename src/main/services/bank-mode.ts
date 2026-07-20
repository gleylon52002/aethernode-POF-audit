// Bank Mode — finans sitelerinde otomatik izole güvenli alan.
// Domain eşleşmesi O(1) Set lookup + alt alan adı desteği.

const BANK_DOMAINS = new Set([
  // TR
  'ziraatbank.com.tr',
  'garanti.com.tr',
  'garantibbva.com.tr',
  'isbank.com.tr',
  'yapikredi.com.tr',
  'akbank.com',
  'denizbank.com',
  'qnbfinansbank.com',
  'teb.com.tr',
  'halkbank.com.tr',
  'vakifbank.com.tr',
  'ing.com.tr',
  'enpara.com',
  'papara.com',
  'tosla.com',
  'param.com.tr',
  // Global
  'paypal.com',
  'chase.com',
  'bankofamerica.com',
  'wellsfargo.com',
  'citi.com',
  'capitalone.com',
  'americanexpress.com',
  'revolut.com',
  'wise.com',
  'stripe.com',
  'schwab.com',
  'fidelity.com',
  'vanguard.com',
  'ally.com',
]);

export function isBankDomain(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  if (BANK_DOMAINS.has(host)) return true;
  for (const d of BANK_DOMAINS) {
    if (host.endsWith(`.${d}`)) return true;
  }
  return false;
}

export function isBankUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    return isBankDomain(u.hostname);
  } catch {
    return false;
  }
}
