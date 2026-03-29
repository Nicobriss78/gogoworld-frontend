const NAV_REGISTRY = [
  {
    navKey: "map",
    label: "Mappa",
    icon: "map",
    targetViewId: "map",
  },
  {
    navKey: "following",
    label: "Eventi seguiti",
    icon: "calendar",
    targetViewId: "following",
  },
  {
    navKey: "home",
    label: "Home",
    icon: "home",
    targetViewId: "home",
  },
  {
    navKey: "users",
    label: "Utenti seguiti",
    icon: "users",
    targetViewId: "following-users",
  },
  {
    navKey: "profile",
    label: "Profilo",
    icon: "profile",
    targetViewId: "profile",
  },
];

export function getNavItems() {
  return structuredClone(NAV_REGISTRY);
}

export function getNavItem(navKey) {
  const item = NAV_REGISTRY.find((entry) => entry.navKey === navKey);
  return item ? structuredClone(item) : null;
}

export function hasNavItem(navKey) {
  return NAV_REGISTRY.some((entry) => entry.navKey === navKey);
}
