import {
  dismissGeoPrompt,
  getGeoPromptState,
  requestAndSyncLocation,
} from "/js/shared/shared-geo-consent.js";

const GEO_BANNER_ID = "sharedGeoConsentBanner";
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function shouldRespectDismiss(dismissedAt) {
  return dismissedAt && Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
}

async function getPermissionState() {
  if (!navigator.permissions?.query) return "unknown";

  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    return permission.state;
  } catch {
    return "unknown";
  }
}

function getBannerCopy(variant = "default") {
  if (variant === "map") {
    return {
      title: "Attiva la posizione sulla mappa",
      text:
        "Con la posizione attiva possiamo mostrarti eventi vicini, trilli live e luoghi più rilevanti intorno a te.",
    };
  }

  return {
    title: "Vivi GoGoWorld intorno a te",
    text:
      "Attiva la posizione per scoprire eventi vicini, ricevere trilli live e trovare esperienze più rilevanti nella tua zona.",
  };
}

function createBanner({ variant = "default" } = {}) {
  const copy = getBannerCopy(variant);
  const banner = document.createElement("section");
  banner.id = GEO_BANNER_ID;
  banner.className = `shared-geo-banner shared-geo-banner--${variant}`;
  banner.setAttribute("aria-label", "Attiva posizione GoGoWorld");

  banner.innerHTML = `
    <div class="shared-geo-banner__content">
      <strong>${copy.title}</strong>
      <p>${copy.text}</p>
    </div>

    <div class="shared-geo-banner__actions">
      <button type="button" class="shared-geo-banner__primary" data-geo-action="enable">
        Attiva posizione
      </button>
      <button type="button" class="shared-geo-banner__secondary" data-geo-action="dismiss">
        Continua senza posizione
      </button>
    </div>
  `;

  return banner;
}

function removeBanner() {
  document.getElementById(GEO_BANNER_ID)?.remove();
}

export async function mountSharedGeoBanner(options = {}) {  
  if (document.getElementById(GEO_BANNER_ID)) return;

  const state = getGeoPromptState();

  if (!state.hasGeolocation) return;
  if (options.respectDismiss !== false && shouldRespectDismiss(state.dismissedAt)) return;

  const permissionState = await getPermissionState();

  if (permissionState === "granted") return;
  if (permissionState === "denied") return;

  const view = document.getElementById("sharedTopbarMount");
  if (!view) return;

  const banner = createBanner({
  variant: options.variant || "default",
});

  banner.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-geo-action]");
    if (!button) return;

    const action = button.dataset.geoAction;

    if (action === "dismiss") {
      dismissGeoPrompt();
      removeBanner();
      return;
    }

    if (action === "enable") {
  button.disabled = true;
  button.textContent = "Attivazione...";

  try {
    const result = await requestAndSyncLocation();

    if (result?.ok) {
      removeBanner();

      window.dispatchEvent(
        new CustomEvent("gw:toast", {
          detail: {
            type: "success",
            message:
              "Posizione attivata. Ora puoi ricevere trilli e scoprire eventi vicini.",
          },
        })
      );

      return;
    }

    button.disabled = false;
    button.textContent = "Riprova";

    window.dispatchEvent(
      new CustomEvent("gw:toast", {
        detail: {
          type: "error",
          message:
            "Non siamo riusciti ad attivare la posizione. Puoi riprovare quando vuoi.",
          },
        })
      );
  } catch {
    button.disabled = false;
    button.textContent = "Riprova";

    window.dispatchEvent(
      new CustomEvent("gw:toast", {
        detail: {
          type: "error",
          message:
            "Non siamo riusciti ad attivare la posizione. Puoi riprovare quando vuoi.",
          },
        })
      );
  }
}
  });

  view.insertAdjacentElement("afterend", banner);
}
