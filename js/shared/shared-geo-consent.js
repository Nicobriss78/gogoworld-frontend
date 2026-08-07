import { updateMyLocation } from "/js/shared/user-location-api.js";
import {
  getGeoRuntimeState,
  refreshGeoPermissionState,
} from "/js/shared/geo-runtime.js";
import {
  startParticipantGeoTracking,
  stopParticipantGeoTracking,

  resumeParticipantGeoTrackingIfEnabled,
} from "/js/shared/participant-geo-tracking-session.js";
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
    dismissedAt:
      getStoredTimestamp(
        STORAGE_KEYS.dismissedAt
      ),

    hasGeolocation:
      hasNavigatorGeolocation(),
  };
}

export async function syncLocationIfAlreadyGranted() {
  if (!hasNavigatorGeolocation()) {
    return {
      ok: false,
      error: "GEOLOCATION_NOT_AVAILABLE",
    };
  }

  await refreshGeoPermissionState();

  const runtimeState = getGeoRuntimeState();

  if (runtimeState.permissionState === "unknown") {
    return {
      ok: false,
      skipped: true,
      reason: "GEOLOCATION_PERMISSION_UNKNOWN",
    };
  }

  if (runtimeState.permissionState !== "granted") {
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
  return startParticipantGeoTracking({
    forceInitialSync: true,
    activateBackendConsent: true,
  });
}
function waitForTrackingRunning({ timeoutMs = 15000 } = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    function check() {
      const runtimeState = getGeoRuntimeState();

      if (runtimeState.trackingRunning === true) {
        resolve({
          ok: true,
          active: true,
          runtimeState,
        });
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        resolve({
          ok: false,
          error: "GEOLOCATION_TRACKING_NOT_RUNNING",
          permissionState: runtimeState.permissionState,
        });
        return;
      }

      window.setTimeout(check, 100);
    }

    check();
  });
}

export async function ensureGeoTrackingAvailable() {
  if (!hasNavigatorGeolocation()) {
    return {
      ok: false,
      error: "GEOLOCATION_NOT_AVAILABLE",
    };
  }

  await refreshGeoPermissionState();

  let runtimeState = getGeoRuntimeState();

  if (runtimeState.permissionState === "denied") {
    return {
      ok: false,
      error: "GEOLOCATION_PERMISSION_DENIED",
      permissionState: "denied",
    };
  }

  if (runtimeState.trackingRunning === true) {
    return {
      ok: true,
      active: true,
      alreadyActive: true,
      runtimeState,
    };
  }

const result = runtimeState.consentEnabled
  ? await resumeParticipantGeoTrackingIfEnabled({
      permissionState:
        runtimeState.permissionState,

      allowPermissionPrompt:
        true,
    })
  : await startParticipantGeoTracking({
      forceInitialSync: true,
    });

  if (!result?.ok) {
    return result;
  }

  runtimeState = getGeoRuntimeState();

  if (runtimeState.trackingRunning === true) {
    return {
      ...result,
      ok: true,
      active: true,
      runtimeState,
    };
  }

  return waitForTrackingRunning();
}
export function disableGeoTracking() {
return stopParticipantGeoTracking({
persistDisabled: true,
reason: "USER_DISABLED_GEO_TRACKING",
});
}
