export function createMappaPrivatiState() {
  let state = createInitialState();

  function createInitialState() {
    return {
      events: [],
      eventsById: new Map(),

      selectedEventId: null,
      selectedEvent: null,

      mapReady: false,
      mapLoading: false,
      mapError: "",

      drawerOpen: false,

      chatRoomId: null,
      chatLocked: false,
      chatCanSend: false,
      chatActiveEventId: null,
      chatLoading: false,
      chatError: "",

      currentUserId: null,

      geo: {
        permission: "unknown",
        mode: "explore",
        userPosition: null,
        mapCenter: null,
        radiusMeters: 30000,
        lastUpdate: null,
        accuracy: null,
        geoError: ""
      },

      returnEventId: null,
      returnDrawerOpen: false
    };
  }

  function getState() {
    return state;
  }

  function setState(patch = {}) {
    state = {
      ...state,
      ...patch
    };
    return state;
  }

  function resetState() {
    state = createInitialState();
    return state;
  }

  function setEvents(events = []) {
    const safeEvents = Array.isArray(events) ? events : [];
    const eventsById = new Map();

    for (const event of safeEvents) {
      if (!event || !event.id) continue;
      eventsById.set(event.id, event);
    }

    const nextState = {
      ...state,
      events: safeEvents,
      eventsById
    };

    if (
      nextState.selectedEventId &&
      !eventsById.has(nextState.selectedEventId)
    ) {
      nextState.selectedEventId = null;
      nextState.selectedEvent = null;
      nextState.drawerOpen = false;
    }

    state = nextState;
    return state;
  }

  function setSelectedEvent(event) {
    if (!event || !event.id) {
      return clearSelectedEvent();
    }

    state = {
      ...state,
      selectedEventId: event.id,
      selectedEvent: event
    };

    return state;
  }

  function clearSelectedEvent() {
    state = {
      ...state,
      selectedEventId: null,
      selectedEvent: null,
      drawerOpen: false
    };

    return state;
  }

  function setMapStatus(partial = {}) {
    state = {
      ...state,
      mapReady:
        typeof partial.mapReady === "boolean" ? partial.mapReady : state.mapReady,
      mapLoading:
        typeof partial.mapLoading === "boolean"
          ? partial.mapLoading
          : state.mapLoading,
      mapError:
        typeof partial.mapError === "string" ? partial.mapError : state.mapError
    };

    return state;
  }

  function setDrawerOpen(isOpen) {
    state = {
      ...state,
      drawerOpen: Boolean(isOpen)
    };

    return state;
  }

  function setChatState(partial = {}) {
    state = {
      ...state,
      chatRoomId:
        partial.chatRoomId !== undefined ? partial.chatRoomId : state.chatRoomId,
      chatLocked:
        typeof partial.chatLocked === "boolean"
          ? partial.chatLocked
          : state.chatLocked,
      chatCanSend:
        typeof partial.chatCanSend === "boolean"
          ? partial.chatCanSend
          : state.chatCanSend,
      chatActiveEventId:
        partial.chatActiveEventId !== undefined
          ? partial.chatActiveEventId
          : state.chatActiveEventId,
      chatLoading:
        typeof partial.chatLoading === "boolean"
          ? partial.chatLoading
          : state.chatLoading,
      chatError:
        typeof partial.chatError === "string"
          ? partial.chatError
          : state.chatError
    };

    return state;
  }

  function resetChatState() {
    state = {
      ...state,
      chatRoomId: null,
      chatLocked: false,
      chatCanSend: false,
      chatActiveEventId: null,
      chatLoading: false,
      chatError: ""
    };

    return state;
  }
  function setGeoState(partial = {}) {
  const currentGeo = state.geo || {};

  state = {
    ...state,
    geo: {
      ...currentGeo,
      permission:
        typeof partial.permission === "string"
          ? partial.permission
          : currentGeo.permission,
      mode:
        typeof partial.mode === "string"
          ? partial.mode
          : currentGeo.mode,
      userPosition:
        partial.userPosition !== undefined
          ? partial.userPosition
          : currentGeo.userPosition,
      mapCenter:
        partial.mapCenter !== undefined
          ? partial.mapCenter
          : currentGeo.mapCenter,
      radiusMeters:
        Number.isFinite(partial.radiusMeters)
          ? partial.radiusMeters
          : currentGeo.radiusMeters,
      lastUpdate:
        partial.lastUpdate !== undefined
          ? partial.lastUpdate
          : currentGeo.lastUpdate,
      accuracy:
        partial.accuracy !== undefined
          ? partial.accuracy
          : currentGeo.accuracy,
      geoError:
        typeof partial.geoError === "string"
          ? partial.geoError
          : currentGeo.geoError
    }
  };
    
function setCurrentUserId(userId) {
  state = {
    ...state,
    currentUserId: userId != null ? String(userId) : null
  };

  return state;
}
  function setReturnContext(partial = {}) {
    state = {
      ...state,
      returnEventId:
        partial.returnEventId !== undefined
          ? partial.returnEventId
          : state.returnEventId,
      returnDrawerOpen:
        typeof partial.returnDrawerOpen === "boolean"
          ? partial.returnDrawerOpen
          : state.returnDrawerOpen
    };

    return state;
  }

  function clearReturnContext() {
    state = {
      ...state,
      returnEventId: null,
      returnDrawerOpen: false
    };

    return state;
  }

  return {
    getState,
    setState,
    resetState,
    setEvents,
    setSelectedEvent,
    clearSelectedEvent,
    setMapStatus,
    setDrawerOpen,
    setChatState,
    resetChatState,
    setCurrentUserId,
    setReturnContext,
    clearReturnContext,
    setGeoState
  };
}
