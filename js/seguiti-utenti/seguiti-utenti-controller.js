import { getSeguitiUtentiView } from "./seguiti-utenti-view.js";
import { seguitiUtentiState, seguitiUtentiSession } from "./seguiti-utenti-state.js";
import {
  fetchCurrentUserProfile,
  fetchFollowingUsers,
  unfollowUser,
  getSeguitiUtentiAuthToken,
} from "./seguiti-utenti-api.js";
import {
  renderSeguitiUtentiPage,
  renderSeguitiUtentiMessage,
} from "./seguiti-utenti-renderer.js";
import {
  resolveUserIdentity,
  applyUserIdentityToTopbar,
} from "/js/shared/user-identity.js";
async function loadFollowing(view) {
  seguitiUtentiState.loading = true;
  seguitiUtentiState.error = "";
  seguitiUtentiState.ui = {
    ...(seguitiUtentiState.ui || {}),
    menuOpen: false,
  };

  renderSeguitiUtentiPage(view, seguitiUtentiState);

  try {
    const users = await fetchFollowingUsers(seguitiUtentiSession.currentUserId);

    seguitiUtentiState.users = users;
  } catch (error) {
    seguitiUtentiState.error =
      error?.message || "Errore nel caricamento degli utenti seguiti.";
  } finally {
    seguitiUtentiState.loading = false;
    seguitiUtentiState.initialized = true;
    renderSeguitiUtentiPage(view, seguitiUtentiState);
  }
}

function closeMenu(view) {
  seguitiUtentiState.ui = {
    ...(seguitiUtentiState.ui || {}),
    menuOpen: false,
  };
  renderSeguitiUtentiPage(view, seguitiUtentiState);
}

function toggleMenu(view) {
  const isOpen = Boolean(seguitiUtentiState.ui?.menuOpen);

  seguitiUtentiState.ui = {
    ...(seguitiUtentiState.ui || {}),
    menuOpen: !isOpen,
  };

  renderSeguitiUtentiPage(view, seguitiUtentiState);
}

function setupEventListeners(view) {
  view.notificationsBtn.addEventListener("click", () => {
    window.alert("Centro notifiche disponibile a breve.");
  });

  view.menuBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleMenu(view);
  });

  view.menuOverlay.addEventListener("click", () => {
    closeMenu(view);
  });

  view.menuPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && seguitiUtentiState.ui?.menuOpen) {
      closeMenu(view);
    }
  });

  view.searchBtn.addEventListener("click", () => {
    closeMenu(view);
    window.location.href = "/pages/cerca-utenti.html";
  });

  view.eventsBtn.addEventListener("click", () => {
    closeMenu(view);
    window.location.href = "/pages/home-v2.html";
  });

  view.guideBtn.addEventListener("click", () => {
    closeMenu(view);
    window.alert("Guida partecipante disponibile a breve.");
  });

  view.switchRoleBtn.addEventListener("click", () => {
    closeMenu(view);
    window.alert("Cambio ruolo in riallineamento.");
  });

  view.logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
  });

  view.retryBtn.addEventListener("click", () => {
    closeMenu(view);
    loadFollowing(view);
  });

  view.list.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const userId = target.dataset.userId;

    if (action === "unfollow") {
      handleUnfollow(view, userId);
    }
  });
}
async function init() {
  const view = getSeguitiUtentiView();

  seguitiUtentiState.ui = {
    ...(seguitiUtentiState.ui || {}),
    menuOpen: false,
  };

  const token = getSeguitiUtentiAuthToken();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {
    const me = await fetchCurrentUserProfile();
    const meUser = me?.data || me?.user || me || null;

    seguitiUtentiSession.currentUserId =
      meUser?._id ||
      meUser?.id ||
      meUser?.user?._id ||
      meUser?.user?.id ||
      "";

    const identity = await resolveUserIdentity();
    seguitiUtentiSession.identity = identity;

    applyUserIdentityToTopbar({
      greetingEl: view.greeting,
      roleEl: view.roleLabel,
      identity,
    });
    setupEventListeners(view);

    await loadFollowing(view);
  } catch (error) {
    seguitiUtentiState.loading = false;
    seguitiUtentiState.error =
      error?.message || "Errore nel caricamento della sessione.";
    renderSeguitiUtentiPage(view, seguitiUtentiState);
  }
}

init();
