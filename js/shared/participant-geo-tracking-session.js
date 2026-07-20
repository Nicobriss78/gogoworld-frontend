// frontend/js/shared/participant-geo-tracking-session.js
// Geo Tracking Partecipante Globale V1
// Responsabilità: tracciare e sincronizzare su backend la posizione del partecipante
// in modo globale, indipendente da Home/Mappa/Eventi Privati.

import { updateMyLocation } from "/js/shared/user-location-api.js";
import { updateGeoRuntimeState } from "/js/shared/geo-runtime.js";
const STORAGE_KEYS = {
  enabled: "ggw_participant_geo_tracking_enabled",
  lastSyncAt: "ggw_participant_geo_tracking_last_sync_at",
  lastError: "ggw_participant_geo_tracking_last_error",
};

const GEO_TRACKING_MIN_SYNC_INTERVAL_MS = 60 * 1000;
const GEO_TRACKING_MAX_ACCEPTED_ACCURACY_METERS = 250;

let watchId = null;
let isStarting = false;
function publishRuntimeState(overrides = {}) {
  updateGeoRuntimeState({
    trackingEnabled: isParticipantGeoTrackingEnabled(),
    trackingRunning: watchId !== null,
    watchActive: watchId !== null,
    lastSyncAt: getStoredNumber(STORAGE_KEYS.lastSyncAt),
    ...overrides,
  });
}
function hasNavigatorGeolocation() {
  return Boolean(navigator?.geolocation);
}

function normalizePosition(position) {
  const coords = position?.coords;
  if (!coords) return null;

  const lat = Number(coords.latitude);
  const lon = Number(coords.longitude);
  const accuracyMeters = Number(coords.accuracy);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  return {
    lat,
    lon,
    accuracyMeters: Number.isFinite(accuracyMeters) ? accuracyMeters : null,
    timestamp: position.timestamp || Date.now(),
  };
}

function getStoredNumber(key) {
  const value = Number(localStorage.getItem(key) || 0);
  return Number.isFinite(value) ? value : 0;
}

function setTrackingEnabled(enabled) {
  localStorage.setItem(STORAGE_KEYS.enabled, enabled ? "1" : "0");
}

export function isParticipantGeoTrackingEnabled() {
  return localStorage.getItem(STORAGE_KEYS.enabled) === "1";
}

export function isParticipantGeoTrackingActive() {
  return watchId !== null;
}

function shouldThrottleBackendSync() {
  const lastSyncAt = getStoredNumber(STORAGE_KEYS.lastSyncAt);
  return Date.now() - lastSyncAt < GEO_TRACKING_MIN_SYNC_INTERVAL_MS;
}

function markBackendSyncOk() {
  localStorage.setItem(STORAGE_KEYS.lastSyncAt, String(Date.now()));
  localStorage.removeItem(STORAGE_KEYS.lastError);
  publishRuntimeState();
}

function markBackendSyncError(error) {
  localStorage.setItem(
    STORAGE_KEYS.lastError,
    String(error?.message || error?.error || error || "LOCATION_SYNC_FAILED")
  );
}

function emitGeoTrackingEvent(type, detail = {}) {
  window.dispatchEvent(
    new CustomEvent(`ggw:participant-geo-tracking:${type}`, {
      detail,
    })
  );
}

async function syncPositionToBackend(position, { force = false } = {}) {
  const normalized = normalizePosition(position);

  if (!normalized) {
    return {
      ok: false,
      error: "INVALID_BROWSER_POSITION",
    };
  }

  if (
    normalized.accuracyMeters !== null &&
    normalized.accuracyMeters > GEO_TRACKING_MAX_ACCEPTED_ACCURACY_METERS
  ) {
    return {
      ok: false,
      skipped: true,
      reason: "POSITION_ACCURACY_TOO_LOW",
      accuracyMeters: normalized.accuracyMeters,
    };
  }

  if (!force && shouldThrottleBackendSync()) {
    return {
      ok: true,
      skipped: true,
      reason: "LOCATION_SYNC_THROTTLED",
    };
  }

  try {
    const result = await updateMyLocation({
      lat: normalized.lat,
      lon: normalized.lon,
      accuracyMeters: normalized.accuracyMeters,
      source: "browser",
    });

    if (result?.ok) {
      markBackendSyncOk();
      emitGeoTrackingEvent("synced", {
        lat: normalized.lat,
        lon: normalized.lon,
        accuracyMeters: normalized.accuracyMeters,
      });
    }

    return result;
  } catch (error) {
    markBackendSyncError(error);
    emitGeoTrackingEvent("error", {
      error: "LOCATION_SYNC_FAILED",
      message: error?.message || String(error || ""),
    });

    return {
      ok: false,
      error: "LOCATION_SYNC_FAILED",
    };
  }
}

