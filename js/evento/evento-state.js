export function createRoomsState() {
  return {
    roomId: "",
    eventId: "",
    returnTo: "/pages/home-v2.html",

    roomMeta: null,
    messages: [],

    isLoading: true,
    isOpeningRoom: false,
    isMessagesLoading: false,
    isSending: false,

    locked: false,
    canSend: false,

    error: "",
    infoMessage: "",
  };
}
