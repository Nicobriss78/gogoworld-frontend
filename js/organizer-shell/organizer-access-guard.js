import { organizerState } from "./organizer-state.js?v=3";
import { loadIdentity } from "./organizer-identity.js?v=3";

function renderAccessDenied() {
  document.body.classList.add("organizer-shell", "organizer-access-denied-page");

  document.body.innerHTML = `
    <main class="org-access-denied" aria-labelledby="orgAccessDeniedTitle">
      <section class="org-access-denied__card">
        <h1 id="orgAccessDeniedTitle" class="org-access-denied__title">
          Accesso non autorizzato
        </h1>
        <p class="org-access-denied__text">
          Il tuo profilo non è abilitato all’accesso come organizzatore.
        </p>
        <a class="org-access-denied__link" href="/index.html">
          Torna alla schermata iniziale
        </a>
      </section>
    </main>
  `;
}

export async function checkAccess() {
  const token = localStorage.getItem("token");

  if (!token) {
    organizerState.access = {
      checked: true,
      allowed: false,
      reason: "missing-token",
    };

    window.location.href = "/index.html";
    return { allowed: false };
  }

  const user = await loadIdentity();

  if (!user) {
    organizerState.access = {
      checked: true,
      allowed: false,
      reason: "invalid-user",
    };

    localStorage.removeItem("token");
    window.location.href = "/index.html";
    return { allowed: false };
  }

  const role = String(user.role || "").toLowerCase();
  const sessionRole = String(user.sessionRole || "").toLowerCase();
  const canOrganize = Boolean(user.canOrganize);

  const allowed =
    role === "admin" ||
    role === "organizzatore" ||
    role === "organizer" ||
    sessionRole === "organizzatore" ||
    sessionRole === "organizer" ||
    canOrganize === true;

  organizerState.access = {
    checked: true,
    allowed,
    reason: allowed ? null : "not-authorized",
  };

  if (!allowed) {
    renderAccessDenied();
    return { allowed: false };
  }

  return { allowed: true, user };
}
