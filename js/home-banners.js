// frontend/js/home-banners.js
import { apiGet } from "./api.js";

export const BANNER_PLACEMENT_EVENTS_INLINE = "events_inline";

/**
 * Ritorna HTML card banner.
 * Manteniamo tracking click server-side (POST /banners/:id/click) come nel codice attuale.
 */
export function renderBannerCard(b) {
  if (!b) return "";
  const title = b.title || "Sponsor";
  const subtitle = b.subtitle || "";
  const cta = b.ctaText || "Scopri";
  const id = b._id || "";

  return `
    <article class="gw-rail gw-banner" data-kind="banner" data-banner-id="${id}">
      <div class="gw-card-scroll">
        <div class="gw-thumb"></div>
        <div class="content">
          <h3 class="title">${title}</h3>
          ${subtitle ? `<div class="meta"><span>${subtitle}</span></div>` : ""}
          <div class="meta" style="margin-top:8px;">
            <button class="btn" type="button" data-action="banner-click" data-banner-id="${id}">${cta}</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

/**
 * Applica la logica attuale:
 * - prende 1 banner "active" per placement
 * - targeting country/region
 * - lo inserisce DOPO la prima card (se c'è almeno 1 evento)
 * Ritorna una lista items dove items può includere {__kind:'banner', ...}.
 */
export async function applyInlineBanner({ events, country, region }) {
  const base = Array.isArray(events) ? events : [];
  if (base.length === 0) return base;

  // fetch banner attivo (logica attuale semplice)
  const qs = new URLSearchParams({
    placement: BANNER_PLACEMENT_EVENTS_INLINE,
    country: country || "",
    region: region || "",
    __ts: String(Date.now()),
  });

  let bannerItem = null;
  try {
    const r = await apiGet(`/banners/active?${qs.toString()}`);
    if (r?.ok && r?.banner) {
      bannerItem = { __kind: "banner", ...r.banner };
    }
  } catch {
    // silenzioso: se fallisce, niente banner
  }

  if (!bannerItem) return base;

  // injection dopo la prima card
  const out = [];
  out.push(base[0]);
  out.push(bannerItem);
  for (let i = 1; i < base.length; i++) out.push(base[i]);
  return out;
}