function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!hasNavigatorGeolocation()) {
      reject(new Error("GEOLOCATION_NOT_AVAILABLE"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: options.timeout || 12000,
      maximumAge: options.maximumAge || 30000,
    });
  });
}

function handleWatchPosition(position) {
  syncPositionToBackend(position).catch((error) => {
    markBackendSyncError(error);
  });
}

function handleWatchError(error) {
  markBackendSyncError(error);

  emitGeoTrackingEvent("error", {
    error: "GEOLOCATION_WATCH_ERROR",
    code: error?.code || null,
    message: error?.message || String(error || ""),
  });

  if (error?.code === 1) {
    stopParticipantGeoTracking({
      persistDisabled: true,
      reason: "PERMISSION_DENIED",
    });
  }
}

export async function startParticipantGeoTracking({ forceInitialSync = true } = {}) {
  if (!hasNavigatorGeolocation()) {
    return {
      ok: false,
      error: "GEOLOCATION_NOT_AVAILABLE",
    };
  }

  if (watchId !== null) {
    setTrackingEnabled(true);
    publishRuntimeState();

    return {
      ok: true,
      alreadyActive: true,
    };
  }

  if (isStarting) {
    return {
      ok: true,
      starting: true,
    };
  }

  isStarting = true;

  try {
    setTrackingEnabled(true);
    publishRuntimeState();

    const position = await getCurrentPosition({
      timeout: 12000,
      maximumAge: 30000,
    });
    if (forceInitialSync) {
      await syncPositionToBackend(position, { force: true });
    }

    watchId = navigator.geolocation.watchPosition(
      handleWatchPosition,
      handleWatchError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );

    publishRuntimeState();

    emitGeoTrackingEvent("started", {
      active: true,
    });

    return {
      ok: true,
      active: true,
    };
  } catch (error) {
    markBackendSyncError(error);

    if (error?.code === 1) {
      setTrackingEnabled(false);
    }

    publishRuntimeState();

    emitGeoTrackingEvent("error", {
      error: "GEOLOCATION_START_FAILED",
      code: error?.code || null,
      message: error?.message || String(error || ""),
    });

    return {
      ok: false,
      error: "GEOLOCATION_START_FAILED",
      code: error?.code || null,
    };
  } finally {
    isStarting = false;
  }
}

export function stopParticipantGeoTracking({
  persistDisabled = true,
  reason = "USER_DISABLED",
} = {}) {
  if (watchId !== null && hasNavigatorGeolocation()) {
    navigator.geolocation.clearWatch(watchId);
  }

  watchId = null;

  if (persistDisabled) {
    setTrackingEnabled(false);
  }

  emitGeoTrackingEvent("stopped", {
    reason,
  });

  return {
    ok: true,
    active: false,
    reason,
  };
}

export async function resumeParticipantGeoTrackingIfEnabled() {
  if (!isParticipantGeoTrackingEnabled()) {
    return {
      ok: true,
      skipped: true,
      reason: "TRACKING_NOT_ENABLED",
    };
  }

  return startParticipantGeoTracking({
    forceInitialSync: false,
  });
}

export async function syncParticipantGeoOnce({ force = true } = {}) {
  const position = await getCurrentPosition({
    timeout: 12000,
    maximumAge: 30000,
  });

  return syncPositionToBackend(position, { force });
}

export function getParticipantGeoTrackingState() {
  return {
    enabled: isParticipantGeoTrackingEnabled(),
    active: isParticipantGeoTrackingActive(),
    lastSyncAt: getStoredNumber(STORAGE_KEYS.lastSyncAt),
    lastError: localStorage.getItem(STORAGE_KEYS.lastError) || null,
    hasGeolocation: hasNavigatorGeolocation(),
  };
      }
