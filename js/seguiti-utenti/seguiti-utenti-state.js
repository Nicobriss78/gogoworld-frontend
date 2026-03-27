export const seguitiUtentiSession = {
  currentUserId: "",
  identity: null,
};

export const seguitiUtentiState = {
  users: [],
  loading: false,
  error: "",
  initialized: false,
  unfollowingUserId: "",
};

export function resetSeguitiUtentiState() {
  seguitiUtentiState.users = [];
  seguitiUtentiState.loading = false;
  seguitiUtentiState.error = "";
  seguitiUtentiState.initialized = false;
  seguitiUtentiState.unfollowingUserId = "";
}

export function resetSeguitiUtentiSession() {
  seguitiUtentiSession.currentUserId = "";
  seguitiUtentiSession.identity = null;
}
