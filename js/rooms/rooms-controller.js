import {
  openOrJoinEvent,
  getEventRoomMeta,
  listRoomMessages,
  postRoomMessage,
  markRoomRead,
  getMyRooms,
  getUnreadSummary,
} from "./rooms-api.js";

import { createRoomsState } from "./rooms-state.js";
import {
  renderRoomsList,
  renderMessages,
  updateHeader,
} from "./rooms-renderer.js";

const state = createRoomsState();

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    eventId: params.get("eventId"),
    roomId: params.get("roomId"),
    returnTo:
      params.get("returnTo") || "/pages/home-v2.html",
  };
}

function bindBackButton() {
  const backBtn = document.getElementById("roomsBackBtn");
  backBtn.addEventListener("click", () => {
    // Ritorno esplicito all'evento
    if (state.returnTo) {
      window.location.href = state.returnTo;
    } else if (state.eventId) {
      window.location.href = `/pages/evento-v2.html?id=${encodeURIComponent(
        state.eventId
      )}`;
    } else {
      window.location.href = "/pages/home-v2.html";
    }
  });
}
function bindAuthorProfileNavigation() {
  const container = document.getElementById("roomsMessages");

  container.addEventListener("click", (event) => {
    const author = event.target.closest("[data-user-id]");
    if (!author) return;

    const userId = author.dataset.userId;
    if (!userId) return;

    const returnTo = encodeURIComponent(
      window.location.pathname + window.location.search
    );

    window.location.href =
      `/pages/user-public.html?userId=${encodeURIComponent(userId)}&returnTo=${returnTo}`;
  });
}
async function loadRooms() {
  state.rooms = await getMyRooms({ onlyActive: 1 });
  state.unreadSummary = await getUnreadSummary();
  renderRoomsList(state);

  if (!state.roomId && state.rooms.length) {
    state.roomId = state.rooms[0]._id;
  }
}

async function loadMessages(roomId) {
  if (!roomId) return;

  const response = await listRoomMessages(roomId, { limit: 50 });
  state.messages = response?.data || response || [];
  renderMessages(state);

  if (state.messages.length) {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage?._id) {
      await markRoomRead(roomId, lastMessage._id);
    }
  }
}
async function loadRoomMeta() {
  if (state.eventId) {
    const resp = await getEventRoomMeta(state.eventId);
    state.roomMeta = resp?.data || resp;
  }

  if (state.roomMeta?.eventId) {
    state.eventId = state.roomMeta.eventId;
  }

  updateHeader(state);
}
async function init() {
  const params = getQueryParams();
  state.eventId = params.eventId;
  state.roomId = params.roomId;
  state.returnTo = params.returnTo;

  bindBackButton();
bindAuthorProfileNavigation();
await loadRooms();

  if (state.eventId && !state.roomId) {
    const res = await openOrJoinEvent(state.eventId);
    state.roomId = res?.data?.roomId;
  }

  await loadRoomMeta();

if (state.roomId) {
  await loadMessages(state.roomId);
}

updateHeader(state);

  document
    .getElementById("roomsComposer")
    .addEventListener("submit", async e => {
      e.preventDefault();
      const input = document.getElementById("roomsInput");
      const text = input.value.trim();
      if (!text) return;

      await postRoomMessage(state.roomId, text);
      input.value = "";
      await loadMessages(state.roomId);
    });
}

document.addEventListener("DOMContentLoaded", init);
