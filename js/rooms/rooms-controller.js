import {
  openOrJoinEvent,
  getEventRoomMeta,
  listRoomMessages,
  postRoomMessage,
  getMyRooms,
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

async function loadRooms() {
  state.rooms = await getMyRooms({ onlyActive: 1 });
  renderRoomsList(state);
}

async function loadMessages(roomId) {
  const response = await listRoomMessages(roomId, { limit: 50 });
  state.messages = response?.data || [];
  renderMessages(state);
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
