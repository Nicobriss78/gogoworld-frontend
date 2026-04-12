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
    window.location.href = state.returnTo;
  });
}
function bindSidebarClick() {
  const list = document.getElementById("roomsList");
  list.addEventListener("click", async (e) => {
    const item = e.target.closest("[data-room-id]");
    if (!item) return;

    state.roomId = item.dataset.roomId;
    await loadRoomMeta();
    await loadMessages(state.roomId);
    renderRoomsList(state);
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
  await loadRooms();

  if (state.eventId && !state.roomId) {
    const res = await openOrJoinEvent(state.eventId);
    state.roomId = res?.data?.roomId;
  }

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
