export const organizerNav = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "dashboard",
    href: "/pages/organizer-dashboard-v2.html",
    enabled: true,
  },
  {
    id: "events",
    label: "Eventi",
    icon: "calendar",
    href: "/pages/organizer-events-v2.html",
    enabled: true,
  },
  {
    id: "map",
    label: "Mappa",
    icon: "map",
    href: "/pages/organizer-map-v2.html",
    enabled: false,
  },
  {
    id: "trills",
    label: "Trilli",
    icon: "megaphone",
    href: "/pages/organizer-trills-v2.html",
    enabled: true,
  },
  {
    id: "promos",
    label: "Promo",
    icon: "promo",
    href: "/pages/organizer-promos-v2.html",
    enabled: false,
  },
  {
    id: "profile",
    label: "Profilo",
    icon: "profile",
    href: "/pages/profilo-v2.html?rootReturnTo=organizer",
    enabled: true,
  },
];

export function getOrganizerNavItem(id) {
  return organizerNav.find((item) => item.id === id) || null;
}
