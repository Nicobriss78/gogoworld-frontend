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
  renderSeguitiUtentiTopbar,
  renderSeguitiUtentiMessage,
} from "./seguiti-utenti-renderer.js";
import {
  resolveUserIdentity,
  applyUserIdentityToTopbar,
} from "/js/shared/user-identity.js";
async function loadFollowing(view) {
  seguitiUtentiState.loading = true;
  seguitiUtentiState.error = "";

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
  if (!userId) return;

  const confirmAction = confirm("Vuoi smettere di seguire questo utente?");
  if (!confirmAction) return;

  seguitiUtentiState.unfollowingUserId = userId;
  renderSeguitiUtentiPage(view, seguitiUtentiState);

  try {
    await unfollowUser(userId);

    seguitiUtentiState.users = seguitiUtentiState.users.filter(
      (u) => u.id !== userId
    );

    renderSeguitiUtentiMessage(view, "Hai smesso di seguire l'utente.", "success");
  } catch (error) {
    renderSeguitiUtentiMessage(view, "Operazione non riuscita. Riprova.", "error");
  } finally {
    seguitiUtentiState.unfollowingUserId = "";
    renderSeguitiUtentiPage(view, seguitiUtentiState);
  }
}

function setupEventListeners(view) {
  // retry
  view.retryBtn.addEventListener("click", () => {
    loadFollowing(view);
  });

  // delegation lista
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

  const token = getSeguitiUtentiAuthToken();
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {
    const me = await fetchCurrentUserProfile();

    seguitiUtentiSession.currentUserId = me?._id || me?.id || "";

    const identity = resolveUserIdentity(me);
    seguitiUtentiSession.identity = identity;

    renderSeguitiUtentiTopbar(view, identity);

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
