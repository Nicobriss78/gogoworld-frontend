export function renderRoomsList(state) {
  const list = document.getElementById("roomsList");
  list.innerHTML = "";

  state.rooms.forEach(room => {
    const li = document.createElement("li");
    li.className = "rooms-list-item";
    li.dataset.roomId = room._id;
    li.textContent = room.title || "Stanza evento";
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
