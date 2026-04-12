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
async function handleUnfollow(view, userId) {
  if (!userId || seguitiUtentiState.unfollowingUserId) return;

  seguitiUtentiState.unfollowingUserId = userId;
  seguitiUtentiState.error = "";
  renderSeguitiUtentiMessage(view, "");
  renderSeguitiUtentiPage(view, seguitiUtentiState);

  try {
    await unfollowUser(userId);

    seguitiUtentiState.users = (seguitiUtentiState.users || []).filter(
      (user) => user.id !== userId
    );

    renderSeguitiUtentiMessage(
      view,
      "Utente rimosso dai seguiti.",
      "success"
    );
  } catch (error) {
    seguitiUtentiState.error = "";
    renderSeguitiUtentiMessage(
      view,
      error?.message || "Impossibile smettere di seguire questo utente.",
      "error"
    );
  } finally {
    seguitiUtentiState.unfollowingUserId = "";
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
function bindOpenUserSearchLinks() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-return-to-current]");
    if (!link) return;

    event.preventDefault();

    const returnTo =
      window.location.pathname + window.location.search;

    const params = new URLSearchParams();
    params.set("returnTo", returnTo);

    window.location.href = `/pages/cerca-utenti-v2.html?${params.toString()}`;
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

    setupEventListeners(view);
    bindOpenUserSearchLinks();

    await loadFollowing(view);
  } catch (error) {
    seguitiUtentiState.loading = false;
    seguitiUtentiState.error =
      error?.message || "Errore nel caricamento della sessione.";
    renderSeguitiUtentiPage(view, seguitiUtentiState);
  }
}

init();
