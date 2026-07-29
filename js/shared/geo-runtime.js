// frontend/js/shared/geo-runtime.js
//
// Runtime strutturale globale per i servizi geografici
// dell'Area Partecipante.
//
// Fase 2B-2:
// - mantiene uno stato geografico/lifecycle centralizzato;
// - pubblica aggiornamenti in modo idempotente;
// - legge e osserva centralmente il permesso geolocalizzazione;
// - NON accede alle coordinate GPS;
// - NON gestisce consenso applicativo;
// - NON avvia watcher geografici;
// - NON sincronizza il backend;
// - NON monta banner;
// - NON interagisce con Leaflet.

const GEO_RUNTIME_EVENTS = Object.freeze({
  INITIALIZED:
    "ggw:geo-runtime:initialized",

  STATE_CHANGED:
    "ggw:geo-runtime:state-changed",
});

const subscribers = new Set();

let initialized = false;
let lifecycleBound = false;

let permissionStatus = null;
let permissionQueryPromise = null;
let permissionListenerBound = false;

let state = createInitialState();

function createInitialState() {
  return {
    initialized: false,
    authenticated: false,

    online:
      readOnlineState(),

    pageVisible:
      readPageVisibleState(),

    pageFocused:
      readPageFocusedState(),

    pagePersisted: false,

    permissionState:
      "unknown",

    consentEnabled:
  false,

trackingRunning:
  false,

lastKnownPosition:
  null,

    lastSyncAt:
      null,
  };
}

function readOnlineState() {
  return typeof navigator ===
    "undefined"
    ? true
    : navigator.onLine !== false;
}

function readPageVisibleState() {
  return typeof document ===
    "undefined"
    ? true
    : document.visibilityState !==
        "hidden";
}

function readPageFocusedState() {
  if (
    typeof document ===
      "undefined" ||
    typeof document.hasFocus !==
      "function"
  ) {
    return true;
  }

  return document.hasFocus();
}

function normalizePermissionState(
  value
) {
  if (
    value === "granted" ||
    value === "prompt" ||
    value === "denied"
  ) {
    return value;
  }

  return "unknown";
}

function clonePosition(position) {
  if (
    !position ||
    typeof position !== "object"
  ) {
    return null;
  }

  return {
    ...position,
  };
}

function createStateSnapshot() {
  return Object.freeze({
    ...state,

    lastKnownPosition:
      clonePosition(
        state.lastKnownPosition
      ),
  });
}

function emitWindowEvent(
  eventName,
  detail
) {
  if (
    typeof window ===
      "undefined" ||
    typeof CustomEvent !==
      "function"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(eventName, {
      detail,
    })
  );
}

function notifySubscribers(
  snapshot,
  changedKeys
) {
  subscribers.forEach(
    (subscriber) => {
      try {
        subscriber(
          snapshot,
          changedKeys
        );
      } catch (error) {
        console.error(
          "geo-runtime: subscriber failed",
          error
        );
      }
    }
  );
}

function applyStatePatch(
  patch,
  {
    emit = true,
  } = {}
) {
  if (
    !patch ||
    typeof patch !== "object"
  ) {
    return createStateSnapshot();
  }

  const changedKeys = [];

  const nextState = {
    ...state,
  };

  Object.entries(patch).forEach(
    ([key, value]) => {
      if (!(key in nextState)) {
        return;
      }

      const normalizedValue =
        key ===
        "lastKnownPosition"
          ? clonePosition(value)
          : key ===
              "permissionState"
            ? normalizePermissionState(
                value
              )
            : value;

      if (
        Object.is(
          nextState[key],
          normalizedValue
        )
      ) {
        return;
      }

      nextState[key] =
        normalizedValue;

      changedKeys.push(key);
    }
  );

  if (
    changedKeys.length === 0
  ) {
    return createStateSnapshot();
  }

  state = nextState;

  const snapshot =
    createStateSnapshot();

  if (emit) {
    const immutableChangedKeys =
      Object.freeze([
        ...changedKeys,
      ]);

    notifySubscribers(
      snapshot,
      immutableChangedKeys
    );

    emitWindowEvent(
      GEO_RUNTIME_EVENTS
        .STATE_CHANGED,
      {
        state: snapshot,

        changedKeys:
          immutableChangedKeys,
      }
    );
  }

  return snapshot;
}

function handlePageShow(event) {
  applyStatePatch({
    pageVisible:
      readPageVisibleState(),

    pageFocused:
      readPageFocusedState(),

    pagePersisted:
      Boolean(event?.persisted),

    online:
      readOnlineState(),
  });

  refreshGeoPermissionState()
    .catch(() => {});
}

function handlePageHide(event) {
  applyStatePatch({
    pageVisible:
      false,

    pageFocused:
      false,

    pagePersisted:
      Boolean(event?.persisted),
  });
}

function handleVisibilityChange() {
  const pageVisible =
    readPageVisibleState();

  applyStatePatch({
    pageVisible,
  });

  if (pageVisible) {
    refreshGeoPermissionState()
      .catch(() => {});
  }
}

