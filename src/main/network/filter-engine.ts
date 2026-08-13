import { app, net } from 'electron';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { logger } from '@main/utils/logger';
import { isBlockedDomain as isStaticBlocked } from './blocklist';
import { SEED_AD_DOMAINS } from './seed-domains';

/**
 * Gelişmiş reklam/izleyici ağı — dengeli (siteleri bozmayan) + otomatik güncelleme.
 * StevenBlack kaldırıldı (yanlış pozitif / arama bozulması).
 * Arama motorları ve YouTube CDN allowlist'te.
 */

const UPDATE_INTERVAL_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 90_000;
const CACHE_VERSION = 'v2';

const SOURCES: ReadonlyArray<{ id: string; url: string; kind: 'hosts' | 'abp' | 'domains' }> = [
  {
    id: 'hagezi-light',
    url: 'https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/domains/light.txt',
    kind: 'domains',
  },
  {
    id: 'easylist',
    url: 'https://easylist.to/easylist/easylist.txt',
    kind: 'abp',
  },
  {
    id: 'easyprivacy',
    url: 'https://easylist.to/easylist/easyprivacy.txt',
    kind: 'abp',
  },
];

/** Asla engellenmez — arama, YT oynatma, fontlar */
const ALLOWLIST: readonly string[] = [
  // YouTube
  'googlevideo.com',
  'ytimg.com',
  'ggpht.com',
  'youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'youtubekids.com',
  'youtubei.googleapis.com',
  'jnn-pa.googleapis.com',
  'yt.be',
  // Fonts / static
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'gstatic.com',
  // Arama motorları (+ CDN)
  'duckduckgo.com',
  'duck.com',
  'external-content.duckduckgo.com',
  'improving.duckduckgo.com',
  'startpage.com',
  'search.brave.com',
  'brave.com',
  'ecosia.org',
  'qwant.com',
  'searx.be',
  'bing.com',
  'www.bing.com',
  'yandex.com',
  'yandex.com.tr',
  'ya.ru',
  // Google arama / captcha (reklam alt alanları aşağıda hariç)
  'google.com',
  'google.com.tr',
  'google.co.uk',
  'googleapis.com',
  'recaptcha.net',
  'g.co',
  // Marka
  'aethernode.com',
  'superadblocktest.com',
  // Çeviri
  'translate.google.com',
  'translate.googleapis.com',
];

/** Allowlist içinde bile engellenir */
const ALLOWLIST_EXCEPTIONS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'pagead2.googlesyndication.com',
  'adservice.google.com',
  'ads.youtube.com',
  'imasdk.googleapis.com',
  'googleads.g.doubleclick.net',
  'static.doubleclick.net',
];

function eTld1(hostname: string): string {
  const parts = hostname.toLowerCase().replace(/\.$/, '').split('.');
  if (parts.length <= 2) return parts.join('.');
  const multi = new Set(['co.uk', 'com.tr', 'com.br', 'co.jp', 'com.au', 'co.in']);
  const last2 = parts.slice(-2).join('.');
  if (multi.has(last2) && parts.length >= 3) return parts.slice(-3).join('.');
  return last2;
}

export function isSameSite(a: string, b: string): boolean {
  try {
    return eTld1(a) === eTld1(b);
  } catch {
    return false;
  }
}

function isAllowlisted(hostname: string): boolean {
  let host = hostname.toLowerCase();
  if (host.endsWith('.')) host = host.slice(0, -1);

  for (const ex of ALLOWLIST_EXCEPTIONS) {
    if (host === ex || host.endsWith('.' + ex)) return false;
  }

  // googleads / pagead her zaman engel
  if (/^(ads|adservice|pagead|googleads|ade)\./.test(host) && host.includes('google')) {
    return false;
  }

  for (const d of ALLOWLIST) {
    if (host === d || host.endsWith('.' + d)) return true;
  }

  // google.com.* ülke TLD
  if (/^([a-z0-9-]+\.)*google\.[a-z.]+$/.test(host)) {
    if (/(adservice|pagead|googleads|doubleclick|syndication)/.test(host)) return false;
    return true;
  }

  return false;
}

let dynamicSet = new Set<string>(SEED_AD_DOMAINS);
let lastUpdatedAt = 0;
let updateTimer: NodeJS.Timeout | null = null;
let updating = false;

