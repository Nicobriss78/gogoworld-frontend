// frontend/js/home-banners.js
import { apiGet } from "./api.js";

export const BANNER_PLACEMENT_EVENTS_INLINE = "events_inline";

/**
 * Restituisce un item banner nel formato:
 * { __kind: "banner", ...data }
 * oppure null se non disponibile.
 *
 * Mantiene la tua logica:
 * - usa filters.country e (filters.region || filters.regionSel)
 * - apiGet può tornare ok:true, status:204, data:"" => ignorare
 */
export async function fetchInlineBannerItem(filters, token) {
  let bannerItem = null;

  try {
    const qsB = new URLSearchParams();
    qsB.set("placement", BANNER_PLACEMENT_EVENTS_INLINE);

    const country =
      (filters && typeof filters === "object" && filters.country) ? String(filters.country) : "";

    const region =
      (filters && typeof filters === "object" && (filters.region || filters.regionSel))
        ? String(filters.region || filters.regionSel)
        : "";

    if (country) qsB.set("country", country);
    if (region) qsB.set("region", region);

    const br = await apiGet(`/banners/active?${qsB.toString()}`, token);

    // apiGet con 204 torna ok:true, status:204 e data:"" → lo ignoriamo
    if (br?.ok && br.status !== 204 && br?.data) {
      bannerItem = { __kind: "banner", ...(br.data || {}) };
    }
  } catch {
    // silenzioso: se banner fallisce, non deve rompere la lista eventi
  }

  return bannerItem;
}

/**
 * Inserisce il banner dopo la prima card (index 1), oppure come prima se lista vuota.
 * Ritorna un NUOVO array (non muta quello originale).
 */
export function injectInlineBanner(notJoinedSorted, bannerItem) {
  const allItems = Array.isArray(notJoinedSorted) ? [...notJoinedSorted] : [];

  if (bannerItem) {
    const insertAt = allItems.length >= 1 ? 1 : 0;
    allItems.splice(insertAt, 0, bannerItem);
  }

  return allItems;
}

