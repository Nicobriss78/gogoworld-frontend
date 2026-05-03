import { organizerState } from "./organizer-state.js";
import { loadIdentity } from "./organizer-identity.js";

function renderAccessDenied(message) {
  document.body.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Arial,sans-serif;background:#f5f7fb;">
      <section style="max-width:420px;background:#fff;border-radius:18px;padding:24px;box-shadow:0 12px 30px rgba(15,23,42,.12);">
        <h1 style="margin:0 0 12px;font-size:24px;">Accesso non autorizzato</h1>
        <p style="margin:0 0 18px;line-height:1.5;color:#475569;">${message}</p>
        <a href="/pages/home-v2.html" style="display:inline-block;text-decoration:none;font-weight:700;color:#0f6bff;">Torna all’area Partecipante</a>
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

    window.location.href = "/";
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
    window.location.href = "/";
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
    canOrganize;

  organizerState.access = {
    checked: true,
    allowed,
    reason: allowed ? null : "not-authorized",
  };

  if (!allowed) {
    renderAccessDenied("Il tuo profilo non è abilitato all’accesso come organizzatore.");
    return { allowed: false };
  }

  return { allowed: true, user };
}
  
