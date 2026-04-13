function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function resolveAuthorName(msg) {
  if (msg?.sender === "me") {
    return "Tu";
  }

  return (
    msg?.author?.name ||
    msg?.author?.nickname ||
    msg?.author?.username ||
    msg?.senderName ||
    msg?.sender?.username ||
    msg?.sender?.name ||
    msg?.user?.username ||
    msg?.user?.name ||
    "Partecipante"
  );
}

function resolveAuthorId(msg) {
  return (
    msg?.senderId ||
    msg?.sender?._id ||
    msg?.sender?.id ||
    msg?.user?._id ||
    msg?.user?.id ||
    ""
  );
}

function resolveMessageText(msg) {
  return msg?.text || msg?.message || "";
}

function buildCurrentRoomReturnTo() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function renderMessages(state) {
  const container = document.getElementById("roomsMessages");
  if (!container) return;

  container.innerHTML = "";

  if (!Array.isArray(state.messages) || !state.messages.length) {
    container.innerHTML = `<div class="rooms-empty">Nessun messaggio</div>`;
    return;
  }

  state.messages.forEach((msg) => {
    const div = document.createElement("div");
    div.className = "rooms-message";

    const authorName = resolveAuthorName(msg);
    const authorId = resolveAuthorId(msg);
    const text = resolveMessageText(msg);

    div.innerHTML = `
      <span
        class="rooms-message-author"
        ${authorId ? `data-user-id="${escapeHtml(authorId)}"` : ""}
        ${authorId ? `title="Apri profilo"` : ""}
      >
        ${escapeHtml(authorName)}
      </span>
      <div class="rooms-message-bubble">${escapeHtml(text)}</div>
    `;

    container.appendChild(div);
  });

  container.scrollTop = container.scrollHeight;
}

export function updateHeader(state) {
  const title = document.getElementById("roomsTitle");
  if (!title) return;

  if (state?.roomMeta?.title) {
    title.textContent = state.roomMeta.title;
    return;
  }

  if (state?.eventId) {
    title.textContent = "Chat Evento";
  }
}

export function getAuthorProfileUrl(userId) {
  if (!userId) return "";
  const returnTo = encodeURIComponent(buildCurrentRoomReturnTo());
  return `/pages/user-public.html?userId=${encodeURIComponent(userId)}&returnTo=${returnTo}`;
}

