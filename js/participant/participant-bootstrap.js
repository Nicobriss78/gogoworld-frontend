// frontend/js/participant/participant-bootstrap.js
// Bootstrap globale dell'Area Partecipante.
//
// Responsabilità:
// - inizializzare il Geo Runtime strutturale;
// - verificare l'esistenza di una sessione autenticata valida;
// - ripristinare i servizi globali del Partecipante soltanto
//   dopo la conferma della sessione;
// - offrire un punto di inizializzazione comune e idempotente;
// - restare indipendente dalla Shared Shell e dai controller di pagina.
//
// Non gestisce direttamente:
// - consenso geografico;
// - banner geografico;
// - watcher o sincronizzazione della posizione.
//
// Il watcher resta di proprietà esclusiva di:
// participant-geo-tracking-session.js

import { apiGet } from "/js/api.js";
import {
  initGeoRuntime,
} from "/js/shared/geo-runtime.js";
import {
  resumeParticipantGeoTrackingIfEnabled,
} from "/js/shared/participant-geo-tracking-session.js";
import {
  installGeoDebugConsole,
} from "/js/shared/geo-debug.js";
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
   * strutturale della pagina.
   *
   * In questa prima fase registra esclusivamente
   * lo stato iniziale e il lifecycle.
   */
  initGeoRuntime({
    authenticated: false,
  });

  const token = readAuthToken();

  const session =
    await validateAuthenticatedSession(
      token
    );

  /*
   * In assenza di una sessione valida il bootstrap
   * termina silenziosamente.
   *
   * Nessun servizio globale viene avviato.
   */
  if (!session.ok) {
    return {
      ok: true,
      skipped: true,
      reason: session.reason,
      status: session.status || 0,
    };
  }

  /*
   * La sessione autenticata è stata confermata.
   *
   * Solo da questo momento i servizi globali
   * del Partecipante possono essere ripristinati.
   */
  initGeoRuntime({
    authenticated: true,
  });

  /*
   * Il Tracking Session decide autonomamente se
   * esiste un consenso persistente da ripristinare.
   *
   * Se il tracking non era stato abilitato,
   * restituisce uno stato skipped e non avvia nulla.
   */
  const geoTracking =
    await resumeParticipantGeoTrackingIfEnabled();

  return {
    ok: true,
    authenticated: true,
    user: session.user,
    geoTracking,
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
