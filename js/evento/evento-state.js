export function createEventoState() {
  return {
    eventId: "",
    fromView: "",
    rootReturnTo: "",
    structuralParent: "",
    returnEventId: "",

    event: null,
    currentUser: null,

    isLoading: false,
    isJoining: false,
    isLeaving: false,
    isOpeningChat: false,

    isCheckInLoading: false,
    isSubmittingCheckIn: false,

    notFound: false,
    error: "",
    checkInError: "",

    checkInStatus: null,
    checkInSummary: null,

    reviews: [],
    reviewsTotal: 0,
    reviewsPage: 1,
    reviewsLimit: 20,
    isReviewsLoading: false,
    reviewsError: "",
  };
}

export function setEventoLoading(state, value) {
  state.isLoading = Boolean(value);

  if (state.isLoading) {
    state.error = "";
    state.notFound = false;
  }

  return state;
}

export function setEventoError(state, message) {
  state.isLoading = false;
  state.notFound = false;
  state.error = String(message || "Si è verificato un errore.");
  return state;
}

export function setEventoNotFound(state, value = true) {
  state.isLoading = false;
  state.notFound = Boolean(value);
  state.error = "";
  return state;
}
