export function createMappaPrivatiChat({
  api,
  renderer,
  state,
  elements
}) {
  let pollingTimer = null;
  let currentRoomId = null;
  let currentEventId = null;

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

    elements.chatHeader.textContent = renderer.renderChatHeader(event.title);
    elements.chatNotice.innerHTML = renderer.renderChatLoading(event.title);
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
        elements.chatNotice.innerHTML = renderer.renderChatLocked(event.title);
        disableComposer();
        return;
      }

      enableComposer(room.canSend);

      await loadMessages();

      startPolling();

    } catch {
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
  if (!currentRoomId) return;

  const requestRoomId = currentRoomId;

  try {
    const messages = await api.fetchRoomMessages(currentRoomId);

    if (currentRoomId !== requestRoomId) return;

    elements.chatMessages.innerHTML =
    renderer.renderChatMessages(
    messages,
    state.getState().currentUserId
  );

    elements.chatNotice.innerHTML = "";

    await api.markRoomRead(currentRoomId);

  } catch {
    elements.chatNotice.innerHTML =
      renderer.renderChatError("Errore caricamento messaggi");
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
    messages,
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
