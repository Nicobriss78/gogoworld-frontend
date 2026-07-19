// frontend/js/participant/participant-bootstrap.js
// Bootstrap strutturale globale dell'Area Partecipante.
//
// Responsabilità attuale:
// - inizializzare il Geo Runtime strutturale;
// - verificare l'esistenza di una sessione autenticata valida;
// - offrire un punto di inizializzazione comune e idempotente;
// - restare indipendente dalla Shared Shell e dai controller di pagina.
//
// In questa fase NON gestisce:
// - geolocalizzazione;
// - consenso geografico;
// - banner geografico;
// - watcher o sincronizzazione della posizione.

import { apiGet } from "/js/api.js";
import {
  initGeoRuntime,
} from "/js/shared/geo-runtime.js";

let bootstrapPromise = null;

function readAuthToken() {
  try {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      ""
    );
  } catch {
    try {
      return (
        sessionStorage.getItem("token") ||
        ""
      );
    } catch {
      return "";
    }
  }
}

async function validateAuthenticatedSession(
  token
) {
  if (!token) {
    return {
      ok: false,
      reason: "AUTH_TOKEN_MISSING",
    };
  }

  const result = await apiGet(
    "/users/me",
    token
  );

  if (!result?.ok) {
    return {
      ok: false,
      reason:
        result?.status === 401
          ? "AUTH_SESSION_INVALID"
          : "AUTH_SESSION_VALIDATION_UNAVAILABLE",
      status: result?.status || 0,
    };
  }

  return {
    ok: true,
    user: result?.user || result,
  };
}

async function runParticipantBootstrap() {
  /*
   * Il Runtime nasce subito come infrastruttura
   * strutturale.
   *
   * In questa fase registra esclusivamente stato
   * e lifecycle della pagina.
   *
   * Non avvia alcun servizio geografico.
   */
  initGeoRuntime({
    authenticated: false,
  });

  const token = readAuthToken();

  const session =
    await validateAuthenticatedSession(
      token
    );

  if (!session.ok) {
    return {
      ok: true,
      skipped: true,
      reason: session.reason,
      status: session.status || 0,
    };
  }

  /*
   * Aggiorniamo soltanto lo stato strutturale
   * del Runtime dopo la conferma della sessione.
   */
  initGeoRuntime({
    authenticated: true,
  });

  return {
    ok: true,
    authenticated: true,
    user: session.user,
  };
}

export function initParticipantBootstrap() {
  /*
   * Protezione idempotente:
   * eventuali richiami successivi condividono
   * la stessa Promise.
   */
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise =
    runParticipantBootstrap().catch(() => ({
      ok: false,
      error:
        "PARTICIPANT_BOOTSTRAP_FAILED",
    }));

  return bootstrapPromise;
}

function initWhenDocumentIsReady() {
  if (
    document.readyState === "loading"
  ) {
    window.addEventListener(
      "DOMContentLoaded",
      () => {
        initParticipantBootstrap();
      },
      {
        once: true,
      }
    );

    return;
  }

  initParticipantBootstrap();
}

initWhenDocumentIsReady();
