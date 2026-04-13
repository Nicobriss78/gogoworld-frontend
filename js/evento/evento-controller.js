import {
  openOrJoinEvent,
  getEventRoomMeta,
  listRoomMessages,
  postRoomMessage,
  markRoomRead,
} from "./rooms-api.js";

import { createRoomsState } from "./rooms-state.js";
import {
  renderRoomsPage,
  getAuthorProfileUrl,
} from "./rooms-renderer.js";

const state = createRoomsState();

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);

  return {
    eventId: String(params.get("eventId") || "").trim(),
    roomId: String(params.get("roomId") || "").trim(),
    returnTo: String(params.get("returnTo") || "").trim() || "/pages/home-v2.html",
  };
}

function goBack() {
  if (state.returnTo) {
    window.location.href = state.returnTo;
    return;
  }

  if (state.eventId) {
    window.location.href = `/pages/evento-v2.html?id=${encodeURIComponent(state.eventId)}`;
    return;
  }

  window.location.href = "/pages/home-v2.html";
}

function bindBackButton() {
  const backBtn = document.getElementById("roomsBackBtn");
  if (!backBtn) return;

  backBtn.addEventListener("click", () => {
    goBack();
  });
}

function bindAuthorProfileNavigation() {
  const container = document.getElementById("roomsMessages");
  if (!container) return;

  container.addEventListener("click", (event) => {
    const author = event.target.closest("[data-user-id]");
    if (!author) return;

    const userId = String(author.dataset.userId || "").trim();
    if (!userId) return;

    const url = getAuthorProfileUrl(userId);
    if (!url) return;

    window.location.href = url;
  });
}

function normalizeErrorMessage(error, fallback) {
  return String(error?.message || fallback || "Si è verificato un errore.");
}

async function openRoomFromEvent() {
  if (!state.eventId || state.roomId) return;

  state.isOpeningRoom = true;
  state.error = "";
  state.infoMessage = "";
  renderRoomsPage(state);

  try {
    const res = await openOrJoinEvent(state.eventId);
    const payload = res?.data || res || null;

    state.locked = Boolean(payload?.locked);
    state.roomId = String(payload?.roomId || "").trim();
    state.canSend = Boolean(payload?.canSend);
    state.roomMeta = payload || null;

    if (state.locked) {
      state.infoMessage = "";
    }
  } catch (error) {
    state.error = normalizeErrorMessage(
      error,
      "Impossibile aprire la conversazione dell’evento."
    );
  } finally {
    state.isOpeningRoom = false;
    renderRoomsPage(state);
  }
}

async function loadRoomMeta() {
  if (!state.eventId) return;

  try {
    const resp = await getEventRoomMeta(state.eventId);
    const payload = resp?.data || resp || null;

    state.roomMeta = payload || state.roomMeta;
    state.locked = Boolean(payload?.locked);
    state.canSend = Boolean(payload?.canSend);

    if (payload?.eventId) {
      state.eventId = String(payload.eventId).trim();
    }
    if (payload?.roomId) {
      state.roomId = String(payload.roomId).trim();
    }
  } catch (error) {
    if (!state.error) {
      state.error = normalizeErrorMessage(
        error,
        "Impossibile caricare i dati della room."
      );
    }
  } finally {
    renderRoomsPage(state);
  }
}

async function loadMessages() {
  if (!state.roomId || state.locked) {
    state.messages = [];
    renderRoomsPage(state);
    return;
  }

  state.isMessagesLoading = true;
  state.error = "";
  renderRoomsPage(state);

  try {
    const response = await listRoomMessages(state.roomId, { limit: 50 });
    state.messages = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response)
        ? response
        : [];

    if (state.messages.length) {
      const lastMessage = state.messages[state.messages.length - 1];
      const upTo = lastMessage?.createdAt || null;

      if (upTo) {
        await markRoomRead(state.roomId, upTo);
      }
    }
  } catch (error) {
    state.messages = [];
    state.error = normalizeErrorMessage(
      error,
      "Impossibile caricare i messaggi della room."
    );
  } finally {
    state.isMessagesLoading = false;
    renderRoomsPage(state);
  }
}

function bindComposer() {
  const composer = document.getElementById("roomsComposer");
  const input = document.getElementById("roomsInput");

  if (!composer || !input) return;

  composer.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = String(input.value || "").trim();

    if (!text || !state.roomId || state.locked || !state.canSend || state.isSending) {
      return;
    }

    state.isSending = true;
    state.error = "";
    renderRoomsPage(state);

    try {
      await postRoomMessage(state.roomId, text);
      input.value = "";
      await loadMessages();
    } catch (error) {
      state.error = normalizeErrorMessage(
        error,
        "Impossibile inviare il messaggio."
      );
    } finally {
      state.isSending = false;
      renderRoomsPage(state);
    }
  });
}

async function init() {
  const params = getQueryParams();

  state.eventId = params.eventId;
  state.roomId = params.roomId;
  state.returnTo = params.returnTo;
  state.isLoading = true;

  bindBackButton();
  bindAuthorProfileNavigation();
  bindComposer();
  renderRoomsPage(state);

  await openRoomFromEvent();
  await loadRoomMeta();
  await loadMessages();

  state.isLoading = false;
  renderRoomsPage(state);
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    state.isLoading = false;
    state.error = normalizeErrorMessage(
      error,
      "Impossibile inizializzare la chat evento."
    );
    renderRoomsPage(state);
  });
});
