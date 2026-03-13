// frontend/js/partecipante-seguiti-eventi-v2.js
// Following V2 - Step 1
// Base pulita: un blocco verticale per organizer, un evento per organizer, no carousel, no banner

import { apiGet, apiPost } from "./api.js";
import { renderEventCard, applyHomeCardThumbs } from "./home-cards.js";
import { showAlert } from "./participant-shared.js";

// Memorizzo id utente loggato per capire se un evento è già joined
let ME_ID = null;
let FOLLOWING_TOKEN = null;

/* =========================
   ANCHOR: FOLLOWING_V2_TOPBAR
   ========================= */
async function hydrateTopbar(token) {
  try {
    const me = await apiGet("/users/me", token);

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
    // non blocchiamo la pagina se /users/me fallisce
  }
}

/* =========================
   ANCHOR: FOLLOWING_V2_UTILS
   ========================= */
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// timestamp inizio robusto
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

// countdown solo per status imminent
function formatCountdown(ev) {
  if (String(ev?.status || "").toLowerCase() !== "imminent") return "";
  const startMs = getEventStartMs(ev);
  if (!Number.isFinite(startMs)) return "";

  const now = Date.now();
  let diff = startMs - now;
  if (diff <= 0) return "";

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

// stesso ordinamento della pagina reale
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

function isJoined(ev) {
  if (typeof ev?.joined === "boolean") return ev.joined;

  const parts = ev?.participants;
  if (!ME_ID || !Array.isArray(parts)) return false;

  return parts.some((p) => String(p?._id || p) === String(ME_ID));
}

function renderFollowingCardV2(ev, joined = false) {
  const countdown = formatCountdown(ev);
  const badgeHtml = countdown
    ? `<div class="gw-countdown-badge gw-countdown-badge--following">⏳ ${countdown}</div>`
    : "";

  const base = renderEventCard(ev, false, { detailsVariant: "info" });

  const cta = joined
    ? `<div class="gw-following-cta gw-following-cta--joined">✅ Partecipo</div>`
    : `<button class="btn gw-following-cta gw-following-cta--join"
         type="button"
         data-action="join"
         data-id="${escapeHtml(ev?._id || "")}">Partecipa</button>`;

  return `
    <div class="gw-following-v2-cardbox">
      ${badgeHtml}
      ${base}
      ${cta}
    </div>
  `;
}
/* =========================
   ANCHOR: FOLLOWING_V2_VIEWPORT_METRICS
   ========================= */
function syncFollowingV2Metrics() {
  const head = document.querySelector(".gw-following-v2-pagehead");
  if (!head) return;

  const h = Math.ceil(head.getBoundingClientRect().height);
  document.documentElement.style.setProperty(
    "--gw-following-v2-pagehead-h",
    `${h}px`
  );
}
/* =========================
   ANCHOR: FOLLOWING_V2_RAIL
   ========================= */
function renderFollowingRailV2(list) {
  const arr = Array.isArray(list) ? list : [];
  if (!arr.length) return "";

  return `
    <div class="gw-following-v2-rail">
      ${arr
        .map((ev) => {
          const joined = isJoined(ev);
          return `
            <div class="gw-following-v2-railitem">
              ${renderFollowingCardV2(ev, joined)}
            </div>
          `;
        })
        .join("")}
    </div>
    ${arr.length > 1 ? `<div class="gw-following-v2-railhint">Scorri in orizzontale per vedere gli altri eventi</div>` : ``}
  `;
}
/* =========================
   ANCHOR: FOLLOWING_V2_RENDER
   ========================= */
function renderFollowingBlocksV2(events) {
  const container = document.getElementById("followingEventsContainerV2");
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

  const sortedGroups = Array.from(groups.values()).sort((a, b) =>
    a.orgName.localeCompare(b.orgName)
  );

  const html = sortedGroups
    .map((g) => {
      const list = [...g.events].sort(sortByStatusAndStart);
      const count = list.length;

      return `
        <section class="gw-following-v2-block" data-org-id="${escapeHtml(g.orgId)}">
          <div class="gw-following-v2-orghead">
            <h2 class="gw-block-title">
              ${escapeHtml(g.orgName)}
              <span class="gw-following-v2-count">(${count})</span>
            </h2>
          </div>

          <div class="gw-following-v2-body">
            <div class="gw-following-v2-card">
              ${renderFollowingRailV2(list)}
            </div>
          </div>
        </section>
      `;
    })
    .join("");

container.innerHTML = html;
  syncFollowingV2Metrics();

  try {
    applyHomeCardThumbs(container);
  } catch {}
}

/* =========================
   ANCHOR: FOLLOWING_V2_ACTIONS
   ========================= */
function initActionsDelegation(token) {
  const root = document.getElementById("followingEventsContainerV2");
  if (!root) return;

  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    if (!action || !id) return;

    if (action === "details") {
      sessionStorage.setItem("selectedEventId", id);
      sessionStorage.setItem("fromView", "following-v2");
      sessionStorage.setItem("returnTo", "partecipante-seguiti-eventi-v2.html");
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
          showAlert(res?.message || res?.error || "Errore iscrizione", "error", {
            autoHideMs: 4000,
          });
          return;
        }

        showAlert("Iscrizione effettuata", "success", { autoHideMs: 2200 });

        const data = await apiGet("/events/following/list", token);
        const events = data?.events || data?.data?.events || [];
        renderFollowingBlocksV2(events);
      } catch (err) {
        showAlert(err?.message || "Errore iscrizione", "error", {
          autoHideMs: 4000,
        });
      } finally {
        btn.dataset.loading = "";
        btn.disabled = false;
      }
    }
  });
}

/* =========================
   ANCHOR: FOLLOWING_V2_BOOT
   ========================= */
document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  FOLLOWING_TOKEN = token;
  syncFollowingV2Metrics();
  window.addEventListener("resize", syncFollowingV2Metrics);
  if (!token) {
    window.location.href = "index.html";
    return;
  }

  await hydrateTopbar(token);
  initActionsDelegation(token);

  const container = document.getElementById("followingEventsContainerV2");
  if (container) {
    container.innerHTML = `
      <div class="gw-state gw-state--loading">
        Caricamento...
      </div>
    `;
  }

  try {
    const res = await apiGet("/events/following/list", token);
    const events = res?.events || res?.data?.events || [];

    if (!Array.isArray(events)) {
      throw new Error("Formato eventi non valido");
    }

    renderFollowingBlocksV2(events);
  } catch (err) {
    showAlert(err?.message || "Errore nel caricamento eventi seguiti", "error", {
      autoHideMs: 4000,
    });

    const box = document.getElementById("followingEventsContainerV2");
    if (box) {
      box.innerHTML = `
        <div class="gw-state gw-state--error">
          <strong>Errore</strong>
          ${escapeHtml(err?.message || "Errore nel caricamento eventi seguiti")}
        </div>
      `;
    }
  }
});
