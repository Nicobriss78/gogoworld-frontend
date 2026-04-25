import {
  getMessagesState,
  resetMessagesError,
  resetMessagesThreadState,
  resetMessagesViewState,
  setMessagesActiveTab,
  setMessagesViewMode,
  setMessagesActiveEventThread,
  setMessagesActiveDmThread,
  setMessagesThreadMeta,
  setMessagesCurrentMessages,
  setMessagesEventThreads,
  setMessagesDmThreads,
  setMessagesLoading,
  setMessagesError,
  setMessagesComposerEnabled,
  setMessagesReturnTo,
} from "/js/messages/messages-state.js";

import { createMessagesApi } from "/js/messages/messages-api.js";

import {
  getMessagesDom,
  renderMessagesTabState,
  renderMessagesViewMode,
  renderMessagesListHeader,
  renderMessagesListState,
  clearMessagesListState,
  clearMessagesList,
  renderEventThreadsList,
  renderDmThreadsList,
  renderEventThread,
  renderDmThread,
  renderMessagesThreadNotice,
  clearMessagesThreadNotice,
  clearMessagesThreadMessages,
  setMessagesComposerState,
  renderMessagesEmptyState,
  renderMessagesErrorState,
} from "/js/messages/messages-renderer.js";

const api = createMessagesApi();
const dom = getMessagesDom();
const MESSAGES_POLLING_INTERVAL_MS = 3000;

let messagesPollingTimer = null;
let isRefreshingThread = false;
let lastMessagesSignature = "";
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const rawTab = String(params.get("tab") || "").trim().toLowerCase();
  const normalizedTab = rawTab === "dm" || rawTab === "messages" ? "dm" : "events";

  return {
    tab: normalizedTab,
    eventId: params.get("eventId") || "",
    roomId: params.get("roomId") || "",
    userId: params.get("userId") || "",
    rootReturnTo: params.get("rootReturnTo") || "",
  };
}

function syncBaseUi() {
  const state = getMessagesState();
  renderMessagesTabState(state.activeTab);
  renderMessagesViewMode(state.viewMode);
}
function getMessagesSignature(messages) {
  return (messages || [])
    .map((m) => m?._id || m?.createdAt || "")
    .join("|");
}

function isMessagesComposerActive() {
  return Boolean(
    dom.composerInput && document.activeElement === dom.composerInput
  );
}
function renderCurrentListView() {
  const state = getMessagesState();

  renderMessagesListHeader({ activeTab: state.activeTab });
  clearMessagesList();
  clearMessagesThreadNotice();
  clearMessagesThreadMessages();

  if (state.activeTab === "dm") {
    if (!state.dmThreads.length) {
      renderMessagesEmptyState("Non hai ancora conversazioni private.");
      return;
    }

    clearMessagesListState();
    renderDmThreadsList(state.dmThreads);
    return;
  }

  if (!state.eventThreads.length) {
    renderMessagesEmptyState("Non hai ancora chat evento disponibili.");
    return;
  }

  clearMessagesListState();
  renderEventThreadsList(state.eventThreads);
}

function buildEventThreadAction(meta, activeEventId) {
  if (!activeEventId) return null;

  const state = getMessagesState();
  const params = new URLSearchParams();
  params.set("id", activeEventId);

  if (state.rootReturnTo) {
    params.set("rootReturnTo", state.rootReturnTo);
  }

  return {
    label: "Apri evento",
    href: `/pages/evento-v2.html?${params.toString()}`,
  };
}

function buildDmThreadAction(activeUserId) {
  if (!activeUserId) return null;

  const state = getMessagesState();
  const params = new URLSearchParams();
  params.set("userId", activeUserId);

  if (state.rootReturnTo) {
    params.set("rootReturnTo", state.rootReturnTo);
  }

  return {
    label: "Apri profilo",
    href: `/pages/user-public.html?${params.toString()}`,
  };
}

function applyEventThreadNotice(meta) {
  clearMessagesThreadNotice();

  if (!meta) return;

  if (meta.status === "closed") {
    renderMessagesThreadNotice(
      "La chat è chiusa. Se hai partecipato all’evento puoi lasciare una recensione."
    );
    return;
  }

  if (meta.status === "closing") {
    renderMessagesThreadNotice(
      "La chat è ancora attiva ma si chiuderà presto."
    );
  }
}

function renderCurrentThreadView() {
  const state = getMessagesState();
  const meta = state.currentThreadMeta || {};
  const messages = state.currentMessages || [];

  if (state.activeThreadType === "dm") {
    renderDmThread(meta, messages, {
      action: buildDmThreadAction(state.activeUserId),
    });

    clearMessagesThreadNotice();
    setMessagesComposerState({
      enabled: state.composerEnabled,
      placeholder: state.composerEnabled
        ? "Scrivi un messaggio..."
        : "Non puoi inviare messaggi a questo utente",
    });
    return;
  }

  renderEventThread(meta, messages, {
    action: buildEventThreadAction(meta, state.activeEventId),
  });

  applyEventThreadNotice(meta);

  setMessagesComposerState({
    enabled: state.composerEnabled,
    placeholder: state.composerEnabled
      ? "Scrivi un messaggio..."
      : "Questa chat è chiusa",
  });
}

