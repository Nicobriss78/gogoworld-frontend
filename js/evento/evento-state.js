const INITIAL_EVENTO_STATE = Object.freeze({
  eventId: "",
  event: null,
  currentUser: null,

  fromView: "",
  returnTo: "",
  returnEventId: "",

  isLoading: true,
  error: "",
  notFound: false,

  isJoining: false,
  isLeaving: false,
  isOpeningChat: false,
});

function cloneInitialState() {
  return {
    ...INITIAL_EVENTO_STATE,
  };
}

export function createEventoState() {
  return cloneInitialState();
}

export function resetEventoState(state) {
  Object.assign(state, cloneInitialState());
  return state;
}

export function setEventoLoading(state, value) {
  state.isLoading = Boolean(value);
  return state;
}

export function setEventoError(state, message) {
  state.error = typeof message === "string" ? message : "";
  state.notFound = false;
  state.isLoading = false;
  return state;
}

export function setEventoNotFound(state, value = true) {
  state.notFound = Boolean(value);
  state.error = "";
  state.isLoading = false;
  return state;
}
