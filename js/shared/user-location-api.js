import { apiPatch } from "/js/api.js";

function normalizeGeoNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeSource(value) {
  const source = String(value || "browser").trim().toLowerCase();
  return ["browser", "manual", "system"].includes(source) ? source : "browser";
}

export async function updateMyLocation({
  lat,
  lon,
  lng,
  accuracyMeters,
  source = "browser",
} = {}) {
  const safeLat = normalizeGeoNumber(lat);
  const safeLon = normalizeGeoNumber(lon ?? lng);
  const safeAccuracy = normalizeGeoNumber(accuracyMeters);

  if (safeLat === null || safeLon === null) {
    return {
      ok: false,
      error: "INVALID_COORDINATES",
    };
  }

  if (safeLat < -90 || safeLat > 90 || safeLon < -180 || safeLon > 180) {
    return {
      ok: false,
      error: "INVALID_COORDINATES_RANGE",
    };
  }

  return apiPatch("/users/me/location", {
    lat: safeLat,
    lon: safeLon,
    accuracyMeters: safeAccuracy === null ? undefined : Math.round(safeAccuracy),
    source: normalizeSource(source),
    consent: true,
  });
}
