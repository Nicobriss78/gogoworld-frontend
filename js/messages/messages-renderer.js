function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatRelativeMeta(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getEventStatusLabel(status) {
  switch (status) {
    case "closing":
      return "In chiusura";
    case "closed":
      return "Chiusa";
    case "active":
    default:
      return "Attiva";
  }
}

function createInitialsPlaceholder(label = "") {
  const safe = String(label || "").trim();
  const initials = safe
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "GW";
}

export function getMessagesDom() {
  return {
    tabEvents: document.getElementById("messagesTabEvents"),
    tabDm: document.getElementById("messagesTabDm"),

    listView: document.getElementById("messagesListView"),
    listTitle: document.getElementById("messagesListTitle"),
    listSubtitle: document.getElementById("messagesListSubtitle"),
    listState: document.getElementById("messagesListState"),
    list: document.getElementById("messagesList"),

    threadView: document.getElementById("messagesThreadView"),
    threadKicker: document.getElementById("messagesThreadKicker"),
    threadTitle: document.getElementById("messagesThreadTitle"),
    threadMeta: document.getElementById("messagesThreadMeta"),
    threadActionSlot: document.getElementById("messagesThreadActionSlot"),
    threadNotice: document.getElementById("messagesThreadNotice"),
    threadMessages: document.getElementById("messagesThreadMessages"),

    composer: document.getElementById("messagesComposer"),
    composerInput: document.getElementById("messagesComposerInput"),
    composerSend: document.getElementById("messagesComposerSend"),
  };
}

export function renderMessagesTabState(activeTab) {
  const dom = getMessagesDom();
  const isEvents = activeTab !== "dm";

  if (dom.tabEvents) {
    dom.tabEvents.classList.toggle("is-active", isEvents);
    dom.tabEvents.setAttribute("aria-selected", isEvents ? "true" : "false");
  }

  if (dom.tabDm) {
    dom.tabDm.classList.toggle("is-active", !isEvents);
    dom.tabDm.setAttribute("aria-selected", !isEvents ? "true" : "false");
  }
}

export function renderMessagesViewMode(viewMode) {
  const dom = getMessagesDom();
  const isThread = viewMode === "thread";

  if (dom.listView) {
    dom.listView.hidden = isThread;
  }

  if (dom.threadView) {
    dom.threadView.hidden = !isThread;
  }
}

export function renderMessagesListHeader({ activeTab }) {
  const dom = getMessagesDom();
  const isDm = activeTab === "dm";

  if (dom.listTitle) {
    dom.listTitle.textContent = isDm ? "Messaggi" : "Chat Eventi";
  }

  if (dom.listSubtitle) {
    dom.listSubtitle.textContent = isDm
      ? "Le conversazioni private avviate con gli altri utenti."
      : "Le conversazioni evento attive, in chiusura o archiviate.";
  }
}

export function renderMessagesListState(message, type = "info") {
  const dom = getMessagesDom();
  if (!dom.listState) return;

  dom.listState.hidden = false;
  dom.listState.textContent = String(message || "");

  dom.listState.classList.remove(
    "messages-state--info",
    "messages-state--error",
    "messages-state--empty"
  );
  dom.listState.classList.add(`messages-state--${type}`);
}

export function clearMessagesListState() {
  const dom = getMessagesDom();
  if (!dom.listState) return;

  dom.listState.hidden = true;
  dom.listState.textContent = "";
  dom.listState.classList.remove(
    "messages-state--info",
    "messages-state--error",
    "messages-state--empty"
  );
}

export function clearMessagesList() {
  const dom = getMessagesDom();
  if (dom.list) {
    dom.list.innerHTML = "";
  }
}

function renderListItemMedia({ imageUrl, title }) {
  if (imageUrl) {
    return `
      <img
        class="messages-list-item__avatar"
        src="${escapeHtml(imageUrl)}"
        alt=""
        loading="lazy"
      />
    `;
  }

  return `
    <div class="messages-list-item__avatar" aria-hidden="true">
      ${escapeHtml(createInitialsPlaceholder(title))}
    </div>
  `;
}

function renderUnreadBadge(unread) {
  const safeUnread = Number(unread || 0);
  if (safeUnread <= 0) return "";
  return `<span class="messages-list-item__badge">${safeUnread}</span>`;
}

export function renderEventThreadsList(threads = []) {
  const dom = getMessagesDom();
  if (!dom.list) return;

  const safeThreads = Array.isArray(threads) ? threads : [];

  dom.list.innerHTML = safeThreads
    .map((thread) => {
      const title = thread.title || "Chat evento";
      const statusLabel = getEventStatusLabel(thread.status);
      const preview =
        thread.lastMessageText?.trim() ||
        "Apri la chat per vedere la conversazione.";
      const meta = formatRelativeMeta(thread.lastMessageAt);

      return `
        <button
          type="button"
          class="messages-list-item"
          data-thread-type="event"
          data-event-id="${escapeHtml(thread.eventId || "")}"
          data-room-id="${escapeHtml(thread.roomId || "")}"
        >
          <div class="messages-list-item__media">
            ${renderListItemMedia({ imageUrl: thread.imageUrl, title })}
          </div>

          <div class="messages-list-item__body">
            <div class="messages-list-item__top">
              <h3 class="messages-list-item__title">${escapeHtml(title)}</h3>
              ${meta ? `<span class="messages-list-item__meta">${escapeHtml(meta)}</span>` : ""}
            </div>

            <p class="messages-list-item__preview">${escapeHtml(preview)}</p>
          </div>

          <div class="messages-list-item__side">
            <span class="messages-list-item__status">${escapeHtml(statusLabel)}</span>
            ${renderUnreadBadge(thread.unread)}
          </div>
        </button>
      `;
    })
    .join("");
}

export function renderDmThreadsList(threads = []) {
  const dom = getMessagesDom();
  if (!dom.list) return;

  const safeThreads = Array.isArray(threads) ? threads : [];

  dom.list.innerHTML = safeThreads
    .map((thread) => {
      const title = thread.title || "Conversazione";
      const preview =
        thread.lastMessageText?.trim() ||
        "Apri la conversazione per iniziare a scrivere.";
      const meta = formatRelativeMeta(thread.lastMessageAt);

      return `
        <button
          type="button"
          class="messages-list-item"
          data-thread-type="dm"
          data-user-id="${escapeHtml(thread.userId || "")}"
        >
          <div class="messages-list-item__media">
            ${renderListItemMedia({ imageUrl: thread.avatarUrl, title })}
          </div>

          <div class="messages-list-item__body">
            <div class="messages-list-item__top">
              <h3 class="messages-list-item__title">${escapeHtml(title)}</h3>
              ${meta ? `<span class="messages-list-item__meta">${escapeHtml(meta)}</span>` : ""}
            </div>

            <p class="messages-list-item__preview">${escapeHtml(preview)}</p>
          </div>

          <div class="messages-list-item__side">
            ${renderUnreadBadge(thread.unread)}
          </div>
        </button>
      `;
    })
    .join("");
}

export function renderMessagesThreadNotice(message) {
  const dom = getMessagesDom();
  if (!dom.threadNotice) return;

  dom.threadNotice.hidden = false;
  dom.threadNotice.textContent = String(message || "");
}

export function clearMessagesThreadNotice() {
  const dom = getMessagesDom();
  if (!dom.threadNotice) return;

  dom.threadNotice.hidden = true;
  dom.threadNotice.textContent = "";
}

export function clearMessagesThreadMessages() {
  const dom = getMessagesDom();
  if (dom.threadMessages) {
    dom.threadMessages.innerHTML = "";
  }
}

function renderThreadAction(action) {
  if (!action?.label || !action?.href) return "";
  return `
    <a class="messages-thread-action" href="${escapeHtml(action.href)}">
      ${escapeHtml(action.label)}
    </a>
  `;
}

function renderBubbleAvatar(name, avatarUrl, userId = "") {
  const safeUserId = String(userId || "").trim();

  if (avatarUrl) {
    const imageMarkup = `
      <img
        class="messages-bubble__avatar"
        src="${escapeHtml(avatarUrl)}"
        alt=""
        loading="lazy"
      />
    `;

    if (!safeUserId) {
      return imageMarkup;
    }

    return `
      <a
        class="messages-bubble__avatar-link"
        href="/pages/user-public.html?userId=${encodeURIComponent(safeUserId)}"
        aria-label="Apri il profilo di ${escapeHtml(name || "questo utente")}"
      >
        ${imageMarkup}
      </a>
    `;
  }

  const placeholderMarkup = `
    <div class="messages-bubble__avatar" aria-hidden="true">
      ${escapeHtml(createInitialsPlaceholder(name))}
    </div>
  `;

  if (!safeUserId) {
    return placeholderMarkup;
  }

  return `
    <a
      class="messages-bubble__avatar-link"
      href="/pages/user-public.html?userId=${encodeURIComponent(safeUserId)}"
      aria-label="Apri il profilo di ${escapeHtml(name || "questo utente")}"
    >
      ${placeholderMarkup}
    </a>
  `;
}

function renderEventMessageBubble(message) {
  const isOwn = message.sender === "me";
  const bubbleClass = isOwn
    ? "messages-bubble messages-bubble--own"
    : "messages-bubble messages-bubble--other";

  const userName = isOwn ? "Tu" : message.userName || "Partecipante";
  const createdAt = formatRelativeMeta(message.createdAt);

  return `
    <article class="${bubbleClass}">
      ${!isOwn ? renderBubbleAvatar(userName, message.avatarUrl) : ""}
      <div class="messages-bubble__content">
        ${!isOwn ? `<div class="messages-bubble__name">${escapeHtml(userName)}</div>` : ""}
        <div class="messages-bubble__card">
          <p class="messages-bubble__text">${escapeHtml(message.text || "")}</p>
        </div>
        ${createdAt ? `<div class="messages-bubble__time">${escapeHtml(createdAt)}</div>` : ""}
      </div>
    </article>
  `;
}

function renderDmMessageBubble(message) {
  const isOwn = message.sender === "me";
  const bubbleClass = isOwn
    ? "messages-bubble messages-bubble--own"
    : "messages-bubble messages-bubble--other";

  const createdAt = formatRelativeMeta(message.createdAt);

  return `
    <article class="${bubbleClass}">
      <div class="messages-bubble__content">
        <div class="messages-bubble__card">
          <p class="messages-bubble__text">${escapeHtml(message.text || "")}</p>
        </div>
        ${createdAt ? `<div class="messages-bubble__time">${escapeHtml(createdAt)}</div>` : ""}
      </div>
    </article>
  `;
}

export function setMessagesComposerState({ enabled = true, placeholder = "Scrivi un messaggio..." } = {}) {
  const dom = getMessagesDom();

  if (dom.composerInput) {
    dom.composerInput.disabled = !enabled;
    dom.composerInput.placeholder = placeholder;
  }

  if (dom.composerSend) {
    dom.composerSend.disabled = !enabled;
  }

  if (dom.composer) {
    dom.composer.classList.toggle("is-disabled", !enabled);
  }
}

export function renderEventThread(meta = {}, messages = [], options = {}) {
  const dom = getMessagesDom();
  if (!dom.threadMessages) return;

  const title = meta.title || "Chat evento";
  const statusLabel = getEventStatusLabel(meta.status);
  const actionMarkup = renderThreadAction(options.action);

  if (dom.threadKicker) dom.threadKicker.textContent = "Chat Evento";
  if (dom.threadTitle) dom.threadTitle.textContent = title;
  if (dom.threadMeta) dom.threadMeta.textContent = statusLabel;
  if (dom.threadActionSlot) dom.threadActionSlot.innerHTML = actionMarkup;

  const safeMessages = Array.isArray(messages) ? messages : [];
  if (!safeMessages.length) {
    dom.threadMessages.innerHTML = `
      <div class="messages-state messages-state--empty">
        Nessun messaggio ancora. Inizia tu la conversazione.
      </div>
    `;
    return;
  }

  dom.threadMessages.innerHTML = safeMessages
    .map(renderEventMessageBubble)
    .join("");
}

export function renderDmThread(meta = {}, messages = [], options = {}) {
  const dom = getMessagesDom();
  if (!dom.threadMessages) return;

  const title = meta.title || "Conversazione";
  const actionMarkup = renderThreadAction(options.action);

  if (dom.threadKicker) dom.threadKicker.textContent = "Messaggio privato";
  if (dom.threadTitle) dom.threadTitle.textContent = title;
  if (dom.threadMeta) dom.threadMeta.textContent = meta.subtitle || "";
  if (dom.threadActionSlot) dom.threadActionSlot.innerHTML = actionMarkup;

  const safeMessages = Array.isArray(messages) ? messages : [];
  if (!safeMessages.length) {
    dom.threadMessages.innerHTML = `
      <div class="messages-state messages-state--empty">
        Nessun messaggio ancora. Inizia tu la conversazione.
      </div>
    `;
    return;
  }

  dom.threadMessages.innerHTML = safeMessages
    .map(renderDmMessageBubble)
    .join("");
}

export function renderMessagesEmptyState(message) {
  renderMessagesListState(message, "empty");
}

export function renderMessagesErrorState(message) {
  renderMessagesListState(message, "error");
    }
