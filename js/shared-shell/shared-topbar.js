import {
  resolveUserIdentity,
  applyUserIdentityToTopbar,
} from "../shared/user-identity.js";

export function mountTopbar({ mountPoint, onEvent }) {
  if (!mountPoint) return;

  mountPoint.innerHTML = `
    <header class="home-topbar">
      <div class="home-topbar__row home-topbar__row--identity">
        <div class="home-topbar__identity">
          <div class="home-topbar__greeting" data-el="greeting">Ciao</div>
          <div class="home-topbar__role" data-el="role">Esploratore</div>
        </div>
        <div class="home-topbar__brand">GoGoWorld.life</div>
      </div>

      <div class="home-topbar__row home-topbar__row--actions">
        <a
          href="/pages/cerca-utenti.html"
          class="home-topbar__btn gw-iconbtn"
          aria-label="Cerca"
          title="Cerca"
          data-topbar-link="search"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-search"></use>
          </svg>
        </a>

        <a
          href="/pages/mappa-v2.html"
          class="home-topbar__btn gw-iconbtn"
          aria-label="Mappa"
          title="Mappa"
          data-topbar-link="map"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-pin"></use>
          </svg>
        </a>

        <a
          href="/messages.html"
          class="home-topbar__btn gw-iconbtn"
          aria-label="Messaggi"
          title="Messaggi"
          data-topbar-link="messages"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-chat"></use>
          </svg>
        </a>

        <button
          class="home-topbar__btn gw-iconbtn"
          type="button"
          data-action="notifications"
          aria-label="Notifiche"
          title="Notifiche"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-bell"></use>
          </svg>
        </button>

        <button
          class="home-topbar__btn gw-iconbtn"
          type="button"
          data-action="menu"
          aria-label="Menu"
          title="Menu"
          aria-expanded="false"
          aria-controls="sharedMenuPanel"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-menu"></use>
          </svg>
        </button>
      </div>
    </header>
  `;

  bindTopbar(mountPoint, onEvent);
  void applyIdentity(mountPoint);
}

function bindTopbar(root, onEvent) {
  root.querySelectorAll("[data-topbar-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const action = link.getAttribute("data-topbar-link");

      if (typeof onEvent === "function") {
        event.preventDefault();
        onEvent({
          type: "topbar-action",
          action,
        });
      }
    });
  });

  root.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-action");

      if (typeof onEvent === "function") {
        onEvent({
          type: "topbar-action",
          action,
        });
      }
    });
  });
}

async function applyIdentity(root) {
  const identity = await resolveUserIdentity();

  applyUserIdentityToTopbar({
    greetingEl: root.querySelector('[data-el="greeting"]'),
    roleEl: root.querySelector('[data-el="role"]'),
    identity,
  });
}
