// frontend/js/partecipante-seguiti-eventi.js
// Controller dedicato alla scheda "Eventi seguiti" (UI v2)
// - Usa endpoint BE: GET /events/following/list (già filtrato no-past + organizer popolato)
// - Render: blocchi verticali (uno per organizer) con carousel orizzontale
// - CTA: ℹ️ sempre + "Partecipa" solo se non partecipo
// - Chicca: countdown (giorni/ore) sugli "imminent" (72h in BE)

import { apiGet, apiPost } from "./api.js";
import { renderEventCard } from "./home-cards.js";
import { showAlert } from "./participant-shared.js";

import {
  injectBannerSlots,
  renderBannerSlotHTML,
  activateHomeBannerSlots,
} from "./home-banners.js";

// Memorizzo l'id dell'utente loggato (serve per capire se "Partecipo" su un evento)
let ME_ID = null;
let FOLLOWING_TOKEN = null;

/* =========================
   ANCHOR: FOLLOWING_TOPBAR
   ========================= */
async function hydrateTopbar(token) {
  try {
    const me = await apiGet("/users/me", token);
     // id utente loggato (formati possibili: root o me.user)
    ME_ID = me?._id || me?.user?._id || me?.id || me?.user?.id || null;
    const name =
      me?.name ||
      me?.user?.name ||
      me?.email ||
      me?.user?.email ||
      "Utente";

    const statusRaw = (me?.status || me?.user?.status || "")
      .toString()
      .toLowerCase();

    const statusLabel = statusRaw
      ? statusRaw[0].toUpperCase() + statusRaw.slice(1)
      : "Partecipante";

    const topName = document.getElementById("gwUserName");
    if (topName) topName.textContent = name;

    const topStatus = document.getElementById("gwUserStatus");
    if (topStatus) topStatus.textContent = statusLabel || "Partecipante";
  } catch {
    // non blocchiamo pagina se /users/me fallisce
  }
}

/* =========================
   ANCHOR: FOLLOWING_MENU_MIN
   ========================= */
