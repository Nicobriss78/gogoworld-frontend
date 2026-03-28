const REQUIRED_SELECTORS = {
  greeting: "#seguitiUtentiGreeting",
  roleLabel: "#seguitiUtentiRoleLabel",
  notificationsBtn: "#seguitiUtentiNotificationsBtn",
  menuBtn: "#seguitiUtentiMenuBtn",
  menuOverlay: "#seguitiUtentiMenuOverlay",
  menuPanel: "#seguitiUtentiMenuPanel",
  searchBtn: "#seguitiUtentiSearchBtn",
  eventsBtn: "#seguitiUtentiEventsBtn",
  guideBtn: "#seguitiUtentiGuideBtn",
  switchRoleBtn: "#seguitiUtentiSwitchRoleBtn",
  logoutBtn: "#seguitiUtentiLogoutBtn",
  root: "#seguitiUtentiRoot",
  messageArea: "#seguitiUtentiMessageArea",
  loadingState: "#seguitiUtentiLoadingState",
  errorState: "#seguitiUtentiErrorState",
  errorText: "#seguitiUtentiErrorText",
  retryBtn: "#seguitiUtentiRetryBtn",
  emptyState: "#seguitiUtentiEmptyState",
  listWrap: "#seguitiUtentiListWrap",
  list: "#seguitiUtentiList",
  cardTemplate: "#seguitiUtentiCardTemplate",
};

function queryRequiredElement(selector, label) {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`[seguiti-utenti-view] Elemento obbligatorio mancante: ${label} (${selector})`);
  }

  return element;
}

export function getSeguitiUtentiView() {
  const view = {
    greeting: queryRequiredElement(REQUIRED_SELECTORS.greeting, "greeting"),
    roleLabel: queryRequiredElement(REQUIRED_SELECTORS.roleLabel, "roleLabel"),
    notificationsBtn: queryRequiredElement(REQUIRED_SELECTORS.notificationsBtn, "notificationsBtn"),
    menuBtn: queryRequiredElement(REQUIRED_SELECTORS.menuBtn, "menuBtn"),
    root: queryRequiredElement(REQUIRED_SELECTORS.root, "root"),
    messageArea: queryRequiredElement(REQUIRED_SELECTORS.messageArea, "messageArea"),
    loadingState: queryRequiredElement(REQUIRED_SELECTORS.loadingState, "loadingState"),
    errorState: queryRequiredElement(REQUIRED_SELECTORS.errorState, "errorState"),
    errorText: queryRequiredElement(REQUIRED_SELECTORS.errorText, "errorText"),
    retryBtn: queryRequiredElement(REQUIRED_SELECTORS.retryBtn, "retryBtn"),
    emptyState: queryRequiredElement(REQUIRED_SELECTORS.emptyState, "emptyState"),
    listWrap: queryRequiredElement(REQUIRED_SELECTORS.listWrap, "listWrap"),
    list: queryRequiredElement(REQUIRED_SELECTORS.list, "list"),
    cardTemplate: queryRequiredElement(REQUIRED_SELECTORS.cardTemplate, "cardTemplate"),
  };

  return Object.freeze(view);
}
