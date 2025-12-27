// frontend/js/home-banners.js
import { apiGet } from "./api.js";

// === Config ===
export const BANNER_PLACEMENT_EVENTS_INLINE = "events_list_inline";
export const BANNER_BATCH_SIZE = 8;
export const BANNER_ROTATE_MS = 4500;
export const BANNER_REFRESH_MS = 150000; // 2.5 minuti

// === Internal state (shared across all banner slots) ===
let bannerQueue = [];
let bannerIndex = 0;
let isFetching = false;
let lastFetchTs = 0;

let visibleSlots = new Set();
let rotateTimer = null;

/**
 * Inserisce SLOT banner (non banner veri) nella lista eventi:
 * - dopo la prima card evento
 * - poi ogni 2 card evento
 *
 * Nota: gli slot pescano tutti dalla stessa queue.
 */
export function injectBannerSlots(events) {
  const arr = Array.isArray(events) ? events : [];
  const out = [];

  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]);

    // after first, then every 2
    if (i === 0 || (i > 0 && i % 2 === 0)) {
      out.push({ __kind: "banner-slot" });
    }
  }

  return out;
}

/**
 * HTML dello slot banner (contenitore vuoto che poi riempiamo con renderBannerCard()).
 */
export function renderBannerSlotHTML() {
  return `
    <article class="gw-rail gw-banner" data-kind="banner-slot" data-banner-slot="1"></article>
  `.trim();
}

/**
 * Fetch batch di banner (queue).
 * Usa /api/banners/active-batch che torna { ok:true, data:[...] }.
 */
async function fetchBannerBatch({ country = "", region = "", token } = {}) {
  if (isFetching) return;
  isFetching = true;

  try {
    const qs = new URLSearchParams();
    qs.set("placement", BANNER_PLACEMENT_EVENTS_INLINE);
    qs.set("limit", String(BANNER_BATCH_SIZE));
    if (country) qs.set("country", country);
    if (region) qs.set("region", region);
    qs.set("__ts", String(Date.now()));

    const res = await apiGet(`/banners/active-batch?${qs.toString()}`, token);
    const list = res?.ok ? res?.data : null;

    if (Array.isArray(list) && list.length) {
      // append (queue unica)
      bannerQueue = bannerQueue.concat(list);
      lastFetchTs = Date.now();
    } else {
      // aggiorna timestamp comunque, per non martellare in loop
      lastFetchTs = Date.now();
    }
  } catch {
    // silenzioso
  } finally {
    isFetching = false;
  }
}

/**
 * Ritorna il prossimo banner dalla queue (senza rimuoverlo).
 */
function getCurrentBanner() {
  if (!bannerQueue.length) return null;
  const idx = bannerIndex % bannerQueue.length;
  return bannerQueue[idx];
}

/**
 * Quando la queue sta finendo, prefetch.
 */
function maybePrefetch(ctx) {
  const remaining = bannerQueue.length - bannerIndex;
  if (remaining <= 2) fetchBannerBatch(ctx);
}

/**
 * Refresh periodico batch (ogni ~2.5 min).
 * Lo facciamo “lazy”: se siamo oltre soglia, reset e refetch.
 */
function maybeRefresh(ctx) {
  if (!lastFetchTs) return;
  if (Date.now() - lastFetchTs > BANNER_REFRESH_MS) {
    bannerQueue = [];
    bannerIndex = 0;
    fetchBannerBatch(ctx);
  }
}

/**
 * Aggiorna il contenuto di TUTTI gli slot visibili.
 * (Rotazione solo se c'è almeno 1 slot visibile)
 */
function updateVisibleSlots(renderBannerCard) {
  const b = getCurrentBanner();
  const html = b ? renderBannerCard(b) : "";

  visibleSlots.forEach((el) => {
    try {
      // Riempie lo slot con la card banner renderizzata
      el.innerHTML = html;
    } catch {
      // ignore
    }
  });
}

/**
 * Avvia/ferma timer rotazione in base alla visibilità degli slot.
 */
function ensureRotation(renderBannerCard, ctx) {
  if (visibleSlots.size > 0 && !rotateTimer) {
    // prima render
    updateVisibleSlots(renderBannerCard);

    rotateTimer = setInterval(() => {
      // refresh/prefetch
      maybeRefresh(ctx);
      maybePrefetch(ctx);

      // rotate
      bannerIndex++;
      updateVisibleSlots(renderBannerCard);
    }, BANNER_ROTATE_MS);
  }

  if (visibleSlots.size === 0 && rotateTimer) {
    clearInterval(rotateTimer);
    rotateTimer = null;
  }
}

/**
 * Attiva la logica “osservata”:
 * - gli slot banner ruotano SOLO quando almeno uno è visibile
 * - tutti gli slot visibili mostrano lo stesso banner (stessa queue/stream)
 */
export async function activateHomeBannerSlots({
  container,
  country = "",
  region = "",
  token,
  renderBannerCard,
}) {
  if (!container || typeof renderBannerCard !== "function") return;

  const ctx = { country, region, token };

  // fetch iniziale (una volta)
  if (!bannerQueue.length) {
    await fetchBannerBatch(ctx);
  }

  const slots = Array.from(container.querySelectorAll("[data-banner-slot]"));
  if (!slots.length) return;

  // IntersectionObserver: considera "visibile" se >=60% in viewport
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;

        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          visibleSlots.add(el);
        } else {
          visibleSlots.delete(el);
        }
      });

      ensureRotation(renderBannerCard, ctx);
    },
    { threshold: [0, 0.6, 1] }
  );

  slots.forEach((el) => io.observe(el));

  // In caso la prima volta sia già visibile (alcuni browser non triggerano subito)
  ensureRotation(renderBannerCard, ctx);
}
