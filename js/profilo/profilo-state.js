const createInitialProfileData = () => ({
  id: "",
  nickname: "",
  roleLabel: "",
  publicRole: "",
  avatarUrl: "",
  locationLabel: "",
  bio: "",
  birthYear: "",
  region: "",
  city: "",
  languages: "",
  interests: "",
  socials: "",
  allowDirectMessages: false,
  dmsFrom: "everyone",
});

const createInitialAccountStatus = () => ({
  emailVerified: false,
  emailStatusLabel: "",
  profileCompletionLabel: "",
  canResendVerification: false,
});

const createInitialConnections = () => ({
  followersCount: 0,
  followingCount: 0,
  followers: [],
  following: [],
});

const createInitialUiState = () => ({
  loading: false,
  saving: false,
  editing: false,
  notificationsOpen: false,
  menuOpen: false,
  message: null,
  error: null,
});

const createInitialProfileState = () => ({
  profile: createInitialProfileData(),
  accountStatus: createInitialAccountStatus(),
  connections: createInitialConnections(),
  ui: createInitialUiState(),
});

let state = createInitialProfileState();

const clone = (value) => {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
};

export function getProfileState() {
  return clone(state);
}

export function resetProfileState() {
  state = createInitialProfileState();
  return getProfileState();
}

export function setProfileState(nextState) {
  state = {
    ...createInitialProfileState(),
    ...clone(nextState),
    profile: {
      ...createInitialProfileData(),
      ...(nextState?.profile ?? {}),
    },
    accountStatus: {
      ...createInitialAccountStatus(),
      ...(nextState?.accountStatus ?? {}),
    },
    connections: {
      ...createInitialConnections(),
      ...(nextState?.connections ?? {}),
    },
    ui: {
      ...createInitialUiState(),
      ...(nextState?.ui ?? {}),
    },
  };

  return getProfileState();
}

export function patchProfileState(partialState) {
  state = {
    ...state,
    ...clone(partialState),
    profile: {
      ...state.profile,
      ...(partialState?.profile ?? {}),
    },
    accountStatus: {
      ...state.accountStatus,
      ...(partialState?.accountStatus ?? {}),
    },
    connections: {
      ...state.connections,
      ...(partialState?.connections ?? {}),
    },
    ui: {
      ...state.ui,
      ...(partialState?.ui ?? {}),
    },
  };

  return getProfileState();
}

export function setProfileData(profileData) {
  state = {
    ...state,
    profile: {
      ...createInitialProfileData(),
      ...(profileData ?? {}),
    },
  };

  return getProfileState();
}

export function patchProfileData(profileDataPatch) {
  state = {
    ...state,
    profile: {
      ...state.profile,
      ...(profileDataPatch ?? {}),
    },
  };

  return getProfileState();
}

export function setAccountStatus(accountStatus) {
  state = {
    ...state,
    accountStatus: {
      ...createInitialAccountStatus(),
      ...(accountStatus ?? {}),
    },
  };

  return getProfileState();
}

export function patchAccountStatus(accountStatusPatch) {
  state = {
    ...state,
    accountStatus: {
      ...state.accountStatus,
      ...(accountStatusPatch ?? {}),
    },
  };

  return getProfileState();
}

export function setConnections(connections) {
  state = {
    ...state,
    connections: {
      ...createInitialConnections(),
      ...(connections ?? {}),
      followers: Array.isArray(connections?.followers) ? [...connections.followers] : [],
      following: Array.isArray(connections?.following) ? [...connections.following] : [],
    },
  };

  return getProfileState();
}

export function patchUiState(uiPatch) {
  state = {
    ...state,
    ui: {
      ...state.ui,
      ...(uiPatch ?? {}),
    },
  };

  return getProfileState();
}

export function setProfileMessage(message) {
  state = {
    ...state,
    ui: {
      ...state.ui,
      message,
      error: null,
    },
  };

  return getProfileState();
}

export function setProfileError(error) {
  state = {
    ...state,
    ui: {
      ...state.ui,
      error,
      message: null,
    },
  };

  return getProfileState();
}

export function clearProfileFeedback() {
  state = {
    ...state,
    ui: {
      ...state.ui,
      message: null,
      error: null,
    },
  };

  return getProfileState();
      }
