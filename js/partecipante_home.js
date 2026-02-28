// js/partecipante-home.js — Area Partecipante (HOME)
// Estratto da partecipante.js: contiene SOLO logica HOME + contorno comune necessario alla HOME.

import { apiGet, apiPost } from "./api.js";
import { getRoomsUnreadCount } from "./api.js";
import { sortEventsForParticipant } from "./core/event-sorting.js";
import { renderEventCard } from "./home-cards.js";
import {
  injectBannerSlots,
  renderBannerSlotHTML,
  activateHomeBannerSlots
} from "./home-banners.js";

import { showAlert, maybeShowProfileNag } from "./participant-shared.js";

// -----------------------------
// Stato
// -----------------------------
let token = localStorage.getItem("token");

// cache eventi
let allEvents = [];
let joinedEvents = [];
let myEvents = [];

// following (per badge/azioni su card)
let myUserId = null;
let myRegion = "";
let myCountry = "";

// eventi privati (legacy: toggle da menu)
let PRIVATE_LS_KEY = null;
let privateEventIds = [];
let privateEvents = [];

let followingIds = new Set();
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

// -----------------------------
// Helpers UI
// -----------------------------
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function setupScrollRails() {
  const rails = document.querySelectorAll(".gw-carousel-wrap");
  rails.forEach((wrap) => {
    const list = wrap.querySelector(".gw-carousel");
    const rail = wrap.querySelector(".gw-rail");
    const thumb = wrap.querySelector(".gw-rail-thumb");
    if (!list || !rail || !thumb) return;

    const syncThumb = () => {
      const maxScroll = list.scrollWidth - list.clientWidth;
      const railW = rail.clientWidth;

      if (maxScroll <= 0 || railW <= 0) {
        thumb.style.width = "100%";
        thumb.style.transform = "translateX(0px)";
        return;
      }

      const ratio = list.clientWidth / list.scrollWidth;
      const thumbW = clamp(Math.round(railW * ratio), 28, railW);
      thumb.style.width = `${thumbW}px`;

      const x = (list.scrollLeft / maxScroll) * (railW - thumbW);
      thumb.style.transform = `translateX(${Math.round(x)}px)`;
    };

    list.addEventListener("scroll", syncThumb, { passive: true });
    window.addEventListener("resize", syncThumb);
    syncThumb();
  });
}

// -----------------------------
// Eventi privati (legacy) — ancora usato via voce menu
// -----------------------------
function loadPrivateIds() {
  try {
    const raw = localStorage.getItem(PRIVATE_LS_KEY) || "[]";
    const arr = JSON.parse(raw);
    privateEventIds = Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    privateEventIds = [];
  }
}

function savePrivateIds() {
  try {
    localStorage.setItem(PRIVATE_LS_KEY, JSON.stringify(privateEventIds));
  } catch {}
}

function updatePrivateCount() {
  const el = document.getElementById("privateCount");
  if (!el) return;
  el.textContent = String(privateEventIds.length);
}

function renderPrivateList() {
  const list = document.getElementById("privateList");
  if (!list) return;

  if (!privateEvents.length) {
    list.innerHTML = `<div class="muted">Nessun evento privato.</div>`;
    return;
  }

  list.innerHTML = privateEvents
    .map((ev) => {
      return `
        <div class="private-item">
          <div class="private-title">${ev.title || "Evento"}</div>
          <div class="private-meta">${ev.date || ""}</div>
        </div>
      `;
    })
    .join("");
}

async function refreshPrivateEvents() {
  if (!token) return;
  loadPrivateIds();

  if (!privateEventIds.length) {
    privateEvents = [];
    renderPrivateList();
    return;
  }

  const results = [];
  for (const id of privateEventIds) {
    try {
      const ev = await apiGet(`/events/${encodeURIComponent(id)}`, token);
      if (ev) results.push(ev);
    } catch {
      // ignora singoli errori
    }
  }

  privateEvents = results;
  renderPrivateList();
  updatePrivateCount();
}

// -----------------------------
// HOME — Load + Render eventi
// -----------------------------
function renderLoadingSkeleton() {
  const allList = document.getElementById("allEventsList");
  if (!allList) return;

  // Placeholder “safe” (markup valido)
  allList.innerHTML = `
    <article class="gw-rail">
      <div class="gw-rail-body">
        <span>Sto recuperando gli eventi…</span>
      </div>
    </article>
  `;
}

function renderHomeLists() {
  const allList = document.getElementById("allEventsList");
  const joinedList = document.getElementById("joinedEventsList");
  const myList = document.getElementById("myEventsList");

  if (allList) {
    allList.innerHTML = `
      <div class="gw-carousel-wrap">
        <div class="gw-carousel">
          ${allEvents.map((ev) => renderEventCard(ev, false)).join("")}
        </div>
        <div class="gw-rail"><div class="gw-rail-thumb"></div></div>
      </div>
    `;
  }

  if (joinedList) {
    joinedList.innerHTML = `
      <div class="gw-carousel-wrap">
        <div class="gw-carousel">
          ${joinedEvents.map((ev) => renderEventCard(ev, true)).join("")}
        </div>
        <div class="gw-rail"><div class="gw-rail-thumb"></div></div>
      </div>
    `;
  }

  if (myList) {
    myList.innerHTML = `
      <div class="gw-carousel-wrap">
        <div class="gw-carousel">
          ${myEvents.map((ev) => renderEventCard(ev, false)).join("")}
        </div>
        <div class="gw-rail"><div class="gw-rail-thumb"></div></div>
      </div>
    `;
  }

  // banner slots dentro HOME (se previsti nella tua UI)
  try {
    injectBannerSlots();
    // se hai container banner specifici, li attivi qui
    activateHomeBannerSlots();
  } catch {}
}

