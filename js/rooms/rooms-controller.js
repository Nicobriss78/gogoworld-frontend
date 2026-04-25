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
const ROOMS_POLLING_INTERVAL_MS = 3000;

let roomsPollingTimer = null;
let isLoadingMessages = false;
let lastRoomsMessagesSignature = "";
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
    if (state.structuralParent) {
      window.location.href = state.structuralParent;
      return;
    }

    if (state.eventId) {
      const params = new URLSearchParams();
      params.set("id", state.eventId);

      if (state.rootReturnTo) {
        params.set("rootReturnTo", state.rootReturnTo);
      }

      window.location.href = `/pages/evento-v2.html?${params.toString()}`;
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

    const url = getAuthorProfileUrl(userId, {
      rootReturnTo: state.rootReturnTo,
      structuralParent: state.structuralParent,
    });
    if (!url) return;

    window.location.href = url;
  });
}
function getRoomsMessagesSignature(messages) {
  return (messages || [])
    .map((message) => message?._id || message?.createdAt || "")
    .join("|");
}
function getLatestRoomMessageCreatedAt(messages) {
  const safeMessages = Array.isArray(messages) ? messages : [];
  const latest = safeMessages[0];

  return latest?.createdAt || "";
}
function isRoomsComposerActive() {
  const input = document.getElementById("roomsInput");
  return Boolean(input && document.activeElement === input);
}
function focusLatestRoomMessage() {
  const container = document.getElementById("roomsMessages");
  if (!container) return;

  requestAnimationFrame(() => {
    container.scrollTop = 0;

    const latestMessage = container.firstElementChild;
    if (!latestMessage) return;

    latestMessage.scrollIntoView({
      block: "start",
      inline: "nearest",
      behavior: "auto",
    });
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

async function loadMessages(options = {}) {
  if (!state.roomId || isLoadingMessages) return;

  isLoadingMessages = true;

  try {
    const currentMessages = Array.isArray(state.messages)
      ? state.messages
      : [];

    const after = options.afterLatest
      ? getLatestRoomMessageCreatedAt(currentMessages)
      : "";

    const requestOptions = after
      ? { after, limit: 20 }
      : { limit: 50 };

    const response = await listRoomMessages(state.roomId, requestOptions);
    const messages = response?.data || response || [];

    if (!Array.isArray(messages) || !messages.length) return;

    const nextMessages = after
      ? [...messages, ...currentMessages]
      : messages;

    const nextSignature = getRoomsMessagesSignature(nextMessages);

    if (nextSignature === lastRoomsMessagesSignature) return;

    lastRoomsMessagesSignature = nextSignature;
    state.messages = nextMessages;

    renderMessages(state);

    if (!isRoomsComposerActive()) {
      focusLatestRoomMessage();
    }

    const latestMessageCreatedAt = getLatestRoomMessageCreatedAt(state.messages);

    if (latestMessageCreatedAt) {
      await markRoomRead(state.roomId, latestMessageCreatedAt);
    }
  } finally {
    isLoadingMessages = false;
  }
}
function stopRoomsPolling() {
  if (!roomsPollingTimer) return;

  clearInterval(roomsPollingTimer);
  roomsPollingTimer = null;
}

function startRoomsPolling() {
  if (!state.roomId || roomsPollingTimer || document.hidden) return;

  roomsPollingTimer = window.setInterval(() => {
    loadMessages({ afterLatest: true });
  }, ROOMS_POLLING_INTERVAL_MS);
}

function handleRoomsVisibilityChange() {
  if (document.hidden) {
    stopRoomsPolling();
    return;
  }

  if (state.roomId) {
    loadMessages({ afterLatest: true });
    startRoomsPolling();
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
  state.rootReturnTo = params.rootReturnTo;
  state.structuralParent = params.structuralParent;

  bindBackButton();
  bindAuthorProfileNavigation();

  await openRoomFromEvent();
  await loadRoomMeta();

  if (state.roomId) {
    await loadMessages();
    startRoomsPolling();
  } else {
    state.messages = [];
    renderMessages(state);
  }

  document.addEventListener("visibilitychange", handleRoomsVisibilityChange);
  window.addEventListener("pagehide", stopRoomsPolling);

  const composer = document.getElementById("roomsComposer");
  const input = document.getElementById("roomsInput");

  if (!composer || !input) return;

  composer.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = input.value.trim();
    if (!text || !state.roomId) return;

    await postRoomMessage(state.roomId, text);
    input.value = "";
    await loadMessages({ afterLatest: true });
  });
}

document.addEventListener("DOMContentLoaded", init);
