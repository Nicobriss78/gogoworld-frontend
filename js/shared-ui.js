/* =========================================================
   shared-ui.js — UI v2 comune (topbar + menu + notifiche)
   Opzione 1: modulo nuovo, migrazione graduale.
   ========================================================= */

import { apiGet, apiPost } from "./api.js";

/* ANCHOR: SHARED_UI_UTILS */
function getTokenSafe() {
  try { return localStorage.getItem("token"); } catch { return null; }
}

/* ANCHOR: SHARED_UI_NOTI_PANEL */
function ensureNotiPanel() {
  let panel = document.getElementById("notiPanel");
  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = "notiPanel";
  panel.className = "noti-panel";
  panel.style.display = "none";
  document.body.appendChild(panel);
  return panel;
}

/* ANCHOR: SHARED_UI_NOTIFICATIONS */
async function toggleNotificationsPanel() {
  const token = getTokenSafe();
  if (!token) return;

  const notiPanel = ensureNotiPanel();

  try {
    const res = await apiGet("/notifications/mine?limit=50", token);
    const list = res?.notifications || [];

    notiPanel.innerHTML = list.length
      ? list.map((n) => {
          const title = n.title || "";
          const msg = n.message || "";
          const date = n.createdAt ? new Date(n.createdAt).toLocaleString() : "";
          return `
            <div class="noti-item">
              <p class="noti-title">${title}</p>
              <p class="noti-msg">${msg}</p>
              <p class="noti-date">${date}</p>
            </div>
          `;
        }).join("")
      : `<p class="noti-empty">Nessuna notifica</p>`;

    notiPanel.style.display = (notiPanel.style.display === "none") ? "block" : "none";

    // Segna tutte come lette
    await apiPost("/notifications/read-all", {}, token);

    // Facoltativo: se qualche pagina ascolta eventi, notifichiamo
    try { window.dispatchEvent(new CustomEvent("notifications:updated")); } catch {}
  } catch (err) {
    console.error("notifiche", err);
  }
}

/* ANCHOR: SHARED_UI_HAMBURGER */
function initHamburgerMenu() {
  const btnHamburger = document.getElementById("btnHamburger");
  const gwMenu = document.getElementById("gwMenu");
  if (!btnHamburger || !gwMenu) return;

const closeGwMenu = () => {
    gwMenu.style.display = "none";
    try { btnHamburger.setAttribute("aria-expanded", "false"); } catch {}
  };

  const isMenuOpen = () => {
    // più robusto di gwMenu.style.display (che può essere vuoto)
    const cur = window.getComputedStyle(gwMenu).display;
    return cur !== "none";
  };

  const toggleGwMenu = () => {
    const open = isMenuOpen();
    // .gw-menu è disegnato per display:flex nel tuo CSS
    gwMenu.style.display = open ? "none" : "flex";
    try { btnHamburger.setAttribute("aria-expanded", String(!open)); } catch {}
  };


btnHamburger.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopImmediatePropagation(); // blocca eventuali altri listener sull’hamburger
    toggleGwMenu();
  }, { capture: true }); // prende il click prima di altri listener in bubble

  gwMenu.addEventListener("click", (e) => e.stopPropagation());

  document.addEventListener("click", () => closeGwMenu());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeGwMenu();
  });
}

/* ANCHOR: SHARED_UI_MENU_ACTIONS */
function initMenuActions() {
  const btnLogout = document.getElementById("btnLogout");
  const btnSwitchRole = document.getElementById("btnSwitchRole");
  const btnPrivateEventsMenu = document.getElementById("btnPrivateEvents");
  const btnGuide = document.getElementById("btnGuide");
  const gwMenu = document.getElementById("gwMenu");

  const closeGwMenu = () => {
    if (!gwMenu) return;
    gwMenu.style.display = "none";
    const btnHamburger = document.getElementById("btnHamburger");
    try { btnHamburger?.setAttribute("aria-expanded", "false"); } catch {}
  };

  if (btnLogout) {
    btnLogout.addEventListener("click", (e) => {
      e.preventDefault();
      try { localStorage.removeItem("token"); } catch {}
      try { sessionStorage.removeItem("desiredRole"); } catch {}
      window.location.href = "index.html";
    });
  }

  if (btnSwitchRole) {
    btnSwitchRole.addEventListener("click", (e) => {
      e.preventDefault();
      try { sessionStorage.setItem("desiredRole", "organizer"); } catch {}
      window.location.href = "organizzatore.html";
    });
  }

  if (btnPrivateEventsMenu) {
    btnPrivateEventsMenu.addEventListener("click", (e) => {
      e.preventDefault();
      closeGwMenu();

      const legacy = document.querySelector("section.legacy");
      if (legacy) {
        legacy.style.display = (legacy.style.display === "none") ? "block" : "none";
        legacy.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        alert("Sezione Eventi privati non trovata (legacy).");
      }
    });
  }

  if (btnGuide) {
    btnGuide.addEventListener("click", (e) => {
      e.preventDefault();
      closeGwMenu();
      alert("Guida partecipante: in arrivo 🙂");
    });
  }
}

/* ANCHOR: SHARED_UI_TOPBAR */
export function initSharedTopbarUI() {
  const boot = () => {
    // Notifiche
    const btnNotifications = document.getElementById("btnNotifications");
    if (btnNotifications && !btnNotifications.dataset.gwBound) {
      btnNotifications.dataset.gwBound = "1";
      btnNotifications.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleNotificationsPanel();
      });
    }

    // Hamburger + voci menu
    initHamburgerMenu();
    initMenuActions();
  };

  // Se il DOM non è ancora pronto, aspettiamo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}

