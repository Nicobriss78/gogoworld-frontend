import {
  openOrJoinEvent,
  getEventRoomMeta,
  listRoomMessages,
  postRoomMessage,
  markRoomRead,
} from "./rooms-api.js";

import { createRoomsState } from "./rooms-state.js";
import {
  renderMessages,
  updateHeader,
  getAuthorProfileUrl,
} from "./rooms-renderer.js";

const state = createRoomsState();

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    eventId: params.get("eventId"),
    roomId: params.get("roomId"),
    rootReturnTo: params.get("rootReturnTo") || "/pages/home-v2.html",
    structuralParent: params.get("structuralParent") || "",
  };
}

function bindBackButton() {
  const backBtn = document.getElementById("roomsBackBtn");
  if (!backBtn) return;

  backBtn.addEventListener("click", () => {
    if (state.returnTo) {
      window.location.href = state.returnTo;
      return;
    }

    if (state.eventId) {
      window.location.href = `/pages/evento-v2.html?id=${encodeURIComponent(
        state.eventId
      )}`;
      return;
    }

    window.location.href = "/pages/home-v2.html";
  });
}

function bindAuthorProfileNavigation() {
  const container = document.getElementById("roomsMessages");
  if (!container) return;

  container.addEventListener("click", (event) => {
    const author = event.target.closest("[data-user-id]");
    if (!author) return;

    const userId = author.dataset.userId || "";
    if (!userId) return;

    const url = getAuthorProfileUrl(userId);
    if (!url) return;

    window.location.href = url;
  });
}

async function loadRoomMeta() {
  if (!state.eventId) return;

  const resp = await getEventRoomMeta(state.eventId);
  state.roomMeta = resp?.data || resp || null;

  if (state.roomMeta?.eventId) {
    state.eventId = state.roomMeta.eventId;
  }

  updateHeader(state);
}

async function loadMessages() {
  if (!state.roomId) return;

  const response = await listRoomMessages(state.roomId, { limit: 50 });
  state.messages = response?.data || response || [];
  renderMessages(state);

  if (state.messages.length) {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage?._id) {
      await markRoomRead(state.roomId, lastMessage._id);
    }
  }
}

async function openRoomFromEvent() {
  if (!state.eventId || state.roomId) return;

  const res = await openOrJoinEvent(state.eventId);
  state.roomId =
    res?.data?.roomId ||
    res?.roomId ||
    null;
}

async function init() {
  const params = getQueryParams();
  state.eventId = params.eventId;
  state.roomId = params.roomId;
  state.returnTo = params.returnTo;

  bindBackButton();
  bindAuthorProfileNavigation();

  await openRoomFromEvent();
  await loadRoomMeta();

  if (state.roomId) {
    await loadMessages();
  } else {
    state.messages = [];
    renderMessages(state);
  }

  const composer = document.getElementById("roomsComposer");
  const input = document.getElementById("roomsInput");

  if (!composer || !input) return;

  composer.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = input.value.trim();
    if (!text || !state.roomId) return;

    await postRoomMessage(state.roomId, text);
    input.value = "";
    await loadMessages();
  });
}

document.addEventListener("DOMContentLoaded", init);
