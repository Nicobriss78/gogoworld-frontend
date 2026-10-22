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
    accessStatus: "ok", // ok | revoked | denied | unauthorized | checking_error
    accessEpoch: 0,
    actionGeneration: 0,
    checkInError: "",

    checkInStatus: null,
    checkInSummary: null,
    checkInPreview: null,
    checkInUxState: "unknown",
    checkInPermission: "unknown",
    checkInPosition: null,

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

// Risposta terminale del boundary: nessun dato privato deve restare in memoria UI.
export function setEventoAccessDenied(state, status) {
  const allowed = new Set(["revoked", "denied", "unauthorized"]);
  state.accessEpoch += 1;
  state.accessStatus = allowed.has(status) ? status : "denied";
  state.event = null;
  state.currentUser = null;
  state.isLoading = false;
  state.notFound = false;
  state.error = "";
  state.isJoining = false;
  state.isLeaving = false;
  state.isOpeningChat = false;
  state.isCheckInLoading = false;
  state.isSubmittingCheckIn = false;
  state.checkInStatus = null;
  state.checkInSummary = null;
  state.checkInPreview = null;
  state.checkInUxState = "unknown";
  state.checkInPermission = "unknown";
  state.checkInPosition = null;
  state.checkInError = "";
  state.reviews = [];
  state.reviewsTotal = 0;
  state.isReviewsLoading = false;
  state.reviewsError = "";
  return state;
}

