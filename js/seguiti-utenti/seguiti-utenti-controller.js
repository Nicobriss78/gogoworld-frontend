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
/* identity topbar ora gestita dalla shared shell */
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

/* menu ora gestito dalla shared shell */

function setupEventListeners(view) {
  view.retryBtn.addEventListener("click", () => {
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
