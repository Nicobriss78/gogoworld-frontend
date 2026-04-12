export function renderRoomsList(state) {
  const list = document.getElementById("roomsList");
  list.innerHTML = "";

  if (!state.rooms.length) {
    list.innerHTML = `<li class="rooms-empty">Nessuna stanza disponibile</li>`;
    return;
  }

  state.rooms.forEach(room => {
    const li = document.createElement("li");
    li.className = "rooms-list-item";
    li.dataset.roomId = room._id;

    const unread = state.unreadSummary.find(
      u => u._id === room._id
    )?.unread || 0;

    li.innerHTML = `
      <span class="rooms-room-title">
        ${room.title || "Stanza evento"}
      </span>
      ${unread > 0 ? `<span class="rooms-unread">${unread}</span>` : ""}
    `;

    if (room._id === state.roomId) {
      li.classList.add("active");
    }

    list.appendChild(li);
  });
}

export function renderMessages(state) {
  const container = document.getElementById("roomsMessages");
  container.innerHTML = "";

  state.messages.forEach(msg => {
    const div = document.createElement("div");
    div.className = "rooms-message";
    div.textContent = `${msg.senderName}: ${msg.text}`;
    container.appendChild(div);
  });

  container.scrollTop = container.scrollHeight;
}

export function updateHeader(state) {
  const eventLink = document.getElementById("roomsEventLink");
  if (state.eventId) {
    eventLink.href = `/pages/evento-v2.html?id=${encodeURIComponent(
      state.eventId
    )}&returnTo=${encodeURIComponent(
      window.location.pathname + window.location.search
    )}`;
  }
}
