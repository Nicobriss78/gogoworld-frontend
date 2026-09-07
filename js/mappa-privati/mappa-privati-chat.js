export function createMappaChat({
  api,
  renderer,
  state,
  elements,
  onAccessLost
}) {
  let pollingTimer = null;
  let currentRoomId = null;
  let currentEventId = null;
  let accessLossHandled = false;
const MAPPA_CHAT_PREVIEW_LIMIT = 5;

function getMessageTime(message) {
  const time = new Date(message?.createdAt || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getPreviewMessages(messages = []) {
  if (!Array.isArray(messages)) return [];

  return [...messages]
    .sort((a, b) => getMessageTime(a) - getMessageTime(b))
    .slice(-MAPPA_CHAT_PREVIEW_LIMIT);
}
  function isAccessDeniedError(error) {
  const status = Number(
    error?.status ||
    error?.statusCode ||
    error?.response?.status ||
    0
  );

  return status === 401 || status === 403;
}

function handleAccessLost() {
  if (accessLossHandled) return;

  accessLossHandled = true;

  const lostEventId = currentEventId;

  stopPolling();

  currentRoomId = null;
  currentEventId = null;

  elements.chatHeader.textContent = "Chat evento";
  elements.chatMessages.innerHTML = "";
  elements.chatNotice.innerHTML = renderer.renderChatError(
    "Accesso all’evento non più disponibile."
  );

  disableComposer();
  toggleInfoButton(false);
  state.resetChatState();

  if (typeof onAccessLost === "function") {
    Promise.resolve(
      onAccessLost({ eventId: lostEventId })
    ).catch(() => {});
  }
}
  function mount() {
    elements.sendBtnEl.addEventListener("click", handleSend);

    if (elements.infoBtn) {
      elements.infoBtn.textContent = "Vai all’evento";
      elements.infoBtn.setAttribute("aria-label", "Vai all’evento");
      elements.infoBtn.setAttribute("title", "Vai all’evento");
    }
  }

  /* ===============================
     STATO INIZIALE
     =============================== */

  function showIdle() {
    currentRoomId = null;
    currentEventId = null;
    accessLossHandled = false;

    elements.chatHeader.textContent = "Chat evento";
    elements.chatNotice.innerHTML = renderer.renderChatIdle();
    elements.chatMessages.innerHTML = "";

    disableComposer();
    toggleInfoButton(false);

    stopPolling();
  }

  /* ===============================
     APERTURA CHAT EVENTO
     =============================== */

  async function openForEvent(event) {
    if (!event || !event.id) return;

    const requestEventId = event.id;

    currentEventId = requestEventId;
    accessLossHandled = false;

    elements.chatHeader.textContent =
      renderer.renderChatHeader(event.title);

    elements.chatNotice.innerHTML =
      renderer.renderChatLoading(event.title);

    elements.chatMessages.innerHTML = "";

    disableComposer();
    toggleInfoButton(true);

    stopPolling();

    state.setChatState({
      chatLoading: true,
      chatError: ""
    });

    try {
      const room = await api.openEventRoom(event.id);

      if (currentEventId !== requestEventId) return;

      currentRoomId = room.roomId;

      state.setChatState({
        chatRoomId: room.roomId,
        chatLocked: room.locked,
        chatCanSend: room.canSend,
        chatActiveEventId: event.id,
        chatLoading: false
      });

      if (room.locked) {
        elements.chatNotice.innerHTML =
          renderer.renderChatLocked(event.title);

        disableComposer();
        return;
      }

      enableComposer(room.canSend);

      const canContinue = await loadMessages();

      if (
        !canContinue ||
        currentEventId !== requestEventId ||
        !currentRoomId
      ) {
        return;
      }

      startPolling();
    } catch (error) {
      if (currentEventId !== requestEventId) return;

      if (isAccessDeniedError(error)) {
        handleAccessLost();
        return;
      }

      elements.chatNotice.innerHTML =
        renderer.renderChatError("Errore apertura chat");

      state.setChatState({
        chatError: "OPEN_ROOM_ERROR",
        chatLoading: false
      });
    }
  }
  /* ===============================
     CARICAMENTO MESSAGGI
     =============================== */

  async function loadMessages() {
    if (!currentRoomId) return false;

    const requestRoomId = currentRoomId;

    try {
      const messages =
        await api.fetchRoomMessages(requestRoomId);

      if (currentRoomId !== requestRoomId) return false;

      elements.chatMessages.innerHTML =
        renderer.renderChatMessages(
          getPreviewMessages(messages),
          state.getState().currentUserId
        );

      elements.chatNotice.innerHTML = "";

      await api.markRoomRead(requestRoomId);

      return true;
    } catch (error) {
      if (currentRoomId !== requestRoomId) return false;

      if (isAccessDeniedError(error)) {
        handleAccessLost();
        return false;
      }

      elements.chatNotice.innerHTML =
        renderer.renderChatError(
          "Errore caricamento messaggi"
        );

      // Un errore transitorio non invalida l'accesso:
      // il polling può provare a recuperare.
      return true;
    }
  }
  /* ===============================
     POLLING
     =============================== */

  function startPolling() {
    stopPolling();

    pollingTimer = setInterval(() => {
      refreshMessages();
    }, 10000);
  }

  function stopPolling() {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  async function refreshMessages() {
    if (!currentRoomId) return;

    try {
      const messages = await api.fetchRoomMessages(currentRoomId);

      elements.chatMessages.innerHTML =
  renderer.renderChatMessages(
    getPreviewMessages(messages),
    state.getState().currentUserId
  );

    } catch {
      // silenzioso
    }
  }

  /* ===============================
     INVIO MESSAGGIO
     =============================== */

  async function handleSend() {
    const text = elements.chatInput.value.trim();

    if (!text || !currentRoomId) return;

    try {
      await api.sendRoomMessage(currentRoomId, text);

      elements.chatInput.value = "";

      await refreshMessages();

    } catch {
      elements.chatNotice.innerHTML =
        renderer.renderChatError("Errore invio messaggio");
    }
  }

  /* ===============================
     COMPOSER
     =============================== */

  function disableComposer() {
    elements.chatInput.disabled = true;
    elements.sendBtnEl.disabled = true;
  }

  function enableComposer(canSend) {
    const enabled = Boolean(canSend);

    elements.chatInput.disabled = !enabled;
    elements.sendBtnEl.disabled = !enabled;
  }

  /* ===============================
     INFO BUTTON (IMPORTANT UX)
     =============================== */

  function toggleInfoButton(enabled) {
    if (!elements.infoBtn) return;

    elements.infoBtn.disabled = !enabled;
    elements.infoBtn.textContent = "Vai all’evento";
    elements.infoBtn.setAttribute("aria-label", "Vai all’evento");
    elements.infoBtn.setAttribute("title", "Vai all’evento");
  }

  /* ===============================
     RESET
     =============================== */

  function clear() {
    currentRoomId = null;
    currentEventId = null;

    elements.chatMessages.innerHTML = "";
    elements.chatNotice.innerHTML = renderer.renderChatIdle();

    disableComposer();
    toggleInfoButton(false);

    stopPolling();

    state.resetChatState();
  }

  /* ===============================
     DESTROY
     =============================== */

  function destroy() {
    stopPolling();
    elements.sendBtnEl.removeEventListener("click", handleSend);
  }

  return {
    mount,
    showIdle,
    openForEvent,
    clear,
    refreshMessages,
    destroy
  };
}
