import { getActiveBannersBatch } from "../api.js";

const FOLLOWING_ENDPOINT = "/api/events/following/list";

function getToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

async function apiGet(url) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (res.status === 401) {
    try {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    } catch {}
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      "Errore durante il caricamento dei dati.";
    const err = new Error(message);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

async function apiPost(url, body) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify(body || {}),
  });

  if (res.status === 401) {
    try {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    } catch {}
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.message ||
      data?.error ||
      "Operazione non riuscita.";
    const err = new Error(message);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

export async function fetchFollowingEvents() {
  const data = await apiGet(FOLLOWING_ENDPOINT);
  return Array.isArray(data?.events) ? data.events : [];
}

export async function fetchFollowingBanners(currentUserProfile = null) {
  const token = getToken();

  const country =
    (currentUserProfile?.country || "").trim() || null;

  const region =
    (currentUserProfile?.region || "").trim() || null;

  try {
    const bannerRes = await getActiveBannersBatch(
      {
        placement: "events_list_inline",
        country,
        region,
        limit: 8,
      },
      token
    );

    return Array.isArray(bannerRes?.data) ? bannerRes.data : [];
  } catch {
    return [];
  }
}

export async function joinSeguitiEvent(eventId) {
  return apiPost(`/api/events/${encodeURIComponent(eventId)}/join`);
}
