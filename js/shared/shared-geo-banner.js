// frontend/js/shared/shared-geo-banner.js
//
// Banner geografico condiviso dell'Area Partecipante.
//
// Step 3E.3-D1:
// - distingue attivazione, autorizzazione da completare e blocco browser;
// - non tenta nuovamente la geolocalizzazione quando il permesso è denied;
// - resta collegato al Consent Service per le azioni esplicite dell'utente;
// - usa esclusivamente il Geo Runtime per permissionState, consentEnabled e trackingRunning;
// - mantiene varianti, ancore e regole di dismissal esistenti.

import {
  dismissGeoPrompt,
  getGeoPromptState,
  requestAndSyncLocation,
} from "/js/shared/shared-geo-consent.js";

import {
  getGeoRuntimeState,
  refreshGeoPermissionState,
  subscribeGeoRuntime,
} from "/js/shared/geo-runtime.js";

const GEO_BANNER_ID =
  "sharedGeoConsentBanner";

const DISMISS_COOLDOWN_MS =
  24 * 60 * 60 * 1000;

const DEFAULT_BANNER_OPTIONS =
  Object.freeze({
    variant: "default",
    respectDismiss: true,
    anchorId: "sharedTopbarMount",
  });

const GEO_BANNER_MODES =
  Object.freeze({
    ENABLE:
      "enable",

    COMPLETE_PERMISSION:
      "complete-permission",

    BROWSER_BLOCKED:
  "browser-blocked",

LOCATION_UNAVAILABLE:
  "location-unavailable",

RESTART_TRACKING:
      "restart-tracking",
  });

let runtimeState =
  getGeoRuntimeState();

let activeBannerOptions = {
  ...DEFAULT_BANNER_OPTIONS,
};

let bannerMountRequested =
  false;

let stopRuntimeSubscription =
  null;

let activationInProgress =
  false;

function shouldRespectDismiss(
  dismissedAt
) {
  return Boolean(
    dismissedAt &&
      Date.now() -
        dismissedAt <
        DISMISS_COOLDOWN_MS
  );
}

function getBannerMode() {
  if (
    runtimeState.permissionState ===
    "denied"
  ) {
    return GEO_BANNER_MODES
      .BROWSER_BLOCKED;
  }

  if (
    runtimeState.consentEnabled !==
    true
  ) {
    return GEO_BANNER_MODES
      .ENABLE;
  }

  if (
    runtimeState.trackingRunning ===
    true
  ) {
    return null;
  }

  if (
    runtimeState.permissionState ===
    "prompt"
  ) {
    return GEO_BANNER_MODES
      .COMPLETE_PERMISSION;
  }

  if (
    runtimeState.permissionState ===
    "granted"
  ) {
    return GEO_BANNER_MODES
      .RESTART_TRACKING;
  }

  return null;
}

function getBannerCopy(
  variant = "default",
  mode = GEO_BANNER_MODES.ENABLE
) {
  if (
    mode ===
    GEO_BANNER_MODES
      .BROWSER_BLOCKED
  ) {
    return {
      title:
        "La posizione è bloccata dal browser",

      text:
        "Per usare gli eventi vicini, i trilli live e il check-in, devi consentire a GoGoWorld l’accesso alla posizione nelle impostazioni del sito.",

      primaryLabel:
        "Come abilitarla",

      primaryAction:
        "show-help",

      secondaryLabel:
        "Chiudi",

      ariaLabel:
        "Posizione bloccata dal browser",

      helpText:
        "Apri le impostazioni del sito dal menu del browser, consenti l’accesso alla posizione per GoGoWorld e poi torna su questa pagina. Se necessario, ricarica la pagina.",
    };
  }

  if (
    mode ===
    GEO_BANNER_MODES
      .COMPLETE_PERMISSION
  ) {
    return {
      title:
        "Completa l’attivazione della posizione",

      text:
        "GoGoWorld è configurato per usare la posizione. Tocca il pulsante e completa l’autorizzazione richiesta dal browser.",

      primaryLabel:
        "Consenti posizione",

      primaryAction:
        "enable",

      secondaryLabel:
        "Non ora",

      ariaLabel:
        "Completa attivazione posizione GoGoWorld",
    };
  }

  if (
    mode ===
    GEO_BANNER_MODES
      .RESTART_TRACKING
  ) {
    return {
      title:
        "Riattiva la posizione",

      text:
        "Il browser consente l’accesso alla posizione, ma il servizio GEO non è ancora attivo in questa pagina.",

      primaryLabel:
        "Riattiva posizione",

      primaryAction:
        "enable",

      secondaryLabel:
        "Non ora",

      ariaLabel:
        "Riattiva posizione GoGoWorld",
    };
  }

  if (
    variant ===
    "map"
  ) {
    return {
      title:
        "Attiva la posizione sulla mappa",

      text:
        "Con la posizione attiva possiamo mostrarti eventi vicini, trilli live e luoghi più rilevanti intorno a te.",

      primaryLabel:
        "Attiva posizione",

      primaryAction:
        "enable",

      secondaryLabel:
        "Continua senza posizione",

      ariaLabel:
        "Attiva posizione GoGoWorld",
    };
  }

  if (
    variant ===
    "event"
  ) {
    return {
      title:
        "Attiva la posizione per vivere meglio questo evento",

      text:
        "Con la posizione attiva puoi ricevere trilli live, velocizzare il check-in e scoprire cosa succede intorno a te durante l’evento.",

      primaryLabel:
        "Attiva posizione",

      primaryAction:
        "enable",

      secondaryLabel:
        "Continua senza posizione",

      ariaLabel:
        "Attiva posizione GoGoWorld",
    };
  }

  return {
    title:
      "Vivi GoGoWorld intorno a te",

    text:
      "Attiva la posizione per scoprire eventi vicini, ricevere trilli live e trovare esperienze più rilevanti nella tua zona.",

    primaryLabel:
      "Attiva posizione",

    primaryAction:
      "enable",

    secondaryLabel:
      "Continua senza posizione",

    ariaLabel:
      "Attiva posizione GoGoWorld",
  };
}

