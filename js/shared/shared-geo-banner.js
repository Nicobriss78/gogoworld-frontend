// frontend/js/shared/shared-geo-banner.js
//
// Banner geografico condiviso dell'Area Partecipante.
//
// Fase 2B-2:
// - mantiene invariato il comportamento utente;
// - resta temporaneamente collegato al Consent Service;
// - legge il permesso esclusivamente dal Geo Runtime;
// - non interroga più direttamente navigator.permissions;
// - resta temporaneamente montato dalla Shared Shell.

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

let runtimeState =
  getGeoRuntimeState();

let stopRuntimeSubscription =
  null;

function bindGeoRuntimeSubscription() {
  if (stopRuntimeSubscription) {
    return;
  }

  stopRuntimeSubscription =
    subscribeGeoRuntime(
      (nextState) => {
        runtimeState =
          nextState;
      },
      {
        emitCurrent:
          true,
      }
    );
}

function shouldRespectDismiss(
  dismissedAt
) {
  return (
    dismissedAt &&
    Date.now() -
      dismissedAt <
      DISMISS_COOLDOWN_MS
  );
}

function getBannerCopy(
  variant = "default"
) {
  if (variant === "map") {
    return {
      title:
        "Attiva la posizione sulla mappa",

      text:
        "Con la posizione attiva possiamo mostrarti eventi vicini, trilli live e luoghi più rilevanti intorno a te.",
    };
  }

  if (variant === "event") {
    return {
      title:
        "Attiva la posizione per vivere meglio questo evento",

      text:
        "Con la posizione attiva puoi ricevere trilli live, velocizzare il check-in e scoprire cosa succede intorno a te durante l’evento.",
    };
  }

  return {
    title:
      "Vivi GoGoWorld intorno a te",

    text:
      "Attiva la posizione per scoprire eventi vicini, ricevere trilli live e trovare esperienze più rilevanti nella tua zona.",
  };
}

function createBanner({
  variant = "default",
} = {}) {
  const copy =
    getBannerCopy(
      variant
    );

  const banner =
    document.createElement(
      "section"
    );

  banner.id =
    GEO_BANNER_ID;

  banner.className =
    `shared-geo-banner shared-geo-banner--${variant}`;

  banner.setAttribute(
    "aria-label",
    "Attiva posizione GoGoWorld"
  );

  banner.innerHTML = `
    <div class="shared-geo-banner__content">
      <strong>${copy.title}</strong>
      <p>${copy.text}</p>
    </div>

    <div class="shared-geo-banner__actions">
      <button
        type="button"
        class="shared-geo-banner__primary"
        data-geo-action="enable"
      >
        Attiva posizione
      </button>

      <button
        type="button"
        class="shared-geo-banner__secondary"
        data-geo-action="dismiss"
      >
        Continua senza posizione
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
  button.disabled =
    true;

  button.textContent =
    "Attivazione...";

  try {
    const result =
      await requestAndSyncLocation();

    /*
     * Dopo l'interazione geografica aggiorniamo
     * il permesso centralizzato del Runtime.
     *
     * Il Runtime osserva normalmente anche
     * PermissionStatus.change, ma il refresh
     * esplicito rende il flusso robusto anche
     * sui browser meno coerenti.
     */
    await refreshGeoPermissionState();

    if (result?.ok) {
      removeBanner();

      dispatchGeoToast(
        "success",
        "Posizione attivata. Ora puoi ricevere trilli e scoprire eventi vicini."
      );

      return;
    }

    button.disabled =
      false;

    button.textContent =
      "Riprova";

    dispatchGeoToast(
      "error",
      "Non siamo riusciti ad attivare la posizione. Puoi riprovare quando vuoi."
    );
  } catch {
    await refreshGeoPermissionState()
      .catch(() => {});

    button.disabled =
      false;

    button.textContent =
      "Riprova";

    dispatchGeoToast(
      "error",
      "Non siamo riusciti ad attivare la posizione. Puoi riprovare quando vuoi."
    );
  }
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
        "enable"
      ) {
        await handleEnableAction(
          button
        );
      }
    }
  );
}

export async function mountSharedGeoBanner(
  options = {}
) {
  bindGeoRuntimeSubscription();

  if (
    document.getElementById(
      GEO_BANNER_ID
    )
  ) {
    return;
  }

  const promptState =
    getGeoPromptState();

  if (
    !promptState
      .hasGeolocation
  ) {
    return;
  }

  if (
    options.respectDismiss !==
      false &&
    shouldRespectDismiss(
      promptState
        .dismissedAt
    )
  ) {
    return;
  }

  /*
   * Il Banner non interroga più direttamente
   * navigator.permissions.
   *
   * Chiede al Runtime di garantire che il suo
   * stato centralizzato sia aggiornato.
   */
  await refreshGeoPermissionState();

  runtimeState =
    getGeoRuntimeState();

  if (
    runtimeState
      .permissionState ===
    "granted"
  ) {
    return;
  }

  const view =
    document.getElementById(
      "sharedTopbarMount"
    );

  if (!view) {
    return;
  }

  const banner =
    createBanner({
      variant:
        options.variant ||
        "default",
    });

  bindBannerActions(
    banner
  );

  view.insertAdjacentElement(
    "afterend",
    banner
  );
}
