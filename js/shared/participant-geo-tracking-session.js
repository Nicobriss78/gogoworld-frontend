// frontend/js/shared/participant-geo-tracking-session.js
// Geo Tracking Partecipante Globale V1
// Responsabilità: tracciare e sincronizzare su backend la posizione del partecipante
// in modo globale, indipendente da Home/Mappa/Eventi Privati.

import { updateMyLocation } from "/js/shared/user-location-api.js";
import {
  getGeoRuntimeState,
  updateGeoRuntimeState,
} from "/js/shared/geo-runtime.js";const STORAGE_KEYS = {
  enabled: "ggw_participant_geo_tracking_enabled",
  lastSyncAt: "ggw_participant_geo_tracking_last_sync_at",
  lastError: "ggw_participant_geo_tracking_last_error",
};

const GEO_TRACKING_MIN_SYNC_INTERVAL_MS = 60 * 1000;
const GEO_TRACKING_MAX_ACCEPTED_ACCURACY_METERS = 250;

let watchId = null;
let isStarting = false;
function publishRuntimeState(overrides = {}) {
  const consentEnabled =
    isParticipantGeoTrackingEnabled();

  updateGeoRuntimeState({
    consentEnabled,
    trackingRunning: watchId !== null,
    lastSyncAt: getStoredNumber(
      STORAGE_KEYS.lastSyncAt
    ),
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

  publishRuntimeState();
}

function emitGeoTrackingEvent(type, detail = {}) {
  window.dispatchEvent(
    new CustomEvent(`ggw:participant-geo-tracking:${type}`, {
      detail,
    })
  );
}

async function syncPositionToBackend(
  position,
  {
    force = false,
    consentAction = "sync",
  } = {}
) {
  const normalized = normalizePosition(position);

  if (!normalized) {
    return {
      ok: false,
      error: "INVALID_BROWSER_POSITION",
    };
  }
  publishRuntimeState({
  locationAvailability:
    "available",
});
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

  publishRuntimeState({
    lastKnownPosition: normalized,
  });

  if (!force && shouldThrottleBackendSync()) {
    return {
      ok: true,
      skipped: true,
      reason: "LOCATION_SYNC_THROTTLED",
    };
  }

  try {
       const result =
      await updateMyLocation({
        lat:
          normalized.lat,

        lon:
          normalized.lon,

        accuracyMeters:
          normalized
            .accuracyMeters,

        source:
          "browser",

        consentAction,
      });

        /*
     * Il backend può rifiutare una normale sync
     * quando il consenso account-wide è stato
     * revocato, per esempio da un altro dispositivo.
     *
     * In quel caso fermiamo il watcher locale ma
     * NON cancelliamo la preferenza locale:
     * l'utente potrà riattivarla esplicitamente.
     */
    if (
      result?.ok === false &&
      result?.error ===
        "location_consent_not_enabled"
    ) {
      stopParticipantGeoTracking({
        persistDisabled: false,

        reason:
          "BACKEND_LOCATION_CONSENT_DISABLED",
      });

      emitGeoTrackingEvent("error", {
        error:
          "BACKEND_LOCATION_CONSENT_DISABLED",
      });

      return result;
    }

    if (result?.ok) {
      markBackendSyncOk();

      emitGeoTrackingEvent("synced", {
        lat: normalized.lat,
        lon: normalized.lon,
        accuracyMeters:
          normalized.accuracyMeters,
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
  const permissionDenied =
    error?.code === 1;

  /*
   * Un errore della Geolocation API NON determina
   * da solo lo stato della permission del browser.
   *
   * Registra soltanto che, in questo momento, il
   * dispositivo non sta fornendo una posizione.
   */
  publishRuntimeState({
    locationAvailability:
      "unavailable",
  });

  markBackendSyncError(error);

  emitGeoTrackingEvent("error", {
    error: "GEOLOCATION_WATCH_ERROR",
    code: error?.code || null,
    message:
      error?.message ||
      String(error || ""),
  });

  if (permissionDenied) {
    stopParticipantGeoTracking({
      persistDisabled: false,
      reason: "PERMISSION_DENIED",
    });
  }
}
export async function startParticipantGeoTracking({
  forceInitialSync = true,
  activateBackendConsent = false,
} = {}) {
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

    /*
     * La posizione è disponibile soltanto dopo una
     * posizione realmente ricevuta dal dispositivo.
     *
     * La sola registrazione di watchPosition()
     * NON dimostra che il dispositivo possa
     * effettivamente fornire coordinate.
     */
    const initialPosition =
      normalizePosition(position);

    if (!initialPosition) {
      throw new Error(
        "INVALID_BROWSER_POSITION"
      );
    }

    publishRuntimeState({
      locationAvailability:
        "available",
    });

    if (forceInitialSync) {
      await syncPositionToBackend(
        position,
        {
          force: true,

          consentAction:
            activateBackendConsent
              ? "activate"
              : "sync",
        }
      );
    }

    watchId =
      navigator.geolocation.watchPosition(
        handleWatchPosition,
        handleWatchError,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 30000,
        }
      );

    /*
     * Qui pubblichiamo soltanto trackingRunning.
     * locationAvailability è già stata determinata
     * dalla posizione realmente ricevuta.
     */
    publishRuntimeState();
publishRuntimeState({
  locationAvailability:
    "available",
});

    emitGeoTrackingEvent("started", {
      active: true,
    });

    return {
      ok: true,
      active: true,
    };
 } catch (error) {
  /*
   * Non deduciamo permissionState dall'errore GPS.
   * Il permesso resta di proprietà del Geo Runtime
   * tramite Permissions API.
   */
  publishRuntimeState({
    locationAvailability:
      "unavailable",
  });

  markBackendSyncError(error);

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

  publishRuntimeState();

  emitGeoTrackingEvent("stopped", {
    reason,
  });

  return {
    ok: true,
    active: false,
    reason,
  };
}
export async function resumeParticipantGeoTrackingIfEnabled({
  permissionState = null,
  allowPermissionPrompt = false,
  forceInitialSync = false,
  activateBackendConsent = false,
} = {}) {
  const consentEnabled =
    isParticipantGeoTrackingEnabled();

  /*
   * Il consenso persistente deve essere pubblicato
   * nel Runtime anche quando il watcher non viene
   * ripristinato.
   */
  publishRuntimeState();

  if (!consentEnabled) {
    return {
      ok: true,
      skipped: true,
      reason: "TRACKING_NOT_ENABLED",
    };
  }

  const runtimePermissionState =
    permissionState ||
    getGeoRuntimeState().permissionState ||
    "unknown";

  if (
    runtimePermissionState === "denied"
  ) {
    return {
      ok: true,
      skipped: true,
      reason:
        "GEOLOCATION_PERMISSION_DENIED",
      permissionState:
        runtimePermissionState,
    };
  }

  if (
    runtimePermissionState === "prompt" &&
    allowPermissionPrompt !== true
  ) {
    return {
      ok: true,
      skipped: true,
      reason:
        "GEOLOCATION_PERMISSION_PROMPT_REQUIRED",
      permissionState:
        runtimePermissionState,
    };
  }

    return startParticipantGeoTracking({
    forceInitialSync,
    activateBackendConsent,
  });
}
export async function recoverParticipantGeoTrackingOnForeground() {
  const runtimeState =
    getGeoRuntimeState();

  if (
    runtimeState.authenticated !== true ||
    runtimeState.consentEnabled !== true
  ) {
    return {
      ok: true,
      skipped: true,
      reason:
        "GEO_FOREGROUND_RECOVERY_NOT_ENABLED",
    };
  }

  /*
   * Il recovery automatico può accedere alla
   * geolocalizzazione soltanto quando la permission
   * è realmente tornata granted.
   *
   * Nessun prompt automatico.
   */
  if (
    runtimeState.permissionState !==
    "granted"
  ) {
    return {
      ok: true,
      skipped: true,
      reason:
        "GEO_FOREGROUND_RECOVERY_PERMISSION_NOT_GRANTED",

      permissionState:
        runtimeState.permissionState,
    };
  }

  const availabilityRecoveryRequired =
    runtimeState.locationAvailability ===
    "unavailable";

  /*
   * Caso Chrome Android:
   *
   * con Posizione di sistema OFF il bootstrap può
   * vedere permissionState=denied senza aver mai
   * tentato una posizione.
   *
   * Quando il recovery rileva poi granted,
   * locationAvailability può essere ancora unknown.
   */
  const unknownRecoveryRequired =
    runtimeState.locationAvailability ===
      "unknown" &&
    watchId === null;

  if (
    !availabilityRecoveryRequired &&
    !unknownRecoveryRequired
  ) {
    return {
      ok: true,
      skipped: true,
      reason:
        "GEO_FOREGROUND_RECOVERY_NOT_REQUIRED",
    };
  }

  /*
   * Se il watcher esiste ancora non ne creiamo
   * un secondo.
   *
   * Facciamo soltanto una lettura puntuale per
   * verificare se il dispositivo è tornato a
   * produrre una posizione.
   */
  if (watchId !== null) {
    try {
      const position =
        await getCurrentPosition({
          timeout: 8000,
          maximumAge: 0,
        });

      const normalized =
        normalizePosition(position);

      if (!normalized) {
        publishRuntimeState({
          locationAvailability:
            "unavailable",
        });

        return {
          ok: false,
          error:
            "INVALID_BROWSER_POSITION",
        };
      }

      publishRuntimeState({
        locationAvailability:
          "available",

        lastKnownPosition:
          normalized,
      });

      return {
        ok: true,
        recovered: true,
        active: true,
      };
    } catch (error) {
      publishRuntimeState({
        locationAvailability:
          "unavailable",
      });

      return {
        ok: false,
        error:
          "GEOLOCATION_FOREGROUND_RECOVERY_FAILED",

        code:
          error?.code || null,
      };
    }
  }

  /*
   * Il watcher non esiste più.
   *
   * Lo ricreiamo senza prompt e soprattutto senza
   * riattivare implicitamente il consenso backend.
   */
  return startParticipantGeoTracking({
    forceInitialSync: false,
    activateBackendConsent: false,
  });
}
export async function syncParticipantGeoOnce({
  force = true,
  consentAction = "sync",
} = {}) {
  const position =
    await getCurrentPosition({
      timeout: 12000,
      maximumAge: 30000,
    });

  return syncPositionToBackend(
    position,
    {
      force,
      consentAction,
    }
  );
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