async function loadEventThreads() {
  setMessagesLoading(true);
  renderMessagesListState("Caricamento chat evento...", "info");

  try {
    const threads = await api.events.listThreads();
    setMessagesEventThreads(threads);
    resetMessagesError();
    renderCurrentListView();
  } catch (error) {
    console.error(error);
    setMessagesError("Impossibile caricare le chat evento.");
    renderMessagesErrorState("Impossibile caricare le chat evento.");
  } finally {
    setMessagesLoading(false);
  }
}

async function loadDmThreads() {
  setMessagesLoading(true);
  renderMessagesListState("Caricamento messaggi privati...", "info");

  try {
    const threads = await api.dm.listThreads();
    setMessagesDmThreads(threads);
    resetMessagesError();
    renderCurrentListView();
  } catch (error) {
    console.error(error);
    setMessagesError("Impossibile caricare i messaggi privati.");
    renderMessagesErrorState("Impossibile caricare i messaggi privati.");
  } finally {
    setMessagesLoading(false);
  }
}

async function openEventThreadByEventId(eventId) {
  if (!eventId) return;

  setMessagesLoading(true);
  setMessagesViewMode("thread");
  syncBaseUi();
  clearMessagesThreadMessages();
  clearMessagesThreadNotice();
  renderMessagesThreadNotice("Caricamento conversazione...");

  try {
    const meta = await api.events.openThreadByEvent(eventId);
    setMessagesActiveEventThread({
      eventId,
      roomId: meta.roomId,
    });
    setMessagesThreadMeta(meta);
    setMessagesComposerEnabled(Boolean(meta.canSend) && !meta.locked);

    const messages = await api.events.getMessages(meta.roomId);
    setMessagesCurrentMessages(messages);

    renderCurrentThreadView();
    await api.events.markRead(meta.roomId);
    startMessagesPolling();
    resetMessagesError();
  } catch (error) {
    console.error(error);
    setMessagesError("Impossibile aprire la chat evento.");
    renderMessagesThreadNotice("Impossibile aprire la chat evento.");
    setMessagesComposerEnabled(false);
    renderCurrentThreadView();
  } finally {
    setMessagesLoading(false);
  }
}

async function openEventThreadByRoomId(roomId) {
  const state = getMessagesState();
  const thread = state.eventThreads.find((item) => item.roomId === roomId);

  if (!thread?.eventId) {
    renderMessagesErrorState("Chat evento non disponibile.");
    return;
  }

  await openEventThreadByEventId(thread.eventId);
}

async function openDmThreadByUserId(userId) {
  if (!userId) return;

  setMessagesLoading(true);
  setMessagesViewMode("thread");
  syncBaseUi();
  clearMessagesThreadMessages();
  clearMessagesThreadNotice();
  renderMessagesThreadNotice("Caricamento conversazione...");

  try {
    const state = getMessagesState();
    let threadMeta = state.dmThreads.find((item) => item.userId === userId) || null;

    if (!threadMeta) {
      const threads = await api.dm.listThreads();
      setMessagesDmThreads(threads);
      threadMeta = threads.find((item) => item.userId === userId) || null;
    }

    setMessagesActiveDmThread({ userId });
    setMessagesThreadMeta({
      title: threadMeta?.title || "Conversazione",
      subtitle: "",
    });
    setMessagesComposerEnabled(true);

    const messages = await api.dm.getMessages(userId);
    setMessagesCurrentMessages(messages);

    renderCurrentThreadView();
    await api.dm.markRead(userId);
    startMessagesPolling();
    resetMessagesError();
  } catch (error) {
    console.error(error);
    setMessagesError("Impossibile aprire il messaggio privato.");
    renderMessagesThreadNotice("Impossibile aprire il messaggio privato.");
    setMessagesComposerEnabled(false);
    renderCurrentThreadView();
  } finally {
    setMessagesLoading(false);
  }
}

async function refreshCurrentThread() {
  const state = getMessagesState();

  if (isRefreshingThread) return;

  const isDm = state.activeThreadType === "dm" && state.activeUserId;
  const isEvent = state.activeThreadType === "event" && state.activeRoomId;

  if (!isDm && !isEvent) return;

  isRefreshingThread = true;

  try {
    let messages = [];

    if (isDm) {
      messages = await api.dm.getMessages(state.activeUserId);
    } else if (isEvent) {
      messages = await api.events.getMessages(state.activeRoomId);
    }

    const nextSignature = getMessagesSignature(messages);

    if (nextSignature === lastMessagesSignature) return;

    lastMessagesSignature = nextSignature;

    setMessagesCurrentMessages(messages);
    renderCurrentThreadView();

    // ❗ NO focus se stai scrivendo
    if (!isMessagesComposerActive()) {
      const container = document.getElementById("messagesThreadMessages");
      if (container) {
        requestAnimationFrame(() => {
          container.scrollTop = 0;
        });
      }
    }

  } finally {
    isRefreshingThread = false;
  }
}
function stopMessagesPolling() {
  if (!messagesPollingTimer) return;
  clearInterval(messagesPollingTimer);
  messagesPollingTimer = null;
}

