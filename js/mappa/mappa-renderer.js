export function createMappaRenderer() {
  function renderSelectedEventCard(event) {
    if (!event) return "";

    return `
      <div class="mappa-event-card">
        <div class="mappa-event-top">
          <h3 class="mappa-event-title">${escapeHtml(event.title || "")}</h3>
          ${renderStatusBadge(event.status)}
        </div>

        <div class="mappa-event-meta">
          <span>${escapeHtml(formatLocation(event))}</span>
          <span>${escapeHtml(formatDate(event.startAt))}</span>
        </div>

        <div class="mappa-event-tags">
          ${renderTags(event)}
        </div>

        <div class="mappa-event-price">
          ${escapeHtml(formatPrice(event.price))}
        </div>

        <div class="mappa-event-actions">
          <button
            type="button"
            class="gw-icon-btn"
            data-action="open-full-chat"
            aria-label="Apri chat completa evento"
            title="Chat completa"
          >
            <span aria-hidden="true">💬</span>
          </button>

          <button
            type="button"
            class="gw-icon-btn"
            data-action="open-full-detail"
            aria-label="Vai all’evento"
            title="Vai all’evento"
          >
            <span aria-hidden="true">→</span>
          </button>

          <button
            type="button"
            class="gw-icon-btn"
            data-action="close-detail"
            aria-label="Chiudi dettaglio evento"
            title="Chiudi"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
    `;
  }

  function renderChatIdle() {
    return `
      <div class="mappa-chat-notice">
        Seleziona un evento dalla mappa per attivare la chat.
      </div>
    `;
  }

  function renderChatLoading(title = "") {
    return `
      <div class="mappa-chat-notice">
        Caricamento chat${title ? ` per &ldquo;${escapeHtml(title)}&rdquo;` : ""}...
      </div>
    `;
  }

  function renderChatLocked(title = "") {
    return `
      <div class="mappa-chat-notice">
        ${title ? `La chat di &ldquo;${escapeHtml(title)}&rdquo; ` : "La chat "}
        non è disponibile.
      </div>
    `;
  }

  function renderChatError(message = "Si è verificato un errore.") {
    return `
      <div class="mappa-chat-notice">
        ${escapeHtml(message)}
      </div>
    `;
  }

  function renderChatHeader(title = "") {
    return title ? `Chat • ${title}` : "Chat evento";
  }

  function renderChatMessages(messages = [], currentUserId = null) {
    if (!Array.isArray(messages) || messages.length === 0) {
      return `
        <div class="mappa-chat-notice">
          Nessun messaggio per questo evento.
        </div>
      `;
    }

    return messages
      .filter(Boolean)
      .map((msg) => {
        const isMine = currentUserId && msg.userId === currentUserId;

        return `
          <div class="mappa-msg ${isMine ? "mappa-msg--me" : ""}">
            <div class="mappa-msg-text">${escapeHtml(msg.text || "")}</div>
            <div class="mappa-msg-time">${escapeHtml(formatTime(msg.createdAt))}</div>
          </div>
        `;
      })
      .join("");
  }

  function renderStatusBadge(status) {
    const safeStatus = normalizeStatus(status);
    if (!safeStatus) return "";

    return `
      <span class="mappa-status-badge mappa-status-badge--${safeStatus}">
        ${escapeHtml(formatStatusLabel(safeStatus))}
      </span>
    `;
  }

  function renderTags(event) {
    const tags = [
      event?.category,
      event?.subcategory,
      event?.language,
      event?.target
    ].filter(Boolean);

    if (!tags.length) return "";

    return tags
      .map((tag) => `<span>${escapeHtml(String(tag))}</span>`)
      .join("");
  }

  function formatLocation(event) {
    const parts = [event?.city, event?.region].filter(Boolean);
    return parts.length ? `📍 ${parts.join(", ")}` : "📍 Località non disponibile";
  }

  function formatDate(value) {
    if (!value) return "🗓 Data non disponibile";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "🗓 Data non disponibile";

    return `🗓 ${date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    })}`;
  }

  function formatTime(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatPrice(price) {
    if (price === null || price === undefined || price === "") {
      return "Gratis";
    }

    if (typeof price === "number") {
      return price === 0 ? "Gratis" : `€${price}`;
    }

    const raw = String(price).trim();
    if (!raw) return "Gratis";

    return raw;
  }

  function normalizeStatus(status) {
    switch (status) {
      case "ongoing":
      case "imminent":
      case "future":
        return status;
      default:
        return "";
    }
  }

  function formatStatusLabel(status) {
    switch (status) {
      case "ongoing":
        return "In corso";
      case "imminent":
        return "Imminente";
      case "future":
        return "In arrivo";
      default:
        return "";
    }
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  return {
    renderSelectedEventCard,
    renderChatIdle,
    renderChatLoading,
    renderChatLocked,
    renderChatError,
    renderChatHeader,
    renderChatMessages,
    renderStatusBadge
  };
}
