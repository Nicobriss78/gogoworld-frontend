const INITIAL_MESSAGES_STATE = {
  activeTab: "events",
  viewMode: "list",
  rootReturnTo: "",

  activeThreadType: null,
  activeEventId: "",
  activeRoomId: "",
  activeUserId: "",

  eventThreads: [],
  dmThreads: [],

  currentMessages: [],
  currentThreadMeta: null,

  loading: false,
  error: "",
  unreadSummary: null,
  composerEnabled: true,
};

let messagesState = structuredClone(INITIAL_MESSAGES_STATE);

function cloneMessagesState() {
  return structuredClone(messagesState);
}

export function getMessagesState() {
  return cloneMessagesState();
}

export function patchMessagesState(partialState = {}) {
  if (!partialState || typeof partialState !== "object" || Array.isArray(partialState)) {
    return cloneMessagesState();
  }

  messagesState = {
    ...messagesState,
    ...partialState,
  };

  return cloneMessagesState();
}

export function resetMessagesThreadState() {
  messagesState = {
    ...messagesState,
    activeThreadType: null,
    activeEventId: "",
    activeRoomId: "",
    activeUserId: "",
    currentMessages: [],
    currentThreadMeta: null,
    composerEnabled: true,
    error: "",
  };

  return cloneMessagesState();
}

export function resetMessagesViewState() {
  messagesState = {
    ...messagesState,
    viewMode: "list",
    activeThreadType: null,
    activeEventId: "",
    activeRoomId: "",
    activeUserId: "",
    currentMessages: [],
    currentThreadMeta: null,
    composerEnabled: true,
    error: "",
  };

  return cloneMessagesState();
}

export function resetMessagesError() {
  messagesState = {
    ...messagesState,
    error: "",
  };

  return cloneMessagesState();
}

export function resetMessagesState() {
  messagesState = structuredClone(INITIAL_MESSAGES_STATE);
  return cloneMessagesState();
}

export function setMessagesActiveTab(tab) {
  const normalizedTab =
    tab === "dm" || tab === "messages" ? "dm" : "events";

  messagesState = {
    ...messagesState,
    activeTab: normalizedTab,
  };

  return cloneMessagesState();
}

export function setMessagesViewMode(mode) {
  const nextMode = mode === "thread" ? "thread" : "list";

  messagesState = {
    ...messagesState,
    viewMode: nextMode,
  };

  return cloneMessagesState();
}

export function setMessagesActiveEventThread({ eventId = "", roomId = "" } = {}) {
  messagesState = {
    ...messagesState,
    activeThreadType: "event",
    activeEventId: String(eventId || ""),
    activeRoomId: String(roomId || ""),
    activeUserId: "",
  };

  return cloneMessagesState();
}

export function setMessagesActiveDmThread({ userId = "" } = {}) {
  messagesState = {
    ...messagesState,
    activeThreadType: "dm",
    activeEventId: "",
    activeRoomId: "",
    activeUserId: String(userId || ""),
  };

  return cloneMessagesState();
}

export function setMessagesThreadMeta(meta) {
  messagesState = {
    ...messagesState,
    currentThreadMeta: meta && typeof meta === "object" ? { ...meta } : null,
  };

  return cloneMessagesState();
}

export function setMessagesCurrentMessages(messages) {
  messagesState = {
    ...messagesState,
    currentMessages: Array.isArray(messages) ? [...messages] : [],
  };

  return cloneMessagesState();
}

export function setMessagesEventThreads(threads) {
  messagesState = {
    ...messagesState,
    eventThreads: Array.isArray(threads) ? [...threads] : [],
  };

  return cloneMessagesState();
}

export function setMessagesDmThreads(threads) {
  messagesState = {
    ...messagesState,
    dmThreads: Array.isArray(threads) ? [...threads] : [],
  };

  return cloneMessagesState();
}

export function setMessagesLoading(isLoading) {
  messagesState = {
    ...messagesState,
    loading: Boolean(isLoading),
  };

  return cloneMessagesState();
}

export function setMessagesError(message) {
  messagesState = {
    ...messagesState,
    error: typeof message === "string" ? message : "",
  };

  return cloneMessagesState();
}

export function setMessagesUnreadSummary(summary) {
  messagesState = {
    ...messagesState,
    unreadSummary: summary ?? null,
  };

  return cloneMessagesState();
}

export function setMessagesComposerEnabled(enabled) {
  messagesState = {
    ...messagesState,
    composerEnabled: Boolean(enabled),
  };

  return cloneMessagesState();
}

export function setMessagesReturnTo(rootReturnTo) {
  messagesState = {
    ...messagesState,
    rootReturnTo: typeof rootReturnTo === "string" ? rootReturnTo : "",
  };

  return cloneMessagesState();
}
