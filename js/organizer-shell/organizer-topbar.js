import { getOrganizerUser } from "./organizer-identity.js";

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
    <div class="org-topbar">
      <div class="org-topbar-title">GoGoWorld Organizer</div>
      <div class="org-topbar-user">Ciao, ${username}</div>
    </div>
  `;
}