function createBanner({
  variant = "default",
  mode =
    GEO_BANNER_MODES.ENABLE,
} = {}) {
  const copy =
    getBannerCopy(
      variant,
      mode
    );

  const banner =
    document.createElement(
      "section"
    );

  banner.id =
    GEO_BANNER_ID;

  banner.className =
    `shared-geo-banner shared-geo-banner--${variant}`;

  banner.dataset.geoVariant =
    variant;

  banner.dataset.geoMode =
    mode;

  banner.setAttribute(
    "aria-label",
    copy.ariaLabel
  );

  const helpMarkup =
    copy.helpText
      ? `
        <p
          data-geo-help
          hidden
        >
          ${copy.helpText}
        </p>
      `
      : "";

  banner.innerHTML = `
    <div class="shared-geo-banner__content">
      <strong>${copy.title}</strong>
      <p>${copy.text}</p>
      ${helpMarkup}
    </div>

    <div class="shared-geo-banner__actions">
      <button
        type="button"
        class="shared-geo-banner__primary"
        data-geo-action="${copy.primaryAction}"
      >
        ${copy.primaryLabel}
      </button>

      <button
        type="button"
        class="shared-geo-banner__secondary"
        data-geo-action="dismiss"
      >
        ${copy.secondaryLabel}
      </button>
    </div>
  `;

  return banner;
}

function removeBanner() {
  document
    .getElementById(
      GEO_BANNER_ID
    )
    ?.remove();
}

function dispatchGeoToast(
  type,
  message
) {
  window.dispatchEvent(
    new CustomEvent(
      "gw:toast",
      {
        detail: {
          type,
          message,
        },
      }
    )
  );
}

async function handleEnableAction(
  button
) {
  activationInProgress =
    true;

  button.disabled =
    true;

  button.textContent =
    "Attivazione...";

  try {
    const result =
      await requestAndSyncLocation();

    /*
     * Il Banner non legge direttamente
     * navigator.permissions.
     *
     * Dopo il gesto dell'utente chiede
     * al Runtime di aggiornare lo stato
     * centralizzato del permesso.
     */
    await refreshGeoPermissionState();

    runtimeState =
      getGeoRuntimeState();

    activationInProgress =
      false;

    if (result?.ok) {
      removeBanner();

      dispatchGeoToast(
        "success",
        "Posizione attivata. Ora puoi ricevere trilli e scoprire eventi vicini."
      );

      return;
    }

    if (
      runtimeState
        .permissionState ===
      "denied"
    ) {
      reconcileGeoBanner();

      dispatchGeoToast(
        "error",
        "La posizione è bloccata dal browser. Consulta le istruzioni nel banner per abilitarla."
      );

      return;
    }

    button.disabled =
      false;

    button.textContent =
      "Riprova";

    reconcileGeoBanner();

    dispatchGeoToast(
      "error",
      "Non siamo riusciti ad attivare la posizione. Puoi riprovare quando vuoi."
    );
  } catch {
    await refreshGeoPermissionState()
      .catch(() => {});

    runtimeState =
      getGeoRuntimeState();

    activationInProgress =
      false;

    if (
      runtimeState
        .permissionState ===
      "denied"
    ) {
      reconcileGeoBanner();

      dispatchGeoToast(
        "error",
        "La posizione è bloccata dal browser. Consulta le istruzioni nel banner per abilitarla."
      );

      return;
    }

    button.disabled =
      false;

    button.textContent =
      "Riprova";

    reconcileGeoBanner();

    dispatchGeoToast(
      "error",
      "Non siamo riusciti ad attivare la posizione. Puoi riprovare quando vuoi."
    );
  }
}