async function loadEvents() {
  if (!token) return;

  renderLoadingSkeleton();

  try {
    // eventi pubblici
    const eventsRes = await apiGet("/events", token);
    const events = Array.isArray(eventsRes) ? eventsRes : (eventsRes?.events || []);

    // ordina/normalizza (riuso util esistente)
    const sorted = sortEventsForParticipant(events);

    // split: joined / my
    // NB: qui manteniamo la tua logica esistente “per convenzione”
    // Se nella tua API hai campi diversi, lo affineremo nella fase successiva.
    allEvents = sorted;

    joinedEvents = sorted.filter((ev) => {
      const joinedBy = ev?.joinedBy || ev?.participants || [];
      if (!Array.isArray(joinedBy)) return false;
      return joinedBy.map(String).includes(String(myUserId));
    });

    myEvents = sorted.filter((ev) => {
      const owner = ev?.owner || ev?.creator || ev?.userId;
      return owner && String(owner) === String(myUserId);
    });

    renderHomeLists();
    setupScrollRails();
  } catch (err) {
    console.error("Errore loadEvents HOME:", err);
    showAlert("Errore nel caricamento eventi.", "error");
  }
}

// -----------------------------
// Notifiche / badge rooms (minimo comune, resta qui per ora)
// -----------------------------
async function updateRoomsBadge() {
  if (!token) return;
  const badge = document.getElementById("messagesBadge");
  if (!badge) return;

  try {
    const unread = await getRoomsUnreadCount(token);
    const n = Number(unread?.count ?? unread ?? 0) || 0;
    if (n > 0) {
      showEl(badge);
      badge.textContent = String(n);
    } else {
      hideEl(badge);
      badge.textContent = "0";
    }
  } catch (e) {
    // non bloccare
  }
}

// -----------------------------
// DOM Ready (HOME)
// -----------------------------
document.addEventListener("DOMContentLoaded", async () => {
  token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  // Guard: questo file deve girare solo sulla HOME
  const isHomePage = !!document.getElementById("allEventsList");
  if (!isHomePage) return;

  // In HOME ci serve sapere “me”
  try {
    const me = await apiGet("/users/me", token);
    myUserId = me?._id || me?.id || me?.user?._id || me?.user?.id || null;
    myRegion = (me?.region || me?.user?.region || "") || "";
    myCountry = (me?.country || me?.user?.country || "") || "";

    const name =
      me?.nickname ||
      me?.user?.nickname ||
      me?.name ||
      me?.user?.name ||
      me?.email ||
      me?.user?.email ||
      "Utente";

    const statusRaw = (me?.status || me?.user?.status || "").toString().toLowerCase();
    const statusLabel = statusRaw ? (statusRaw[0].toUpperCase() + statusRaw.slice(1)) : "Partecipante";

    // topbar v2
    const topName = document.getElementById("gwUserName");
    if (topName) topName.textContent = name;

    const topStatus = document.getElementById("gwUserStatus");
    if (topStatus) topStatus.textContent = statusLabel || "Partecipante";

    // following ids
    const rawFollowing = me?.following || me?.user?.following || [];
    if (Array.isArray(rawFollowing)) {
      followingIds = new Set(
        rawFollowing
          .map((u) => (u && (u._id || u.id || u)) || null)
          .filter(Boolean)
          .map(String)
      );
    }

    // private IDs key
    if (myUserId) {
      PRIVATE_LS_KEY = `gogo_private_event_ids_${myUserId}`;
      loadPrivateIds();
      updatePrivateCount();
    }
  } catch (e) {
    // non bloccare
  }

  // menu hamburger (se presente nella HOME)
  const btnHamburger = document.getElementById("btnHamburger");
  const gwMenu = document.getElementById("gwMenu");
  const btnPrivateEventsMenu = document.getElementById("btnPrivateEvents");
  const btnGuide = document.getElementById("btnGuide");
  const btnSwitchRole = document.getElementById("btnSwitchRole");
  const btnLogout = document.getElementById("btnLogout");

  const closeGwMenu = () => {
    hideEl(gwMenu);
  };

  if (btnHamburger && gwMenu) {
    btnHamburger.addEventListener("click", () => {
      toggleHidden(gwMenu);
    });

    document.addEventListener("click", (e) => {
      if (!gwMenu.contains(e.target) && e.target !== btnHamburger) closeGwMenu();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeGwMenu();
    });
  }

  // menu: eventi privati (toggle sezione legacy)
  if (btnPrivateEventsMenu) {
    btnPrivateEventsMenu.addEventListener("click", async (e) => {
      e.preventDefault();
      closeGwMenu();

      const legacy = document.querySelector("section.legacy");
      if (legacy) {
        toggleHidden(legacy);
        legacy.scrollIntoView({ behavior: "smooth", block: "start" });
        await refreshPrivateEvents();
      } else {
        alert("Sezione Eventi privati non trovata (legacy).");
      }
    });
  }

  if (btnGuide) {
    btnGuide.addEventListener("click", (e) => {
      e.preventDefault();
      closeGwMenu();
      alert("Guida partecipante (placeholder).");
    });
  }

  if (btnSwitchRole) {
    btnSwitchRole.addEventListener("click", (e) => {
      e.preventDefault();
      closeGwMenu();
      sessionStorage.setItem("desiredRole", "organizer");
      window.location.href = "organizzatore.html";
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", (e) => {
      e.preventDefault();
      closeGwMenu();
      localStorage.removeItem("token");
      window.location.href = "login.html";
    });
  }

  // bootstrap HOME
  await maybeShowProfileNag(token);
  await loadEvents();
  await refreshPrivateEvents();
  await updateRoomsBadge();
});