function handleOnline() {
  applyStatePatch({
    online: true,
  });
}

function handleOffline() {
  applyStatePatch({
    online: false,
  });
}

function handleFocus() {
  applyStatePatch({
    pageFocused: true,
  });
}

function handleBlur() {
  applyStatePatch({
    pageFocused: false,
  });
}

function handlePermissionChange() {
  if (!permissionStatus) {
    return;
  }

  applyStatePatch({
    permissionState:
      permissionStatus.state,
  });
}

function bindPermissionListener(
  status
) {
  if (
    permissionListenerBound ||
    !status
  ) {
    return;
  }

  permissionListenerBound = true;

  if (
    typeof status.addEventListener ===
    "function"
  ) {
    status.addEventListener(
      "change",
      handlePermissionChange
    );

    return;
  }

  status.onchange =
    handlePermissionChange;
}

function bindLifecycleListeners() {
  if (
    lifecycleBound ||
    typeof window ===
      "undefined"
  ) {
    return;
  }

  lifecycleBound = true;

  window.addEventListener(
    "pageshow",
    handlePageShow
  );

  window.addEventListener(
    "pagehide",
    handlePageHide
  );

  window.addEventListener(
    "online",
    handleOnline
  );

  window.addEventListener(
    "offline",
    handleOffline
  );

  window.addEventListener(
    "focus",
    handleFocus
  );

  window.addEventListener(
    "blur",
    handleBlur
  );

  if (
    typeof document !==
    "undefined"
  ) {
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );
  }
}

/*
 * Unico punto autorizzato a interrogare
 * la Permissions API per la geolocalizzazione.
 *
 * I componenti UI, incluso il Banner,
 * devono leggere il risultato dal Runtime.
 */
export async function refreshGeoPermissionState() {
  if (
    typeof navigator ===
      "undefined" ||
    !navigator.permissions?.query
  ) {
    return applyStatePatch({
      permissionState:
        "unknown",
    }).permissionState;
  }

  if (permissionStatus) {
    applyStatePatch({
      permissionState:
        permissionStatus.state,
    });

    return normalizePermissionState(
      permissionStatus.state
    );
  }

  if (permissionQueryPromise) {
    return permissionQueryPromise;
  }

  permissionQueryPromise =
    navigator.permissions
      .query({
        name: "geolocation",
      })
      .then((status) => {
        permissionStatus =
          status;

        bindPermissionListener(
          status
        );

        const nextPermissionState =
          normalizePermissionState(
            status.state
          );

        applyStatePatch({
          permissionState:
            nextPermissionState,
        });

        return nextPermissionState;
      })
      .catch(() => {
        permissionStatus =
          null;

        permissionListenerBound =
          false;

        applyStatePatch({
          permissionState:
            "unknown",
        });

        return "unknown";
      })
      .finally(() => {
        permissionQueryPromise =
          null;
      });

  return permissionQueryPromise;
}

export function initGeoRuntime({
  authenticated = false,
} = {}) {
  if (initialized) {
    const snapshot =
      applyStatePatch({
        authenticated:
          Boolean(
            authenticated
          ),
      });

    refreshGeoPermissionState()
      .catch(() => {});

    return snapshot;
  }

  initialized = true;

  bindLifecycleListeners();

  const snapshot =
    applyStatePatch(
      {
        initialized:
          true,

        authenticated:
          Boolean(
            authenticated
          ),

        online:
          readOnlineState(),

        pageVisible:
          readPageVisibleState(),

        pageFocused:
          readPageFocusedState(),

        pagePersisted:
          false,
      },
      {
        emit: false,
      }
    );

  const initializedKeys =
    Object.freeze([
      "initialized",
      "authenticated",
    ]);

  notifySubscribers(
    snapshot,
    initializedKeys
  );

  emitWindowEvent(
    GEO_RUNTIME_EVENTS
      .INITIALIZED,
    {
      state: snapshot,
    }
  );

  /*
   * Lettura asincrona e non bloccante.
   *
   * Non apre alcuna richiesta GPS
   * e non mostra il prompt del browser.
   */
  refreshGeoPermissionState()
    .catch(() => {});

  return snapshot;
}

export function getGeoRuntimeState() {
  return createStateSnapshot();
}

export function updateGeoRuntimeState(
  patch
) {
  if (!initialized) {
    initGeoRuntime();
  }

  return applyStatePatch(
    patch
  );
}

export function subscribeGeoRuntime(
  subscriber,
  {
    emitCurrent = false,
  } = {}
) {
  if (
    typeof subscriber !==
    "function"
  ) {
    return () => {};
  }

  subscribers.add(
    subscriber
  );

  if (emitCurrent) {
    try {
      subscriber(
        createStateSnapshot(),
        Object.freeze([])
      );
    } catch (error) {
      console.error(
        "geo-runtime: subscriber failed",
        error
      );
    }
  }

  return () => {
    subscribers.delete(
      subscriber
    );
  };
}

export {
  GEO_RUNTIME_EVENTS,
};
