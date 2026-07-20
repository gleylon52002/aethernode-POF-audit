// Tracking parametresi temizleyici (UrlTrackerCleaner).
// URL'lerden izleme amaçlı query string parametrelerini kaldırır.
// Hem main (networkGuard yönlendirmesi) hem renderer (adres çubuğu) kullanır.

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_name',
  'utm_cid',
  'utm_reader',
  'utm_viz_id',
  'utm_pubreferrer',
  'utm_swu',
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'twclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'yclid',
  'vero_id',
  'vero_conv',
  '_openstat',
  'oly_anon_id',
  'oly_enc_id',
  'wickedid',
  's_cid',
  'mkt_tok',
  '_hsenc',
  '_hsmi',
  'hsa_acc',
  'hsa_cam',
  'hsa_grp',
  'hsa_ad',
  'hsa_src',
  'hsa_tgt',
  'hsa_kw',
  'hsa_mt',
  'hsa_net',
  'hsa_ver',
  'ref_src',
  'ref_url',
  'spm',
  'scm',
  'pk_campaign',
  'pk_kwd',
  'pk_source',
  'pk_medium',
  'piwik_campaign',
  'piwik_kwd',
  'matomo_campaign',
  'mtm_campaign',
  'mtm_source',
  'mtm_medium',
]);

// URL'den bilinen izleme parametrelerini kaldırır; URL değişmediyse
// aynı string'i döner (gereksiz redirect önlemek için).
export function cleanTrackingParams(rawUrl: string): string {
  if (!/^https?:\/\//i.test(rawUrl) || !rawUrl.includes('?')) return rawUrl;
  try {
    const url = new URL(rawUrl);
    let changed = false;
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    return changed ? url.toString() : rawUrl;
  } catch {
    return rawUrl;
  }
}
