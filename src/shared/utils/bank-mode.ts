// Bank Mode — renderer tarafı domain eşleşmesi (main ile aynı liste).

const BANK_DOMAINS = new Set([
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

export function isBankUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (BANK_DOMAINS.has(host)) return true;
    for (const d of BANK_DOMAINS) {
      if (host.endsWith(`.${d}`)) return true;
    }
    return false;
  } catch {
    return false;
  }
}
