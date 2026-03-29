export function resolveCapabilities(viewConfig) {
  if (!viewConfig || !Array.isArray(viewConfig.capabilities)) {
    return [];
  }

  return [...viewConfig.capabilities];
}

export function resolveVisibleMenuItems(viewConfig, menuItems = []) {
  const activeCapabilities = resolveCapabilities(viewConfig);

  return menuItems.filter((item) => {
    if (!item.requiredCapability) return true;
    return activeCapabilities.includes(item.requiredCapability);
  });
}

export function resolveShellContext(viewConfig, menuItems = []) {
  const capabilities = resolveCapabilities(viewConfig);
  const visibleMenuItems = resolveVisibleMenuItems(viewConfig, menuItems);

  return {
    capabilities,
    visibleMenuItems,
    flags: {
      supportsNotifications: capabilities.includes("supportsNotifications"),
      showMessagesEntry: capabilities.includes("showMessagesEntry"),
      showSearchEntry: capabilities.includes("showSearchEntry"),
      showMapShortcut: capabilities.includes("showMapShortcut"),
      standardParticipantMenu: capabilities.includes("standardParticipantMenu"),
    },
  };
}
