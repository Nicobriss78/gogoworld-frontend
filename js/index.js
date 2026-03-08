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

  const INSTALL_BANNER_INSTALLED_KEY = "gw_pwa_installed";
  function selectRole(role) {
    try { sessionStorage.setItem("desiredRole", role); } catch {}
    window.location.href = "login.html";
  }
function wasInstallBannerDismissed() {
  return false;
}

  function markPwaInstalled() {
    try {
      localStorage.setItem(INSTALL_BANNER_INSTALLED_KEY, "1");
    } catch {}
  }
function isPwaInstalled() {
  try {
    return localStorage.getItem(INSTALL_BANNER_INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches ||
         window.navigator.standalone === true;
}
  function hideInstallBanner() {
    if (installBanner) installBanner.classList.add("is-hidden");
  }

  function showInstallBanner() {
  if (!installBanner) return;
  if (isPwaInstalled()) return;
  if (isStandaloneMode()) return;
  installBanner.classList.remove("is-hidden");
}
  if (btnOrganizer) btnOrganizer.addEventListener("click", () => selectRole("organizer"));
  if (btnParticipant) btnParticipant.addEventListener("click", () => selectRole("participant"));

if (btnRegister) {
    btnRegister.addEventListener("click", () => {
      window.location.href = "pages/register.html"; // <- percorso giusto per register
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (installBannerTimer) clearTimeout(installBannerTimer);
  installBannerTimer = setTimeout(() => {
    showInstallBanner();
  }, 1200);
});

  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;

      deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;

      if (choiceResult?.outcome === "accepted") {
        hideInstallBanner();
      }

      deferredInstallPrompt = null;
    });
  }

if (installDismissBtn) {
  installDismissBtn.addEventListener("click", () => {
    hideInstallBanner();
  });
}

  window.addEventListener("appinstalled", () => {
    markPwaInstalled();
    hideInstallBanner();
    deferredInstallPrompt = null;
  });
});












