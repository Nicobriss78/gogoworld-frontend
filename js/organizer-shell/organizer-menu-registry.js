export const organizerMenuSections = [
  {
    id: "management",
    label: "Gestione",
    items: [
      { id: "dashboard", label: "Dashboard", type: "nav", navId: "dashboard" },
      { id: "events", label: "Eventi", type: "nav", navId: "events" },
      { id: "trills", label: "Trilli", type: "nav", navId: "trills" },
      { id: "promos", label: "Promozioni", type: "nav", navId: "promos" },
      { id: "map", label: "Mappa Organizer", type: "nav", navId: "map" },
    ],
  },
  {
    id: "communications",
    label: "Comunicazioni",
    items: [
      {
        id: "communications",
        label: "Centro comunicazioni",
        type: "link",
        href: "/pages/organizer-communications-v2.html",
        enabled: false,
      },
      {
        id: "messages",
        label: "Messaggi",
        type: "link",
        href: "/pages/messages-v2.html?rootReturnTo=organizer",
        enabled: true,
      },
      {
        id: "notifications",
        label: "Notifiche",
        type: "action",
        action: "notifications",
        enabled: true,
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { id: "profile", label: "Profilo", type: "nav", navId: "profile" },
      {
        id: "participant",
        label: "Vai come partecipante",
        type: "link",
        href: "/pages/home-v2.html",
        enabled: true,
      },
      {
        id: "logout",
        label: "Logout",
        type: "action",
        action: "logout",
        tone: "danger",
        enabled: true,
      },
    ],
  },
];
