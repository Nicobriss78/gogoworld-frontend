import { apiGet, getActiveBannersBatch } from "../api.js";

const HOME_FALLBACK_TIPS = [
  {
    id: "geo",
    title: "Esplora gli eventi vicini",
    text: "Apri la mappa e scopri cosa succede intorno a te.",
  },
  {
    id: "follow",
    title: "Segui le persone e gli organizzatori",
    text: "Costruisci il tuo flusso di eventi partendo da chi segui.",
  },
  {
    id: "checkin",
    title: "Partecipa e resta aggiornato",
    text: "Controlla i tuoi eventi attivi e tieni d’occhio quelli passati.",
  },
];

export async function fetchHomePayload() {
  const token = localStorage.getItem("token");

  const meRes = await apiGet("/users/me", token);
  const currentUserId =
    meRes?._id ||
    meRes?.id ||
    meRes?.user?._id ||
    meRes?.user?.id ||
    null;

  const meCountry =
    (meRes?.country || meRes?.user?.country || "").trim() || null;

  const meRegion =
    (meRes?.region || meRes?.user?.region || "").trim() || null;

  const evRes = await apiGet("/events", token);
  const events = Array.isArray(evRes?.events) ? evRes.events : [];

  let banners = [];
  try {
    const bannerRes = await getActiveBannersBatch(
      {
        placement: "events_list_inline",
        country: meCountry,
        region: meRegion,
        limit: 8,
      },
      token
    );

    banners = Array.isArray(bannerRes?.data) ? bannerRes.data : [];
  } catch {
    banners = [];
  }

  return {
    events,
    banners,
    tips: HOME_FALLBACK_TIPS,
    currentUserId,
    currentUserCountry: meCountry,
    currentUserRegion: meRegion,
  };
}

export { HOME_FALLBACK_TIPS };
