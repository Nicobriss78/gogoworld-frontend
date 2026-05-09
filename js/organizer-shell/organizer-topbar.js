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
    <header class="org-topbar">
      <div class="org-topbar__left">
        <button
          class="org-topbar__btn gw-iconbtn"
          type="button"
          data-org-action="menu"
          aria-label="Apri menu Organizer"
          aria-expanded="false"
          aria-controls="organizer-menu"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-menu"></use>
          </svg>
        </button>

        <div class="org-topbar__identity">
          <div class="org-topbar__greeting">Ciao, ${username}</div>
          <div class="org-topbar__role">Area Organizzatore</div>
        </div>
      </div>

      <div class="org-topbar__brand">GoGoWorld</div>

      <div class="org-topbar__actions">
        <a
          class="org-topbar__btn gw-iconbtn"
          href="/pages/messages-v2.html?rootReturnTo=organizer"
          aria-label="Messaggi"
          title="Messaggi"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-chat"></use>
          </svg>
          <span class="org-shell-badge" data-org-badge="messages" hidden></span>
        </a>

        <button
          class="org-topbar__btn gw-iconbtn"
          type="button"
          data-org-action="notifications"
          aria-label="Notifiche"
          title="Notifiche"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-bell"></use>
          </svg>
          <span class="org-shell-badge" data-org-badge="notifications" hidden></span>
        </button>

        <a
          class="org-topbar__btn gw-iconbtn is-disabled"
          href="#"
          aria-disabled="true"
          aria-label="Comunicazioni non ancora disponibili"
          title="Comunicazioni"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-communications"></use>
          </svg>
        </a>

        <a
          class="org-topbar__btn gw-iconbtn"
          href="/pages/profilo-v2.html?rootReturnTo=organizer"
          aria-label="Profilo"
          title="Profilo"
        >
          <svg class="gw-icon" aria-hidden="true">
            <use href="#gw-icon-profile"></use>
          </svg>
        </a>
      </div>
    </header>
  `;
}
