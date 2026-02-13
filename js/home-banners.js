// frontend/js/home-banners.js
import { apiGet } from "./api.js";

// === Config ===
export const BANNER_PLACEMENT_EVENTS_INLINE = "events_list_inline";
export const BANNER_BATCH_SIZE = 8;
export const BANNER_ROTATE_MS = 4500;
export const BANNER_REFRESH_MS = 150000; // 2.5 minuti
// Ogni quanti sponsor inseriamo 1 tip (es. 3:1 => dopo 3 sponsor, 1 tip)
export const TIP_EVERY_N_SPONSORS = 3;

// === Internal state (shared across all banner slots) ===
let bannerQueue = [];
let bannerIndex = 0;
let isFetching = false;
let lastFetchTs = 0;

let visibleSlots = new Set();
let rotateTimer = null;
// === Fallback Tips (usati solo quando NON ci sono sponsor) ===
const fallbackTips = [
  {
    kind: "tip",
    iconSvg: `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2a7 7 0 0 0-7 7c0 4.5 7 13 7 13s7-8.5 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
      </svg>
    `.trim(),
    title: "Attiva la posizione",
    text: "Scopri eventi vicino a te e filtra la mappa in un attimo.",
  },
  {
    kind: "tip",
    iconSvg: `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
    `.trim(),
    title: "Fai Check-in",
    text: "Partecipa davvero agli eventi e sblocca badge e classifica mensile.",
  },
  {
    kind: "tip",
    iconSvg: `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13z"/>
      </svg>
    `.trim(),
    title: "Segui organizzatori",
    text: "Resta aggiornato sugli eventi che ti interessano davvero.",
  },
];

let fallbackIndex = 0;
function getCurrentFallbackTip() {
  const tip = fallbackTips[fallbackIndex % fallbackTips.length];
  return tip || null;
}

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
function isTipTurn() {
  // Se non ci sono sponsor, è sempre turno tip
  if (!bannerQueue.length) return true;

  // Pattern: S S S T (con TIP_EVERY_N_SPONSORS = 3)
  const cycle = TIP_EVERY_N_SPONSORS + 1; // es. 4
  const pos = bannerIndex % cycle; // 0..3
  return pos === TIP_EVERY_N_SPONSORS; // l'ultimo del ciclo è tip
}

function getCurrentBanner() {
  if (!bannerQueue.length) return null;
  if (isTipTurn()) return null;

  // Mappa bannerIndex (che include anche i turni tip) su indice sponsor puro
  const cycle = TIP_EVERY_N_SPONSORS + 1;
  const tipsSoFar = Math.floor(bannerIndex / cycle); // 1 tip per ciclo
  const sponsorIndex = bannerIndex - tipsSoFar; // “collassa” i turni tip

  const idx = sponsorIndex % bannerQueue.length;
  return bannerQueue[idx];
}

function renderFallbackTipCard(tip) {
  if (!tip) return "";

  return `
    <article class="gw-rail gw-banner gw-banner--tip" data-kind="banner-tip">
      <div class="gw-banner__inner">
        <div class="gw-banner__icon">${tip.iconSvg || ""}</div>
        <div class="gw-banner__content">
          <div class="gw-banner__title">${tip.title || ""}</div>
          <div class="gw-banner__text">${tip.text || ""}</div>
        </div>
      </div>
    </article>
  `.trim();
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
  const tip = !b ? getCurrentFallbackTip() : null;

  const html = b ? renderBannerCard(b) : renderFallbackTipCard(tip);

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

// Avanza i tips solo quando viene mostrato un tip
if (isTipTurn()) {
  fallbackIndex++;
}


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
