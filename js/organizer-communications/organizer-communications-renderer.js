function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return "Data non disponibile";
  }

  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderKpi(label, value, hint) {
  return `
    <article class="org-communications-kpi">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(hint)}</small>
    </article>
  `;
}

function getNotificationTitle(notification) {
  return (
    notification?.title ||
    notification?.message ||
    notification?.type ||
    "Notifica"
  );
}

function getRoomTitle(room) {
  return (
    room?.event?.title ||
    room?.title ||
    room?.peer?.name ||
    room?.peer?.nickname ||
    "Conversazione"
  );
}

function renderNotificationRow(notification) {
  return `
    <article class="org-communications-row">
      <strong>${escapeHtml(getNotificationTitle(notification))}</strong>
      <span>${escapeHtml(notification?.message || "Notifica recente")}</span>
      <small>${escapeHtml(formatDate(notification?.createdAt))}</small>
    </article>
  `;
}

function renderRoomRow(room) {
  const unread = Number(room?.unread || 0);

  return `
    <article class="org-communications-row">
      <strong>${escapeHtml(getRoomTitle(room))}</strong>
      <span>${unread > 0 ? `${escapeHtml(unread)} messaggi non letti` : "Nessun messaggio non letto"}</span>
      <small>${escapeHtml(formatDate(room?.lastAt || room?.updatedAt))}</small>
    </article>
  `;
}

function renderEmpty(message) {
  return `<div class="org-communications-empty">${escapeHtml(message)}</div>`;
}

export function renderOrganizerCommunications(state) {
  const loading = document.querySelector("[data-org-communications-loading]");
  const error = document.querySelector("[data-org-communications-error]");
  const content = document.querySelector("[data-org-communications-content]");

  if (!loading || !error || !content) return;

  loading.hidden = !state.loading;
  error.hidden = !state.error;
  content.hidden = state.loading || Boolean(state.error);

  if (state.error) {
    error.textContent = state.error;
    return;
  }

  const summary = state.summary || {};

  content.innerHTML = `
    <section class="org-communications-kpis" aria-label="Riepilogo comunicazioni">
      ${renderKpi("Totale non letti", summary.totalUnread || 0, "Messaggi e notifiche")}
      ${renderKpi("Notifiche", summary.notificationsUnread || 0, "Notifiche non lette")}
      ${renderKpi("Chat evento", summary.roomsUnread || 0, "Room evento con nuovi messaggi")}
      ${renderKpi("Messaggi", summary.dmUnread || 0, "DM non letti")}
    </section>

    <section class="org-communications-grid">
      <section class="org-communications-card">
        <div class="org-communications-card__head">
          <h2>Notifiche recenti</h2>
          <button type="button" data-org-communications-open-notifications>
            Apri notifiche
          </button>
        </div>

        <div class="org-communications-list">
          ${
            summary.recentNotifications?.length
              ? summary.recentNotifications.map(renderNotificationRow).join("")
              : renderEmpty("Nessuna notifica recente.")
          }
        </div>
      </section>

      <section class="org-communications-card">
        <div class="org-communications-card__head">
          <h2>Conversazioni recenti</h2>
          <a href="/pages/messages-v2.html?rootReturnTo=organizer">Apri messaggi</a>
        </div>

        <div class="org-communications-list">
          ${
            summary.recentRooms?.length
              ? summary.recentRooms.map(renderRoomRow).join("")
              : renderEmpty("Nessuna conversazione recente.")
          }
        </div>
      </section>
    </section>

    <section class="org-communications-card">
      <div class="org-communications-card__head">
        <h2>Azioni future</h2>
      </div>

      <div class="org-communications-future">
        <span>Comunicazioni evento mirate</span>
        <span>Storico trilli e richiami live</span>
        <span>Alert promozioni e moderazione</span>
      </div>
    </section>
  `;
    }
