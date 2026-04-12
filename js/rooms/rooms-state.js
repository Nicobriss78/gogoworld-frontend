export function createRoomsState() {
  return {
    roomId: null,
    eventId: null,
    rooms: [],
    messages: [],
    unreadSummary: [],
    returnTo: "/pages/home-v2.html",
    isLoading: false,
    error: null,
  };
}
