export function createRoomsState() {
  return {
    roomId: null,
    eventId: null,
    roomMeta: null,
    messages: [],
    rootReturnTo: "/pages/home-v2.html",
    structuralParent: "",

    // Stati di caricamento
    isLoading: false,
    isOpeningRoom: false,
    isMessagesLoading: false,
    isSending: false,

    // Stato di accesso e invio
    locked: false,
    canSend: true,

    // Messaggi informativi per l’utente
    infoMessage: "",

    // Stati di errore e contenuto
    error: "",
    empty: false,
  };
}
