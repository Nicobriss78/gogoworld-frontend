// js/index.js — gestione Homepage 0
import { whoami } from "./api.js";
document.addEventListener("DOMContentLoaded", async () => {
  // Se già loggato → redirect automatico nell’area coerente
  const token = localStorage.getItem("token");
  if (token) {
try {
  const res = await whoami(token);
  if (!res || res.ok === false) throw new Error(res?.message || "WHOAMI_FAILED");

  const me = (res.user || res.me || res.data || res) || null;
  const serverRole = String((me && me.role) || "").toLowerCase();

  if (serverRole === "admin") {
    window.location.href = "admin.html";
    return;
  }

  const role = (sessionStorage.getItem("desiredRole") || "participant");
  window.location.href = role === "organizer" ? "organizzatore.html" : "partecipante.html";
} catch (e) {
  const role = (sessionStorage.getItem("desiredRole") || "participant");
  window.location.href = role === "organizer" ? "organizzatore.html" : "partecipante.html";
}
return;

  }

  const btnOrganizer = document.getElementById("btnOrganizer");
  const btnParticipant = document.getElementById("btnParticipant");
  const btnRegister = document.getElementById("btnRegister");
  const installBanner = document.getElementById("installBanner");
  const installBtn = document.getElementById("installBtn");
  const installDismissBtn = document.getElementById("installDismissBtn");

  let deferredInstallPrompt = null;
  let installBannerTimer = null;

  const INSTALL_BANNER_DISMISSED_KEY = "gw_install_banner_dismissed";
  const INSTALL_BANNER_INSTALLED_KEY = "gw_pwa_installed";
  function selectRole(role) {
    try { sessionStorage.setItem("desiredRole", role); } catch {}
    window.location.href = "login.html";
  }

  if (btnOrganizer) btnOrganizer.addEventListener("click", () => selectRole("organizer"));
  if (btnParticipant) btnParticipant.addEventListener("click", () => selectRole("participant"));

  if (btnRegister) {
    btnRegister.addEventListener("click", () => {
      window.location.href = "pages/register.html"; // <- percorso giusto per register
    });
  }
});



