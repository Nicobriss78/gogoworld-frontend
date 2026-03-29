const ACTION_REGISTRY = {
  logout: {
    actionId: "logout",
    scope: "global",
    implementation: "ready",
  },

  "change-role": {
    actionId: "change-role",
    scope: "global",
    implementation: "placeholder",
  },

  "participant-guide": {
    actionId: "participant-guide",
    scope: "global",
    implementation: "placeholder",
  },

  "private-unlock": {
    actionId: "private-unlock",
    scope: "contextual",
    implementation: "context-handler",
    requiredCapability: "privateUnlock",
  },
};

export function hasActionConfig(actionId) {
  return Object.prototype.hasOwnProperty.call(ACTION_REGISTRY, actionId);
}

export function getActionConfig(actionId) {
  if (!hasActionConfig(actionId)) return null;
  return structuredClone(ACTION_REGISTRY[actionId]);
}

export function getAllActionConfigs() {
  return structuredClone(ACTION_REGISTRY);
}
