// frontend/js/participant/participant-bootstrap.js
// Bootstrap globale dell'Area Partecipante.
//
// Responsabilità:
// - verificare l'esistenza di una sessione autenticata valida;
// - avviare i servizi globali dell'Area Partecipante;
// - mantenere tali servizi indipendenti dalla Shared Shell;
// - non assumere responsabilità appartenenti ai controller delle pagine.

import { apiGet } from "/js/api.js";
import { syncLocationIfAlreadyGranted } from "/js/shared/shared-geo-consent.js";
import { mountSharedGeoBanner } from "/js/shared/shared-geo-banner.js";
import {
  resumeParticipantGeoTrackingIfEnabled,
} from "/js/shared/participant-geo-tracking-session.js";

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
      return sessionStorage.getItem("token") || "";
    } catch {
      return "";
    }
  }
}

function resolvePageContext() {
  const pathname = String(
    window.location?.pathname || ""
  ).toLowerCase();

  return {
    pathname,

    isMapPage:
      pathname.endsWith("/pages/mappa-v2.html") ||
      pathname.endsWith("/pages/mappa-privati-v2.html"),

    isEventPage:
      pathname.endsWith("/pages/evento-v2.html"),
  };
}

async function validateAuthenticatedSession(token) {
  if (!token) {
    return {
      ok: false,
      reason: "AUTH_TOKEN_MISSING",
    };
  }

  const result = await apiGet("/users/me", token);

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

function shouldMountDefaultGeoBanner(pageContext) {
  /*
   * La Mappa pubblica e la pagina Evento montano ancora il banner
   * attraverso i rispettivi controller.
   *
   * Questa responsabilità verrà unificata nella fase dedicata
   * al Geo Banner.
   */
  if (pageContext.isMapPage || pageContext.isEventPage) {
    return false;
  }

  /*
   * Il banner attuale richiede sharedTopbarMount.
   * Le pagine che non possiedono la Shared Topbar non devono
   * generare errori o tentare mount non validi.
   */
  return Boolean(
    document.getElementById("sharedTopbarMount")
  );
}

async function runParticipantBootstrap() {
  const token = readAuthToken();

  const session =
    await validateAuthenticatedSession(token);

  /*
   * Bootstrap session-aware:
   * nessuna sessione valida significa nessuna richiesta GPS,
   * nessuna sincronizzazione e nessun errore visibile.
   */
  if (!session.ok) {
    return {
      ok: true,
      skipped: true,
      reason: session.reason,
      status: session.status || 0,
    };
  }

  const pageContext = resolvePageContext();

  /*
   * Manteniamo temporaneamente entrambi i percorsi esistenti:
   *
   * - syncLocationIfAlreadyGranted
   * - resumeParticipantGeoTrackingIfEnabled
   *
   * La loro unificazione appartiene alla fase dedicata
   * al motore Geo Tracking unico.
   */
  await Promise.allSettled([
    syncLocationIfAlreadyGranted(),
    resumeParticipantGeoTrackingIfEnabled(),
  ]);

  if (shouldMountDefaultGeoBanner(pageContext)) {
    await mountSharedGeoBanner().catch(() => null);
  }

  return {
    ok: true,
    authenticated: true,
  };
}

export function initParticipantBootstrap() {
  /*
   * Protezione idempotente.
   *
   * Qualunque secondo richiamo riceve la stessa Promise
   * e non crea una seconda inizializzazione.
   */
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = runParticipantBootstrap().catch(() => ({
    ok: false,
    error: "PARTICIPANT_BOOTSTRAP_FAILED",
  }));

  return bootstrapPromise;
}

function initWhenDocumentIsReady() {
  if (document.readyState === "loading") {
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