function initHamburgerMenu() {
  const btnHamburger = document.getElementById("btnHamburger");
  const gwMenu = document.getElementById("gwMenu");
  const btnLogout = document.getElementById("btnLogout");
  const btnSwitchRole = document.getElementById("btnSwitchRole");
  const btnGuide = document.getElementById("btnGuide");
  const btnPrivateEventsMenu = document.getElementById("btnPrivateEvents");

  const closeGwMenu = () => {
    if (gwMenu) gwMenu.style.display = "none";
  };

  if (btnHamburger && gwMenu) {
    btnHamburger.addEventListener("click", () => {
      gwMenu.style.display = gwMenu.style.display === "none" ? "block" : "none";
    });

    document.addEventListener("click", (e) => {
      if (!gwMenu.contains(e.target) && e.target !== btnHamburger) closeGwMenu();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeGwMenu();
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

  if (btnPrivateEventsMenu) {
    btnPrivateEventsMenu.addEventListener("click", (e) => {
      e.preventDefault();
      closeGwMenu();
      // per ora rimandiamo alla HOME (privati verranno spacchettati più avanti)
      window.location.href = "partecipante.html";
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
}

/* =========================
   ANCHOR: FOLLOWING_UTILS
   ========================= */

// restituisce timestamp di inizio affidabile (più nomi campo, robusto)
function getEventStartMs(ev) {
  const candidates = [
    ev?.dateStart,
    ev?.startDate,
    ev?.date,
    ev?.startAt,
  ].filter(Boolean);

  for (const c of candidates) {
    const d = new Date(c);
    const t = d.getTime();
    if (!Number.isNaN(t)) return t;
  }
  return Number.POSITIVE_INFINITY;
}

// countdown tipo "2g 3h" (solo per status imminent)
function formatCountdown(ev) {
  if (String(ev?.status || "").toLowerCase() !== "imminent") return "";
  const startMs = getEventStartMs(ev);
  if (!Number.isFinite(startMs)) return "";

  const now = Date.now();
  let diff = startMs - now;
  if (diff <= 0) return ""; // se è già iniziato, non mostriamo countdown

  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;

  const days = Math.floor(diff / dayMs);
  diff = diff % dayMs;
  const hours = Math.floor(diff / hourMs);

  if (days <= 0 && hours <= 0) return "<1h";
  if (days <= 0) return `${hours}h`;
  if (hours <= 0) return `${days}g`;
  return `${days}g ${hours}h`;
}

// ordinamento eventi per status + data (coerente con i tuoi status: ongoing/imminent/future)
function sortByStatusAndStart(a, b) {
  const p = (ev) => {
    const s = String(ev?.status || "").toLowerCase();
    if (s === "ongoing") return 0;
    if (s === "imminent") return 1;
    if (s === "future") return 2;
    if (s === "concluded") return 3;
    return 50;
  };
  const pa = p(a);
  const pb = p(b);
  if (pa !== pb) return pa - pb;
  return getEventStartMs(a) - getEventStartMs(b);
}

// wrapper card con badge countdown + CTA "Partecipa"
function renderFollowingCard(ev, joined = false) {
  const countdown = formatCountdown(ev);
  const badgeHtml = countdown
    ? `<div class="gw-countdown-badge"
          style="position:absolute; top:10px; left:10px; z-index:3; background:rgba(0,0,0,.65); color:#fff; padding:4px 8px; border-radius:10px; font-size:12px;">
          ⏳ ${countdown}
       </div>`
    : "";

  // ℹ️ sempre (detailsVariant default "info")
  const base = renderEventCard(ev, false, { detailsVariant: "info" });

  // CTA: "Partecipa" solo se NON joined
  const cta = joined
    ? `<div style="margin-top:8px; font-size:13px; opacity:.85;">✅ Partecipo</div>`
    : `<button class="btn"
         type="button"
         data-action="join"
         data-id="${ev._id}"
         style="margin-top:8px; width:100%;">Partecipa</button>`;

return `
    <div class="gw-rail gw-following-card-wrap" style="position:relative;">
      ${badgeHtml}
      ${base}
      ${cta}
    </div>
  `;
}

/* =========================
   ANCHOR: FOLLOWING_RENDER
   ========================= */
function renderBannerCard(b) {
 if (!b) return "";

 const id = String(b?.id || b?._id || "");
 const title = (b?.title || b?.name || "Promozione").toString();
 const img = (b?.imageUrl || b?.image || "").toString();
 const type = String(b?.type || "").toUpperCase();

 const kicker =
 type === "SPONSOR" ? "Sponsor" :
 type === "HOUSE" ? "Comunicazione" :
 "Promo";

 // HOME usa click-tracking via BE se id presente; fallback su targetUrl/linkUrl/url
 const clickHref = id
 ? `/api/banners/${encodeURIComponent(id)}/click?redirect=1`
 : (b?.targetUrl || b?.linkUrl || b?.url || "#");

 const bgStyle = img
 ? ` style="background-image:url('${img}'); background-size:cover; background-position:center;"`
 : "";

 return `
 <article class="gw-rail event-card gw-banner-card" data-banner-id="${id}">
 <a class="gw-banner-link" href="${clickHref}" aria-label="${title}">
 <div class="gw-thumb"${bgStyle}></div>
 <div class="content">
 <div class="meta" style="margin-top:0;">
 <span><strong>${kicker}</strong></span>
 </div>
 <h3 class="title">${title}</h3>
 </div>
 </a>
 </article>
 `;
}
function renderFollowingBlocks(events) {
  const container = document.getElementById("followingEventsContainer");
  if (!container) return;

const arr = Array.isArray(events) ? events : [];
  if (!arr.length) {
    container.innerHTML = `
      <div class="gw-state gw-state--empty">
        <strong>Nessun risultato</strong>
        Nessun evento dai tuoi seguiti.
      </div>
    `;
    return;
  }


// joined: se l'evento contiene participants[] e include ME_ID
  // fallback: se "joined" arriva già pronto dal BE, lo usiamo.
  const isJoined = (ev) => {
    if (typeof ev?.joined === "boolean") return ev.joined;

    const parts = ev?.participants;
    if (!ME_ID || !Array.isArray(parts)) return false;

    return parts.some(p => String(p?._id || p) === String(ME_ID));
  };


  // group by organizer
  const groups = new Map();
  for (const ev of arr) {
    const org = ev?.organizer;
    const orgId = String(org?._id || org || "unknown");
    const orgName = (org?.name || "").trim() || "Organizzatore";

    if (!groups.has(orgId)) {
      groups.set(orgId, { orgId, orgName, events: [] });
    }
    groups.get(orgId).events.push(ev);
  }

  // ordina gruppi per nome (stabile) — gli eventi internamente verranno ordinati per status+start
  const sortedGroups = Array.from(groups.values()).sort((a, b) =>
    a.orgName.localeCompare(b.orgName)
  );

  // HTML blocchi
  const html = sortedGroups
    .map((g, idx) => {
      const list = [...g.events].sort(sortByStatusAndStart);
      const count = list.length;

      const railId = `followingRail_${idx}`;
const mixed = injectBannerSlots(list);

const cardsHtml = mixed
  .map((item) => {
    if (item && item.__kind === "banner-slot") {
      // slot banner (poi riempito dall'engine sponsor/tips)
      return renderBannerSlotHTML();
    }
    // normale card evento
    const joined = isJoined(item);
return renderFollowingCard(item, joined);
  })
  .join("");

      return `
        <section class="gw-block" style="margin-top:14px;">
          <div class="gw-block-head">
            <h2 class="gw-block-title">${g.orgName} <span style="opacity:.75;">(${count})</span></h2>
          </div>

<div id="${railId}" class="gw-carousel-wrap">
  <div class="gw-carousel">
    ${cardsHtml}
  </div>
</div>
<div class="gw-scrollrail" data-rail-for="${railId}">
  <div class="gw-scrollthumb"></div>
</div>

        </section>
      `;
    })
    .join("");

container.innerHTML = html;

// Attiva sponsor/tips per ogni carousel (uno per organizer)
const token = FOLLOWING_TOKEN;
if (token) {
  const wraps = Array.from(container.querySelectorAll(".gw-carousel-wrap"));
  wraps.forEach((wrap) => {
    activateHomeBannerSlots({
      container: wrap,
      country: "",
      region: "",
      token,
      renderBannerCard,
    });
  });
}

}

/* =========================
   ANCHOR: FOLLOWING_ACTIONS_DELEGATION
   ========================= */
function initActionsDelegation(token) {
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    if (!action || !id) return;

    // details (ℹ️) è già dentro renderEventCard
    if (action === "details") {
      sessionStorage.setItem("selectedEventId", id);

      // contesto ritorno su questa scheda
      sessionStorage.setItem("fromView", "following");
      sessionStorage.setItem("returnTo", "partecipante-seguiti-eventi.html");
      sessionStorage.setItem("returnEventId", id);

      window.location.href = "evento.html";
      return;
    }

    if (action === "join") {
      if (btn.disabled || btn.dataset.loading === "1") return;

      try {
        btn.dataset.loading = "1";
        btn.disabled = true;

        const res = await apiPost(`/events/${id}/join`, {}, token);
        if (!res.ok) {
          showAlert(res?.message || res?.error || "Errore iscrizione", "error", { autoHideMs: 4000 });
          return;
        }

        showAlert("Iscrizione effettuata", "success", { autoHideMs: 2200 });

        // ricarica lista (così il bottone diventa "✅ Partecipo")
        const data = await apiGet("/events/following/list", token);
        const events = data?.events || data?.data?.events || [];
        renderFollowingBlocks(events);
        return;
      } catch (err) {
        showAlert(err?.message || "Errore iscrizione", "error", { autoHideMs: 4000 });
      } finally {
        btn.dataset.loading = "";
        btn.disabled = false;
      }
    }
  });
}

/* =========================
   ANCHOR: FOLLOWING_BOOT
   ========================= */
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  FOLLOWING_TOKEN = token;

  if (!token) {
    window.location.href = "index.html";
    return;
  }

  await hydrateTopbar(token);
// initHamburgerMenu(); // DISATTIVATO: hamburger gestito da shared-ui.js (evita doppio-binding)
  initActionsDelegation(token);
const followingContainer = document.getElementById("followingEventsContainer");
  if (followingContainer) {
    followingContainer.innerHTML = `
      <div class="gw-state gw-state--loading">
        Caricamento...
      </div>
    `;
  }

  // Load events (seguiti) — BE già filtra i past e popola organizer.name
  try {
    const res = await apiGet("/events/following/list", token);
    const events = res?.events || res?.data?.events || [];
    if (!Array.isArray(events)) {
      throw new Error("Formato eventi non valido");
    }
    renderFollowingBlocks(events);
} catch (err) {
    showAlert(err?.message || "Errore nel caricamento eventi seguiti", "error", { autoHideMs: 4000 });

    const followingContainer = document.getElementById("followingEventsContainer");
    if (followingContainer) {
      followingContainer.innerHTML = `
        <div class="gw-state gw-state--error">
          <strong>Errore</strong>
          ${escapeHtml(err?.message || "Errore nel caricamento eventi seguiti")}
        </div>
      `;
    }
  }

});
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
