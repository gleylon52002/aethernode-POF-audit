// Bank Mode — tek kaynak domain listesi (main / renderer / guest).

export const BANK_DOMAINS = [
  // TR — kamu ve özel bankalar
  'ziraatbank.com.tr',
  'ziraatbank.com',
  'ziraatkatilim.com.tr',
  'halkbank.com.tr',
  'vakifbank.com.tr',
  'vakifkatilim.com.tr',
  'emlakkatilim.com.tr',
  'garanti.com.tr',
  'garantibbva.com.tr',
  'isbank.com.tr',
  'iscep.com.tr',
  'yapikredi.com.tr',
  'ykb.com',
  'akbank.com',
  'denizbank.com',
  'qnbfinansbank.com',
  'qnb.com.tr',
  'teb.com.tr',
  'ing.com.tr',
  'hsbc.com.tr',
  'sekerbank.com.tr',
  'fibabanka.com.tr',
  'odeabank.com.tr',
  'alternatifbank.com.tr',
  'anadolubank.com.tr',
  'burgan.com.tr',
  'icbc.com.tr',
  'turkishbank.com',
  'aktifbank.com.tr',
  // TR — katılım bankaları
  'kuveytturk.com.tr',
  'albaraka.com.tr',
  'turkiyefinans.com.tr',
  // TR — fintech / e-para
  'enpara.com',
  'papara.com',
  'tosla.com',
  'param.com.tr',
  'ininal.com',
  'paycell.com.tr',
  'colendi.com',
  // TR — yatırım / borsa
  'midastrade.com',
  'gedik.com',
  'isyatirim.com.tr',
  'garantibbvayatirim.com.tr',
  // Kripto borsaları (finansal hassasiyet aynı)
  'btcturk.com',
  'paribu.com',
  'binance.com',
  'binance.tr',
  'coinbase.com',
  'kraken.com',
  'okx.com',
  'bybit.com',
  // Global bankalar
  'paypal.com',
  'chase.com',
  'bankofamerica.com',
  'wellsfargo.com',
  'citi.com',
  'citibank.com',
  'capitalone.com',
  'americanexpress.com',
  'hsbc.com',
  'barclays.com',
  'lloydsbank.com',
  'santander.com',
  'bbva.com',
  'deutsche-bank.de',
  'ubs.com',
  'ing.com',
  'rabobank.com',
  'nordea.com',
  // Neo-bankalar / transfer
  'revolut.com',
  'wise.com',
  'n26.com',
  'monzo.com',
  'starlingbank.com',
  'bunq.com',
  'stripe.com',
  'payoneer.com',
  'westernunion.com',
  'moneygram.com',
  // Yatırım platformları
  'schwab.com',
  'fidelity.com',
  'vanguard.com',
  'ally.com',
  'etrade.com',
  'robinhood.com',
  'interactivebrokers.com',
  'ibkr.com',
] as const;

const BANK_SET = new Set<string>(BANK_DOMAINS);

export function isBankDomain(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  if (BANK_SET.has(host)) return true;
  for (const d of BANK_SET) {
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
