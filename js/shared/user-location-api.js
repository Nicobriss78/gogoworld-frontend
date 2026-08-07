import { apiPatch } from "/js/api.js";

function normalizeGeoNumber(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number
    : null;
}

function normalizeSource(value) {
  const source = String(
    value || "browser"
  )
    .trim()
    .toLowerCase();

  return [
    "browser",
    "manual",
    "system",
  ].includes(source)
    ? source
    : "browser";
}

function normalizeConsentAction(
  value
) {
  return String(
    value || "sync"
  )
    .trim()
    .toLowerCase() === "activate"
    ? "activate"
    : "sync";
}

export async function updateMyLocation({
  lat,
  lon,
  lng,
  accuracyMeters,
  source = "browser",
  consentAction = "sync",
} = {}) {
  const safeLat =
    normalizeGeoNumber(lat);

  const safeLon =
    normalizeGeoNumber(
      lon ?? lng
    );

  const safeAccuracy =
    normalizeGeoNumber(
      accuracyMeters
    );

  if (
    safeLat === null ||
    safeLon === null
  ) {
    return {
      ok: false,
      error:
        "INVALID_COORDINATES",
    };
  }

  if (
    safeLat < -90 ||
    safeLat > 90 ||
    safeLon < -180 ||
    safeLon > 180
  ) {
    return {
      ok: false,
      error:
        "INVALID_COORDINATES_RANGE",
    };
  }

  return apiPatch(
    "/users/me/location",
    {
      lat: safeLat,
      lon: safeLon,

      accuracyMeters:
        safeAccuracy === null
          ? undefined
          : Math.round(
              safeAccuracy
            ),

      source:
        normalizeSource(source),

      /*
       * Resta presente per compatibilità
       * con il backend attuale.
       */
      consent: true,

      /*
       * activate:
       * gesto esplicito dell'utente.
       *
       * sync:
       * aggiornamento periodico.
       */
      consentAction:
        normalizeConsentAction(
          consentAction
        ),
    }
  );
}
