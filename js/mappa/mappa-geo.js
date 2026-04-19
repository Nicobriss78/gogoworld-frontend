// js/mappa/mappa-geo.js

/**
 * GEO SERVICE - modulo isolato per gestione geolocalizzazione
 * NON accede allo state
 * NON contiene logica UI
 * NON contiene logica di business
 */
let activeGeoWatchId = null;
export async function requestUserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject({
        code: "NOT_SUPPORTED",
        message: "Geolocation not supported"
      });
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: Number(pos.timestamp || Date.now())
        });
      },
      (err) => {
        let code = "UNKNOWN";

        if (err.code === err.PERMISSION_DENIED) {
          code = "PERMISSION_DENIED";
        } else if (err.code === err.TIMEOUT) {
          code = "TIMEOUT";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          code = "UNAVAILABLE";
        }

        reject({
          code,
          message: err.message || "Geolocation error"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/**
 * Controllo veloce supporto browser
 */
export function isGeoSupported() {
  return "geolocation" in navigator;
}
export async function getGeoPermissionState() {
  if (!navigator.geolocation) return "not_supported";

  if (!navigator.permissions || typeof navigator.permissions.query !== "function") {
    return "unknown";
  }

  try {
    const result = await navigator.permissions.query({ name: "geolocation" });
    const state = String(result?.state || "").trim();

    if (state === "granted") return "granted";
    if (state === "denied") return "denied";
    if (state === "prompt") return "prompt";

    return "unknown";
  } catch {
    return "unknown";
  }
}
export function startUserPositionWatch({ onUpdate, onError } = {}) {
  if (!navigator.geolocation) {
    onError?.({
      code: "NOT_SUPPORTED",
      message: "Geolocation not supported"
    });
    return null;
  }

  if (activeGeoWatchId != null) {
    navigator.geolocation.clearWatch(activeGeoWatchId);
    activeGeoWatchId = null;
  }

  activeGeoWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate?.({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: Number(pos.timestamp || Date.now())
      });
    },
    (err) => {
      let code = "UNKNOWN";

      if (err.code === err.PERMISSION_DENIED) {
        code = "PERMISSION_DENIED";
      } else if (err.code === err.TIMEOUT) {
        code = "TIMEOUT";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        code = "UNAVAILABLE";
      }

      onError?.({
        code,
        message: err.message || "Geolocation error"
      });
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000
    }
  );

  return activeGeoWatchId;
}

export function stopUserPositionWatch() {
  if (!navigator.geolocation || activeGeoWatchId == null) return;

  navigator.geolocation.clearWatch(activeGeoWatchId);
  activeGeoWatchId = null;
}
/**
 * Normalizza coordinate in formato coerente
 */
export function normalizePosition(pos) {
  if (!pos) return null;

  return {
    lat: Number(pos.lat),
    lng: Number(pos.lng)
  };
}

/**
 * Calcolo distanza (metri) - utile già per step successivi
 */
export function getDistanceMeters(p1, p2) {
  if (!p1 || !p2) return null;

  const R = 6371000; // metri
  const toRad = (v) => (v * Math.PI) / 180;

  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.lat)) *
      Math.cos(toRad(p2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
