import { updateMyLocation } from "/js/shared/user-location-api.js";

const STORAGE_KEYS = {
  dismissedAt: "ggw_geo_prompt_dismissed_at",
  lastSyncAt: "ggw_geo_last_sync_at",
};

const GEO_SYNC_MIN_INTERVAL_MS = 10 * 60 * 1000;

function hasNavigatorGeolocation() {
  return Boolean(navigator?.geolocation);
}

function getStoredTimestamp(key) {
  const value = Number(localStorage.getItem(key) || 0);
  return Number.isFinite(value) ? value : 0;
}

function setStoredTimestamp(key, value = Date.now()) {
  localStorage.setItem(key, String(value));
}

function shouldThrottleSync() {
  const lastSyncAt = getStoredTimestamp(STORAGE_KEYS.lastSyncAt);
  return Date.now() - lastSyncAt < GEO_SYNC_MIN_INTERVAL_MS;
}

function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!hasNavigatorGeolocation()) {
      reject(new Error("GEOLOCATION_NOT_AVAILABLE"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: Boolean(options.enableHighAccuracy),
      timeout: options.timeout || 10000,
      maximumAge: options.maximumAge || 60000,
    });
  });
}

async function syncPositionFromBrowser({ enableHighAccuracy = false } = {}) {
  if (shouldThrottleSync()) {
    return {
      ok: true,
      skipped: true,
      reason: "SYNC_THROTTLED",
    };
  }

  const position = await getCurrentPosition({
    enableHighAccuracy,
    timeout: 10000,
    maximumAge: 60000,
  });

  const result = await updateMyLocation({
    lat: position.coords.latitude,
    lon: position.coords.longitude,
    accuracyMeters: position.coords.accuracy,
    source: "browser",
  });

  if (result?.ok) {
    setStoredTimestamp(STORAGE_KEYS.lastSyncAt);
  }

  return result;
}

export function dismissGeoPrompt() {
  setStoredTimestamp(STORAGE_KEYS.dismissedAt);
}

export function getGeoPromptState() {
  return {
    dismissedAt: getStoredTimestamp(STORAGE_KEYS.dismissedAt),
    lastSyncAt: getStoredTimestamp(STORAGE_KEYS.lastSyncAt),
    hasGeolocation: hasNavigatorGeolocation(),
  };
}

export async function syncLocationIfAlreadyGranted() {
  if (!hasNavigatorGeolocation()) {
    return {
      ok: false,
      error: "GEOLOCATION_NOT_AVAILABLE",
    };
  }

  if (!navigator.permissions?.query) {
    return {
      ok: false,
      skipped: true,
      reason: "PERMISSIONS_API_NOT_AVAILABLE",
    };
  }

  const permission = await navigator.permissions.query({ name: "geolocation" });

  if (permission.state !== "granted") {
    return {
      ok: false,
      skipped: true,
      reason: "GEOLOCATION_NOT_GRANTED",
    };
  }

  return syncPositionFromBrowser({
    enableHighAccuracy: false,
  });
}

export async function requestAndSyncLocation() {
  return syncPositionFromBrowser({
    enableHighAccuracy: true,
  });
    }