function cacheDir(): string {
  const dir = join(app.getPath('userData'), 'filter-cache');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function cacheFile(): string {
  return join(cacheDir(), `domains-${CACHE_VERSION}.txt`);
}

function metaFile(): string {
  return join(cacheDir(), `meta-${CACHE_VERSION}.json`);
}

function matchesSet(hostname: string, set: Set<string>): boolean {
  let host = hostname.toLowerCase();
  if (host.endsWith('.')) host = host.slice(0, -1);
  while (host.length > 0) {
    if (set.has(host)) return true;
    const dot = host.indexOf('.');
    if (dot === -1) return false;
    host = host.slice(dot + 1);
  }
  return false;
}

export function isFilterBlocked(hostname: string): boolean {
  if (!hostname) return false;
  if (isAllowlisted(hostname)) return false;
  // İlk 5 sn: dinamik cache henüz yüklenmediyse statik blocklist fallback (boot koruması)
  if (lastUpdatedAt === 0 && isStaticBlocked(hostname)) return true;
  return matchesSet(hostname, dynamicSet);
}

// Yüksek güvenilirlikli set — el ile derlenmiş reklam ağları.
// Video player iframe'leri / medya akışları YALNIZCA bu setten engellenir;
// devasa dinamik listeler (easylist vb.) gömülü oynatıcıları kırabiliyor.
const seedSet = new Set<string>(SEED_AD_DOMAINS);

/**
 * İlk parti isteklere dokunma (CSS/JS/görsel kırılmasın).
 * Yalnızca üçüncü parti bilinen reklam/izleyici domain'leri kesilir.
 *
 * subFrame / media / object istekleri için sadece yüksek güvenilirlikli
 * listeler kullanılır — dizi/video sitelerindeki gömülü player'lar
 * yanlış pozitife kurban gitmesin.
 */
export function shouldBlockRequest(
  hostname: string,
  resourceType: string,
  referrer: string,
): boolean {
  if (!hostname) return false;
  if (isAllowlisted(hostname)) return false;

  if (referrer) {
    try {
      const refHost = new URL(referrer).hostname;
      if (isSameSite(hostname, refHost)) return false;
    } catch {
      /* yoksay */
    }
  }

  if (resourceType === 'subFrame' || resourceType === 'media' || resourceType === 'object') {
    return isStaticBlocked(hostname) || matchesSet(hostname, seedSet);
  }

  return isFilterBlocked(hostname);
}

export function filterStats(): { domains: number; lastUpdatedAt: number } {
  return { domains: dynamicSet.size, lastUpdatedAt };
}

function parseDomainsFile(text: string, kind: 'hosts' | 'abp' | 'domains'): Set<string> {
  const out = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;

    if (kind === 'hosts') {
      const m = line.match(/^(?:0\.0\.0\.0|127\.0\.0\.1)\s+(\S+)/i);
      if (!m) continue;
      line = m[1]!;
    } else if (kind === 'abp') {
      const m = line.match(/^\|\|([a-z0-9.-]+\.[a-z]{2,})(?:\^|\/|$)/i);
      if (!m) continue;
      line = m[1]!;
    } else if (line.includes(' ') || line.includes('/')) {
      continue;
    }

    const host = line.toLowerCase().replace(/^\*\./, '').replace(/\.$/, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) || host.length > 120) continue;
    // Allowlist'tekileri sete hiç ekleme
    if (isAllowlisted(host)) continue;
    out.add(host);
  }
  return out;
}

async function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = net.request({ url, method: 'GET' });
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => {
      try {
        req.abort();
      } catch {
        /* yoksay */
      }
      reject(new Error(`timeout ${url}`));
    }, FETCH_TIMEOUT_MS);

    req.on('response', (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 400) {
        clearTimeout(timer);
        reject(new Error(`HTTP ${status} ${url}`));
        return;
      }
      const encoding = String(res.headers['content-encoding'] || '');
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        clearTimeout(timer);
        const buf = Buffer.concat(chunks);
        if (encoding.includes('gzip')) {
          try {
            resolve(gunzipSync(buf).toString('utf8'));
            return;
          } catch {
            /* fallthrough */
          }
        }
        resolve(buf.toString('utf8'));
      });
      res.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    req.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    req.end();
  });
}

function loadCacheFromDisk(): void {
  try {
    // Eski agresif v1 önbelleğini temizle
    try {
      const old = join(cacheDir(), 'domains-v1.txt');
      if (existsSync(old)) unlinkSync(old);
    } catch {
      /* yoksay */
    }
    const file = cacheFile();
    if (!existsSync(file)) return;
    const text = readFileSync(file, 'utf8');
    const next = new Set<string>();
    for (const line of text.split(/\r?\n/)) {
      const h = line.trim().toLowerCase();
      if (h && !h.startsWith('#') && !isAllowlisted(h)) next.add(h);
    }
    if (next.size > 1000) {
      dynamicSet = next;
      try {
        const meta = JSON.parse(readFileSync(metaFile(), 'utf8')) as { lastUpdatedAt?: number };
        lastUpdatedAt = meta.lastUpdatedAt ?? 0;
      } catch {
        lastUpdatedAt = 0;
      }
      logger.info('Filtre önbelleği yüklendi', { domains: dynamicSet.size, ver: CACHE_VERSION });
    }
  } catch (err) {
    logger.warn('Filtre önbelleği okunamadı', { err: String(err) });
  }
}

