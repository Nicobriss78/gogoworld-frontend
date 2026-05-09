import { getOrganizerUser } from "./organizer-identity.js?v=3";

export function renderTopbar() {
  const el = document.getElementById("organizer-topbar");
  if (!el) return;

  const user = getOrganizerUser();

  const username =
    user?.username ||
    user?.name ||
    user?.displayName ||
    user?.email ||
    "Organizzatore";

  el.innerHTML = `
    <header class="home-topbar org-topbar">
      <div class="home-topbar__row home-topbar__row--identity">
        <div class="home-topbar__identity">
          <div class="home-topbar__greeting">Ciao, ${username}</div>
          <div class="home-topbar__role">Area Organizzatore</div>
        </div>

        <div class="home-topbar__brand org-topbar__brand">GoGoWorld.life</div>
      </div>

      <div class="home-topbar__row home-topbar__row--actions">
        <a
          href="/pages/messages-v2.html?rootReturnTo=organizer"
          class="home-topbar__btn gw-iconbtn"
          aria-label="Messaggi"
          title="Messaggi"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-chat"></use>
          </svg>
          <span class="org-shell-badge" data-org-badge="messages" hidden></span>
        </a>

        <button
          class="home-topbar__btn gw-iconbtn"
          type="button"
          data-org-action="notifications"
          aria-label="Notifiche"
          title="Notifiche"
          aria-expanded="false"
          aria-controls="gwNotificationsPanel"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-bell"></use>
          </svg>
          <span class="org-shell-badge" data-org-badge="notifications" hidden></span>
        </button>

        <button
          class="home-topbar__btn gw-iconbtn is-disabled"
          type="button"
          aria-disabled="true"
          aria-label="Comunicazioni non ancora disponibili"
          title="Comunicazioni"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-communications"></use>
          </svg>
        </button>

        <a
          href="/pages/profilo-v2.html?rootReturnTo=organizer"
          class="home-topbar__btn gw-iconbtn"
          aria-label="Profilo"
          title="Profilo"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-profile"></use>
          </svg>
        </a>

        <button
          class="home-topbar__btn gw-iconbtn"
          type="button"
          data-org-action="menu"
          aria-label="Menu"
          title="Menu"
          aria-expanded="false"
          aria-controls="organizer-menu-panel"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-menu"></use>
          </svg>
        </button>
      </div>
    </header>
  `;
}
