// frontend/js/shared/geo-debug.js
// Console diagnostica in sola lettura per il sistema GEO.
//
// Il bridge viene esposto su window soltanto quando:
//
// localStorage:
// ggw_geo_debug_enabled = "1"
//
// Non avvia, ferma o modifica il tracking.
// Non modifica consenso, permessi o Runtime.

import {
  getGeoRuntimeState,
} from "/js/shared/geo-runtime.js";

import {
  getParticipantGeoTrackingState,
} from "/js/shared/participant-geo-tracking-session.js";

const DEBUG_STORAGE_KEY =
  "ggw_geo_debug_enabled";

const DEBUG_API_NAME = "ggwGeo";

function isGeoDebugEnabled() {
  try {
    return (
      localStorage.getItem(
        DEBUG_STORAGE_KEY
      ) === "1"
    );
  } catch {
    return false;
  }
}

function createStatusSnapshot() {
  const runtime =
    getGeoRuntimeState();

  const tracking =
    getParticipantGeoTrackingState();

  const position =
    runtime.lastKnownPosition || null;

  return Object.freeze({
    authenticated:
      runtime.authenticated === true,

    permissionState:
      runtime.permissionState ||
      "unknown",

consentEnabled:
  runtime.consentEnabled === true,

trackingRunning:
  runtime.trackingRunning === true,

hasGeolocation:
  tracking.hasGeolocation === true,
    pageVisible:
      runtime.pageVisible === true,

    pageFocused:
      runtime.pageFocused === true,

    online:
      runtime.online !== false,

    hasLastKnownPosition:
      Boolean(position),

    lastSyncAt:
      Number(
        runtime.lastSyncAt ||
        tracking.lastSyncAt ||
        0
      ),

    lastError:
      tracking.lastError || null,
  });
}

function printStatus() {
  const status =
    createStatusSnapshot();

  console.group(
    "GoGoWorld GEO Status"
  );

  console.table(status);

  console.log(
    "Runtime completo:",
    getGeoRuntimeState()
  );

  console.log(
    "Tracking Session:",
    getParticipantGeoTrackingState()
  );

  console.groupEnd();

  return status;
}

function createGeoDebugApi() {
  return Object.freeze({
    status() {
      return createStatusSnapshot();
    },

    print() {
      return printStatus();
    },

    runtime() {
      return getGeoRuntimeState();
    },

    tracking() {
      return Object.freeze({
        ...getParticipantGeoTrackingState(),
      });
    },

    help() {
      const commands = Object.freeze({
        "ggwGeo.status()":
          "Restituisce lo stato GEO sintetico.",

        "ggwGeo.print()":
          "Stampa in console stato sintetico, Runtime e Tracking Session.",

        "ggwGeo.runtime()":
          "Restituisce lo snapshot completo del Geo Runtime.",

        "ggwGeo.tracking()":
          "Restituisce lo stato del Tracking Session.",
      });

      console.table(commands);

      return commands;
    },
  });
}

export function installGeoDebugConsole() {
  if (!isGeoDebugEnabled()) {
    return {
      ok: true,
      installed: false,
      reason: "GEO_DEBUG_DISABLED",
    };
  }

  if (
    Object.prototype.hasOwnProperty.call(
      window,
      DEBUG_API_NAME
    )
  ) {
    return {
      ok: true,
      installed: true,
      alreadyInstalled: true,
    };
  }

  Object.defineProperty(
    window,
    DEBUG_API_NAME,
    {
      value: createGeoDebugApi(),
      enumerable: false,
      configurable: true,
      writable: false,
    }
  );

  console.info(
    "GoGoWorld GEO Debug attivo. Usa ggwGeo.help()."
  );

  return {
    ok: true,
    installed: true,
  };
}
