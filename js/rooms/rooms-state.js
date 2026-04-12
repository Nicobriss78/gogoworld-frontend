export function createRoomsState() {
  return {
    roomId: null,
    eventId: null,
    roomMeta: null,
    rooms: [],
    messages: [],
    unreadSummary: [],
    returnTo: "/pages/home-v2.html",

    // Stati di caricamento
    isRoomsLoading: false,
    isMessagesLoading: false,
    isRoomMetaLoading: false,
    isSending: false,

    // Stati UI
    error: null,
    empty: false,
    composerDisabled: false,
  };
}
