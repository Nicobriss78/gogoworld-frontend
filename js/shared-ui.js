/* =========================================================
   shared-ui.js — UI v2 comune (topbar + menu + notifiche)
   Opzione 1: modulo nuovo, migrazione graduale.
   ========================================================= */

import { apiGet, apiPost } from "./api.js";
/* ANCHOR: SHARED_UI_ICON_SPRITE */
const GW_ICON_SPRITE_ID = "gw-icons-sprite";

function ensureGwIconSprite() {
  // Evita doppio inserimento tra pagine o re-init
  if (document.getElementById(GW_ICON_SPRITE_ID)) return;

  const wrap = document.createElement("div");
  wrap.id = GW_ICON_SPRITE_ID;
  wrap.setAttribute("aria-hidden", "true");
  // Nascondi lo sprite senza usare style.display (J2) e senza dipendere da CSS esterno
  // (style inline NON è display; è ok per nascondere l'asset e non impatta layout)
  wrap.style.position = "absolute";
  wrap.style.width = "0";
  wrap.style.height = "0";
  wrap.style.overflow = "hidden";

  // TODO: qui inseriremo i <symbol> reali (sprite v1) nel prossimo step
  wrap.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <symbol id="gw-icon-search" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </symbol>

    <symbol id="gw-icon-pin" viewBox="0 0 24 24">
      <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </symbol>

    <symbol id="gw-icon-chat" viewBox="0 0 24 24">
      <path d="M21 12c0 4.4-4 8-9 8-1.2 0-2.3-.2-3.3-.6L3 21l1.7-4.2A7.4 7.4 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" />
    </symbol>

    <symbol id="gw-icon-bell" viewBox="0 0 24 24">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </symbol>

    <symbol id="gw-icon-menu" viewBox="0 0 24 24">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </symbol>

    <symbol id="gw-icon-map" viewBox="0 0 24 24">
      <path d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
    </symbol>

    <symbol id="gw-icon-calendar" viewBox="0 0 24 24">
      <path d="M8 3v3" />
      <path d="M16 3v3" />
      <path d="M4 8h16" />
      <rect x="4" y="5" width="16" height="16" rx="2" ry="2" />
    </symbol>

    <symbol id="gw-icon-home" viewBox="0 0 24 24">
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10.5V20a1 1 0 0 0 1 1h5v-6h2v6h5a1 1 0 0 0 1-1v-9.5" />
    </symbol>

    <symbol id="gw-icon-users" viewBox="0 0 24 24">
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="10" cy="7" r="3" />
      <path d="M21 21v-2a3.5 3.5 0 0 0-2.5-3.4" />
      <path d="M16.5 3.4a3 3 0 0 1 0 5.2" />
    </symbol>

    <symbol id="gw-icon-profile" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </symbol>
  </svg>
`;

  // Primo nodo del body per renderlo disponibile subito
  document.body.insertBefore(wrap, document.body.firstChild);
}
/* ANCHOR: SHARED_UI_UTILS */
function getTokenSafe() {
  try { return localStorage.getItem("token"); } catch { return null; }
}
// ==============================
// J2 helpers — show/hide via classi (no element.style.display)
// ==============================
function setHidden(el, hidden) {
  if (!el) return;
  el.classList.toggle("is-hidden", !!hidden);
}
function isHiddenEl(el) {
  return !!el?.classList?.contains("is-hidden");
}
function showEl(el) { setHidden(el, false); }
function hideEl(el) { setHidden(el, true); }
function toggleHidden(el) { setHidden(el, !isHiddenEl(el)); }
/* ANCHOR: SHARED_UI_NOTI_PANEL */
function ensureNotiPanel() {
  let panel = document.getElementById("notiPanel");
  if (panel) return panel;

  panel = document.createElement("div");
  panel.id = "notiPanel";
  panel.className = "noti-panel";
  hideEl(panel);
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

    toggleHidden(notiPanel);

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
  // Fail-safe: stato iniziale coerente
  hideEl(gwMenu);
  try { btnHamburger.setAttribute("aria-expanded", "false"); } catch {}
  const closeGwMenu = () => {
      hideEl(gwMenu);
      try { btnHamburger.setAttribute("aria-expanded", "false"); } catch {}
  };

  const isMenuOpen = () => {
    // più robusto di gwMenu.style.display (che può essere vuoto)
    const cur = window.getComputedStyle(gwMenu).display;
    return cur !== "none";
  };

   const toggleGwMenu = () => {
     const open = isMenuOpen();
     // .gw-menu è disegnato per display:flex nel CSS; qui facciamo solo hide/show via classi
     setHidden(gwMenu, open);
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
    hideEl(gwMenu);
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
    window.location.href = "partecipante-privati.html";
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
    // Sprite icone (una sola volta)
    ensureGwIconSprite();

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

