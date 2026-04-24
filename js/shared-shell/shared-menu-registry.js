const MENU_REGISTRY = [
  {
    menuItemId: "search-users",
    label: "Cerca utente",
    type: "navigation",
    targetViewId: "user-search",
  },
  {
    menuItemId: "events",
    label: "Eventi",
    type: "navigation",
    targetViewId: "map",
  },
  {
    menuItemId: "private-events",
    label: "Eventi privati",
    type: "navigation",
    targetViewId: "private-map",
  },
  {
    menuItemId: "participant-guide",
    label: "Guida partecipante",
    type: "action",
    actionId: "participant-guide",
  },
  {
    menuItemId: "change-role",
    label: "Cambia ruolo",
    type: "action",
    actionId: "change-role",
  },
  {
    menuItemId: "logout",
    label: "Logout",
    type: "action",
    actionId: "logout",
    tone: "danger",
  },
];

export function getMenuItems() {
  return structuredClone(MENU_REGISTRY);
}

export function getMenuItem(menuItemId) {
  const item = MENU_REGISTRY.find((entry) => entry.menuItemId === menuItemId);
  return item ? structuredClone(item) : null;
}

export function hasMenuItem(menuItemId) {
  return MENU_REGISTRY.some((entry) => entry.menuItemId === menuItemId);
}
