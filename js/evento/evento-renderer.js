function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveAuthorName(msg) {
  return (
    msg?.author?.name ||
    msg?.author?.nickname ||
    msg?.senderName ||
    msg?.sender?.username ||
    msg?.sender?.name ||
    msg?.user?.username ||
    msg?.user?.name ||
    "Utente"
  );
}

function resolveAuthorId(msg) {
  return (
    msg?.author?._id ||
    msg?.author?.id ||
    msg?.senderId ||
    msg?.sender?._id ||
    msg?.sender?.id ||
    msg?.user?._id ||
    msg?.user?.id ||
    ""
  );
}

function resolveMessageText(msg) {
  return String(msg?.text || msg?.message || "").trim();
}

function buildCurrentRoomReturnTo() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function getRefs() {
  return {
    title: document.getElementById("roomsTitle"),
    subtitle: document.getElementById("roomsSubtitle"),
    status: document.getElementById("roomsStatus"),
    messages: document.getElementById("roomsMessages"),
    composer: document.getElementById("roomsComposer"),
    input: document.getElementById("roomsInput"),
    submit: document.getElementById("roomsSubmitBtn"),
  };
}

function renderStatus(refs, state) {
  if (!refs.status) return;

  if (state.error) {
    refs.status.hidden = false;
    refs.status.className = "rooms-status rooms-status--error";
    refs.status.textContent = state.error;
    return;
  }

  if (state.locked) {
    refs.status.hidden = false;
    refs.status.className = "rooms-status rooms-status--info";
    refs.status.textContent =
      "La chat di questo evento privato si sblocca quando hai accesso effettivo all’evento.";
    return;
  }

  if (state.infoMessage) {
    refs.status.hidden = false;
    refs.status.className = "rooms-status rooms-status--info";
    refs.status.textContent = state.infoMessage;
    return;
  }

  refs.status.hidden = true;
  refs.status.className = "rooms-status";
  refs.status.textContent = "";
}

function renderHeader(refs, state) {
  if (refs.title) {
    refs.title.textContent =
      String(state?.roomMeta?.title || "").trim() || "Chat Evento";
  }

  if (refs.subtitle) {
    if (state.locked) {
      refs.subtitle.textContent = "Conversazione non ancora disponibile";
      return;
    }

    if (state.canSend) {
      refs.subtitle.textContent = "Conversazione dell’evento";
      return;
    }

    refs.subtitle.textContent = "Conversazione in sola lettura";
  }
}

function renderMessages(refs, state) {
  if (!refs.messages) return;

  refs.messages.innerHTML = "";

  if (state.isLoading || state.isMessagesLoading || state.isOpeningRoom) {
    refs.messages.innerHTML = `<div class="rooms-empty">Caricamento conversazione…</div>`;
    return;
  }

  if (state.locked) {
    refs.messages.innerHTML = `<div class="rooms-empty">La room non è accessibile da questo profilo in questo momento.</div>`;
    return;
  }

  if (!Array.isArray(state.messages) || !state.messages.length) {
    refs.messages.innerHTML = `<div class="rooms-empty">Nessun messaggio per ora.</div>`;
    return;
  }

  state.messages.forEach((msg) => {
    const item = document.createElement("article");
    item.className = "rooms-message";

    const authorName = resolveAuthorName(msg);
    const authorId = resolveAuthorId(msg);
    const text = resolveMessageText(msg);

    item.innerHTML = `
      <span
        class="rooms-message-author"
        ${authorId ? `data-user-id="${escapeHtml(authorId)}"` : ""}
        ${authorId ? `title="Apri profilo"` : ""}
      >
        ${escapeHtml(authorName)}
      </span>
      <div class="rooms-message-bubble">${escapeHtml(text)}</div>
    `;

    refs.messages.appendChild(item);
  });

  refs.messages.scrollTop = refs.messages.scrollHeight;
}

function renderComposer(refs, state) {
  const disabled =
    state.isLoading ||
    state.isOpeningRoom ||
    state.isMessagesLoading ||
    state.isSending ||
    state.locked ||
    !state.roomId ||
    !state.canSend;

  if (refs.composer) {
    refs.composer.setAttribute("aria-busy", state.isSending ? "true" : "false");
  }

  if (refs.input) {
    refs.input.disabled = disabled;
    refs.input.placeholder = state.locked
      ? "Chat non disponibile"
      : !state.canSend
        ? "Invio messaggi non disponibile"
        : "Scrivi un messaggio...";
  }

  if (refs.submit) {
    refs.submit.disabled = disabled;
    refs.submit.textContent = state.isSending ? "Invio…" : "Invia";
  }
}

export function renderRoomsPage(state) {
  const refs = getRefs();
  renderHeader(refs, state);
  renderStatus(refs, state);
  renderMessages(refs, state);
  renderComposer(refs, state);
}

export function getAuthorProfileUrl(userId) {
  if (!userId) return "";
  const returnTo = encodeURIComponent(buildCurrentRoomReturnTo());
  return `/pages/user-public.html?userId=${encodeURIComponent(userId)}&returnTo=${returnTo}`;
      }
