const VIEW_REGISTRY = {
  home: {
    viewId: "home",
    viewType: "primary",
    section: "participant-main",
    topbarMode: "standard",
    menuEnabled: true,
    bottomnavMode: "standard",
    activeNavKey: "home",
    capabilities: [
      "supportsNotifications",
      "showMessagesEntry",
      "showSearchEntry",
      "showMapShortcut",
      "standardParticipantMenu",
    ],
  },

  following: {
    viewId: "following",
    viewType: "primary",
    section: "participant-main",
    topbarMode: "standard",
    menuEnabled: true,
    bottomnavMode: "standard",
    activeNavKey: "following",
    capabilities: [
      "supportsNotifications",
      "showMessagesEntry",
      "showSearchEntry",
      "showMapShortcut",
      "standardParticipantMenu",
    ],
  },

  map: {
    viewId: "map",
    viewType: "primary",
    section: "participant-events",
    topbarMode: "standard",
    menuEnabled: true,
    bottomnavMode: "standard",
    activeNavKey: "map",
    capabilities: [
      "supportsNotifications",
      "showMessagesEntry",
      "showSearchEntry",
      "showMapShortcut",
      "standardParticipantMenu",
      "eventContext",
    ],
  },

  "private-map": {
    viewId: "private-map",
    viewType: "primary",
    section: "participant-events",
    topbarMode: "standard",
    menuEnabled: true,
    bottomnavMode: "standard",
    activeNavKey: "map",
    capabilities: [
      "supportsNotifications",
      "showMessagesEntry",
      "showSearchEntry",
      "showMapShortcut",
      "standardParticipantMenu",
      "eventContext",
      "privateUnlock",
    ],
  },

  profile: {
    viewId: "profile",
    viewType: "primary",
    section: "participant-social",
    topbarMode: "standard",
    menuEnabled: true,
    bottomnavMode: "standard",
    activeNavKey: "profile",
    capabilities: [
      "supportsNotifications",
      "showMessagesEntry",
      "showSearchEntry",
      "showMapShortcut",
      "standardParticipantMenu",
      "profileContext",
    ],
  },

  "following-users": {
    viewId: "following-users",
    viewType: "primary",
    section: "participant-social",
    topbarMode: "standard",
    menuEnabled: true,
    bottomnavMode: "standard",
    activeNavKey: "users",
    capabilities: [
      "supportsNotifications",
      "showMessagesEntry",
      "showSearchEntry",
      "showMapShortcut",
      "standardParticipantMenu",
      "socialContext",
    ],
  },
};

export function hasViewConfig(viewId) {
  return Object.prototype.hasOwnProperty.call(VIEW_REGISTRY, viewId);
}

export function getViewConfig(viewId) {
  if (!hasViewConfig(viewId)) return null;
  return structuredClone(VIEW_REGISTRY[viewId]);
}

export function getAllViewConfigs() {
  return structuredClone(VIEW_REGISTRY);
}