function saveCache(domains: Set<string>): void {
  const tmp = join(cacheDir(), `domains-${CACHE_VERSION}.tmp`);
  const body = ['# AetherNode filter cache', `# ${new Date().toISOString()}`, ...[...domains].sort()].join(
    '\n',
  );
  writeFileSync(tmp, body, 'utf8');
  renameSync(tmp, cacheFile());
  writeFileSync(
    metaFile(),
    JSON.stringify({
      lastUpdatedAt: Date.now(),
      domains: domains.size,
      sources: SOURCES.map((s) => s.id),
      ver: CACHE_VERSION,
    }),
    'utf8',
  );
}

export async function updateFilterLists(force = false): Promise<{ ok: boolean; domains: number }> {
  if (updating) return { ok: false, domains: dynamicSet.size };
  if (!force && lastUpdatedAt > 0 && Date.now() - lastUpdatedAt < UPDATE_INTERVAL_MS) {
    return { ok: true, domains: dynamicSet.size };
  }

  updating = true;
  const merged = new Set<string>();
  const hashes: Record<string, string> = {};
  try {
    for (const src of SOURCES) {
      try {
        logger.info('Filtre listesi indiriliyor', { id: src.id });
        const text = await fetchText(src.url);
        const hash = createHash('sha256').update(text, 'utf8').digest('hex');
        hashes[src.id] = hash;
        // Bütünlük: boş/corrupt içerik hash'i yakalanır — parse edilemezse kaynağı atla
        if (!text || text.trim().length < 200) {
          logger.warn('Filtre listesi çok kısa — bütünlük hatası, atlandı', { id: src.id, len: text.length, hash: hash.slice(0, 12) });
          continue;
        }
        const parsed = parseDomainsFile(text, src.kind);
        if (parsed.size === 0 && text.length > 1000) {
          logger.warn('Filtre listesi parse edilemedi — bütünlük hatası, atlandı', { id: src.id, hash: hash.slice(0, 12) });
          continue;
        }
        for (const h of parsed) merged.add(h);
        logger.info('Filtre listesi işlendi', { id: src.id, count: parsed.size, hash: hash.slice(0, 12) });
      } catch (err) {
        logger.warn('Filtre listesi atlandı', { id: src.id, err: String(err) });
      }
    }

    for (const d of SEED_AD_DOMAINS) {
      if (!isAllowlisted(d)) merged.add(d);
    }

    if (merged.size < 5000) {
      logger.warn('Filtre güncellemesi yetersiz — eski set korunuyor', { got: merged.size, hashes });
      return { ok: false, domains: dynamicSet.size };
    }

    dynamicSet = merged;
    lastUpdatedAt = Date.now();
    saveCacheWithHashes(merged, hashes);
    logger.info('Filtre ağı güncellendi', { domains: merged.size, hashes });
    return { ok: true, domains: merged.size };
  } finally {
    updating = false;
  }
}

function saveCacheWithHashes(domains: Set<string>, hashes: Record<string, string>): void {
  saveCache(domains);
  try {
    const meta = JSON.parse(readFileSync(metaFile(), 'utf8')) as Record<string, unknown>;
    writeFileSync(metaFile(), JSON.stringify({ ...meta, hashes }), 'utf8');
  } catch { /* yoksay */ }
}

export function enableFilterEngine(): void {
  for (const d of SEED_AD_DOMAINS) {
    if (!isAllowlisted(d)) dynamicSet.add(d);
  }
  loadCacheFromDisk();
  for (const d of SEED_AD_DOMAINS) {
    if (!isAllowlisted(d)) dynamicSet.add(d);
  }
  // v2 geçişi: zorla bir kez güncelle
  void updateFilterLists(true).catch((err) =>
    logger.warn('İlk filtre güncellemesi başarısız', { err: String(err) }),
  );
  if (updateTimer) clearInterval(updateTimer);
  updateTimer = setInterval(() => {
    void updateFilterLists(false);
  }, UPDATE_INTERVAL_MS);
  updateTimer.unref?.();
}