function startMessagesPolling() {
  const state = getMessagesState();

  const hasThread =
    (state.activeThreadType === "dm" && state.activeUserId) ||
    (state.activeThreadType === "event" && state.activeRoomId);

  if (!hasThread || messagesPollingTimer || document.hidden) return;

  messagesPollingTimer = window.setInterval(() => {
    refreshCurrentThread();
  }, MESSAGES_POLLING_INTERVAL_MS);
}

function handleMessagesVisibilityChange() {
  if (document.hidden) {
    stopMessagesPolling();
    return;
  }

  refreshCurrentThread();
  startMessagesPolling();
}
async function handleTabChange(tab) {
  stopMessagesPolling();
  lastMessagesSignature = "";

  resetMessagesViewState();
  setMessagesActiveTab(tab);

  const state = getMessagesState();
  syncBaseUi();
  renderCurrentListView();

  if (state.activeTab === "dm") {
    await loadDmThreads();
    return;
  }

  await loadEventThreads();
}

function handleThreadBack() {
  resetMessagesViewState();
  syncBaseUi();
  renderCurrentListView();
}
function handlePageBack() {
  const state = getMessagesState();
  const rootReturnTo = String(state.rootReturnTo || "").trim();

  if (rootReturnTo) {
    window.location.href = rootReturnTo;
    return;
  }

  window.location.href = "/pages/home-v2.html";
}
async function handleComposerSubmit(event) {
  event.preventDefault();

  const state = getMessagesState();
  const text = dom.composerInput?.value?.trim() || "";

  if (!text) return;

  try {
    setMessagesComposerState({
      enabled: false,
      placeholder: "Invio in corso...",
    });

    if (state.activeThreadType === "dm" && state.activeUserId) {
      await api.dm.sendMessage(state.activeUserId, text);
      if (dom.composerInput) dom.composerInput.value = "";
      await refreshCurrentThread();
      await loadDmThreads();
      return;
    }

    if (state.activeThreadType === "event" && state.activeRoomId) {
      await api.events.sendMessage(state.activeRoomId, text);
      if (dom.composerInput) dom.composerInput.value = "";
      await refreshCurrentThread();
      await loadEventThreads();
      return;
    }
  } catch (error) {
    console.error(error);
    renderMessagesThreadNotice("Invio non riuscito. Riprova.");
  } finally {
    const latestState = getMessagesState();
    setMessagesComposerState({
      enabled: latestState.composerEnabled,
      placeholder: latestState.composerEnabled
        ? "Scrivi un messaggio..."
        : "Questa chat è chiusa",
    });
  }
}

async function handleListClick(event) {
  const trigger = event.target.closest(".messages-list-item");
  if (!trigger) return;

  const threadType = trigger.dataset.threadType;

  if (threadType === "dm") {
    const userId = trigger.dataset.userId || "";
    await openDmThreadByUserId(userId);
    return;
  }

  const eventId = trigger.dataset.eventId || "";
  const roomId = trigger.dataset.roomId || "";

  if (eventId) {
    await openEventThreadByEventId(eventId);
    return;
  }

  if (roomId) {
    await openEventThreadByRoomId(roomId);
  }
}

function bindEvents() {
  dom.tabEvents?.addEventListener("click", () => {
    handleTabChange("events");
  });

  dom.tabDm?.addEventListener("click", () => {
    handleTabChange("dm");
  });

  dom.list?.addEventListener("click", (event) => {
    handleListClick(event);
  });

  document.getElementById("messagesThreadBack")?.addEventListener("click", () => {
    handleThreadBack();
  });
  document.getElementById("messagesPageBack")?.addEventListener("click", () => {
    handlePageBack();
  });
  dom.composer?.addEventListener("submit", (event) => {
    handleComposerSubmit(event);
  });
}

async function bootstrapFromQuery() {
  const query = getQueryParams();

  setMessagesReturnTo(query.rootReturnTo);
  setMessagesActiveTab(query.tab);
  syncBaseUi();

  if (query.tab === "dm") {
    await loadDmThreads();

    if (query.userId) {
      await openDmThreadByUserId(query.userId);
      return;
    }

    setMessagesViewMode("list");
    syncBaseUi();
    renderCurrentListView();
    return;
  }

  await loadEventThreads();

  if (query.eventId) {
    await openEventThreadByEventId(query.eventId);
    return;
  }

  if (query.roomId) {
    await openEventThreadByRoomId(query.roomId);
    return;
  }

  setMessagesViewMode("list");
  syncBaseUi();
  renderCurrentListView();
}

async function initMessagesPage() {
  syncBaseUi();
  renderMessagesListHeader({ activeTab: "events" });
  renderMessagesListState("Caricamento conversazioni...", "info");
  bindEvents();
  await bootstrapFromQuery();
}

window.addEventListener("DOMContentLoaded", () => {
  initMessagesPage().catch((error) => {
    console.error(error);
    renderMessagesErrorState("Impossibile inizializzare la pagina messaggi.");
  });
});
