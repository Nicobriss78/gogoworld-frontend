export function createRoomsState() {
  return {
    roomId: null,
    eventId: null,
    roomMeta: null,
    messages: [],
    returnTo: "/pages/home-v2.html",

    isLoading: false,
    isSending: false,
    composerDisabled: false,

    error: "",
    empty: false,
  };
}