function handleShowHelpAction(
  banner,
  button
) {
  const help =
    banner.querySelector(
      "[data-geo-help]"
    );

  if (!help) {
    return;
  }

  help.hidden =
    false;

  button.textContent =
    "Istruzioni mostrate";
}

function bindBannerActions(
  banner
) {
  banner.addEventListener(
    "click",
    async (event) => {
      const button =
        event.target.closest(
          "[data-geo-action]"
        );

      if (!button) {
        return;
      }

      const action =
        button.dataset
          .geoAction;

      if (
        action ===
        "dismiss"
      ) {
        dismissGeoPrompt();
        removeBanner();
        return;
      }

      if (
        action ===
        "show-help"
      ) {
        handleShowHelpAction(
          banner,
          button
        );

        return;
      }

      if (
        action ===
        "enable"
      ) {
        await handleEnableAction(
          button
        );
      }
    }
  );
}

function normalizeBannerOptions(
  options = {}
) {
  const anchorId =
    String(
      options.anchorId ||
        DEFAULT_BANNER_OPTIONS
          .anchorId
    ).trim();

  return {
    variant:
      options.variant ||
      DEFAULT_BANNER_OPTIONS
        .variant,

    respectDismiss:
      options.respectDismiss !==
      false,

    anchorId:
      anchorId ||
      DEFAULT_BANNER_OPTIONS
        .anchorId,
  };
}

function resolveBannerMode() {
  if (!bannerMountRequested) {
    return null;
  }

   if (
    runtimeState.authenticated !==
    true
  ) {
    return null;
  }

  /*
   * Durante il bootstrap GEO esistono stati
   * transitori perfettamente legittimi.
   *
   * Esempio:
   *
   * consentEnabled = true
   * trackingRunning = false
   *
   * mentre il Tracking Session sta ancora
   * ripristinando il watcher.
   *
   * Il Banner deve interpretare questi stati
   * soltanto quando il bootstrap è concluso.
   */
  if (
    runtimeState.geoBootstrapReady !==
    true
  ) {
    return null;
  }

  const promptState =
    getGeoPromptState();

  if (
    !promptState
      .hasGeolocation
  ) {
    return null;
  }

  if (
    activeBannerOptions
      .respectDismiss &&
    shouldRespectDismiss(
      promptState.dismissedAt
    )
  ) {
    return null;
  }

  return getBannerMode();
}

function reconcileGeoBanner() {
  if (activationInProgress) {
    return;
  }

  const bannerMode =
    resolveBannerMode();

  if (!bannerMode) {
    removeBanner();
    return;
  }

  const anchor =
    document.getElementById(
      activeBannerOptions
        .anchorId
    );

  if (!anchor) {
    removeBanner();
    return;
  }

  const currentBanner =
    document.getElementById(
      GEO_BANNER_ID
    );

  const currentVariant =
    currentBanner?.dataset
      .geoVariant || "";

  const currentAnchorId =
    currentBanner?.dataset
      .geoAnchorId || "";

  const currentMode =
    currentBanner?.dataset
      .geoMode || "";

  if (
    currentBanner &&
    currentVariant ===
      activeBannerOptions
        .variant &&
    currentAnchorId ===
      activeBannerOptions
        .anchorId &&
    currentMode ===
      bannerMode &&
    currentBanner
      .previousElementSibling ===
      anchor
  ) {
    return;
  }

  currentBanner?.remove();

  const banner =
    createBanner({
      variant:
        activeBannerOptions
          .variant,

      mode:
        bannerMode,
    });

  banner.dataset.geoAnchorId =
    activeBannerOptions
      .anchorId;

  bindBannerActions(
    banner
  );

  anchor.insertAdjacentElement(
    "afterend",
    banner
  );
}

function bindGeoRuntimeSubscription() {
  if (stopRuntimeSubscription) {
    return;
  }

  stopRuntimeSubscription =
    subscribeGeoRuntime(
      (nextState) => {
        runtimeState =
          nextState;

        reconcileGeoBanner();
      },
      {
        emitCurrent:
          true,
      }
    );
}

export async function mountSharedGeoBanner(
  options = {}
) {
  activeBannerOptions =
    normalizeBannerOptions(
      options
    );

  bannerMountRequested =
    true;

  bindGeoRuntimeSubscription();

  /*
   * Il Banner non interroga direttamente
   * navigator.permissions.
   *
   * Chiede al Runtime di aggiornare
   * il proprio stato centralizzato.
   */
  await refreshGeoPermissionState()
    .catch(() => {});

  runtimeState =
    getGeoRuntimeState();

  reconcileGeoBanner();
}
