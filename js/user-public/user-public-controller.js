import {
  fetchPublicProfile,
  fetchUserActivity,
  followUser,
  unfollowUser,
} from "/js/user-public/user-public-api.js";

import { openOrJoinDM } from "/js/api.js";
import {
  renderGlobalState,
  hideGlobalState,
  renderProfile,
  setFollowUi,
  renderActivityLoading,
  renderActivityPrivate,
  renderActivityEmpty,
  renderActivityList,
} from "/js/user-public/user-public-renderer.js";

function getQueryParams() {
  const params = new URLSearchParams(window.location.search);

  return {
    userId: String(params.get("userId") || "").trim(),
    isSelf: params.get("self") === "1",
    returnTo: String(params.get("returnTo") || "").trim(),
  };
}

function isSafeInternalPath(value) {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  return true;
}

function resolveBackTarget({ isSelf, returnTo }) {
  if (isSafeInternalPath(returnTo)) {
    return returnTo;
  }

  if (isSelf) {
    return "/pages/profilo-v2.html";
  }

  if (window.history.length > 1) {
    return null;
  }

  return `/pages/cerca-utenti-v2.html?returnTo=${encodeURIComponent(
  window.location.pathname + window.location.search
)}`;
}

function wireBackButton(context) {
  const backBtn = document.getElementById("userPublicBack");
  if (!backBtn) return;

  const target = resolveBackTarget(context);

  if (context.isSelf) {
    backBtn.textContent = "Torna al mio profilo";
  }

  backBtn.addEventListener("click", (event) => {
    event.preventDefault();

    if (target) {
      window.location.href = target;
      return;
    }

    window.history.back();
  });
}

function buildMessageUrl({ userId, returnTo }) {
  const params = new URLSearchParams();
  params.set("tab", "dm");
  params.set("userId", userId);

  if (isSafeInternalPath(returnTo)) {
    params.set("returnTo", returnTo);
  }

  return `/pages/messages-v2.html?${params.toString()}`;
}
function buildEventDetailUrl(eventId) {
  const safeEventId = String(eventId || "").trim();
  if (!safeEventId) return "";

  const params = new URLSearchParams();
  params.set("id", safeEventId);
  params.set("returnTo", window.location.pathname + window.location.search);

  return `/pages/evento-v2.html?${params.toString()}`;
}
async function loadProfile(context) {
  const profile = await fetchPublicProfile(context.userId);
  renderProfile(profile, { isSelf: context.isSelf });
  return profile;
}

async function loadActivity(context, profile) {
  if (!context.isSelf && !profile?.isFollowing) {
    renderActivityPrivate({ isSelf: false });
    return;
  }

  renderActivityLoading();

  const result = await fetchUserActivity(context.userId);

  if (result.activityPrivate) {
    renderActivityPrivate({ isSelf: context.isSelf });
    return;
  }

  const items = Array.isArray(result.items) ? result.items : [];

  if (!items.length) {
    renderActivityEmpty({ isSelf: context.isSelf });
    return;
  }

  renderActivityList(items);
}

function wireMessageButton(context) {
  const messageBtn = document.getElementById("userPublicMessageBtn");
  if (!messageBtn) return;

  messageBtn.addEventListener("click", () => {
    window.location.href = buildMessageUrl(context);
  });
}

function wireFollowButton(context, getProfileSnapshot, setProfileSnapshot) {
  const followBtn = document.getElementById("userPublicFollowBtn");
  if (!followBtn) return;

  followBtn.addEventListener("click", async () => {
    if (followBtn.disabled) return;

    const profile = getProfileSnapshot();
    if (!profile) return;

    const currentlyFollowing = followBtn.dataset.following === "1";
    const currentFollowers = Number(profile.followersCount || 0);

    try {
      followBtn.disabled = true;

      let nextFollowing = false;
      let nextFollowersCount = currentFollowers;

      if (currentlyFollowing) {
        nextFollowing = await unfollowUser(context.userId);
        nextFollowersCount = Math.max(0, currentFollowers - 1);
      } else {
        nextFollowing = await followUser(context.userId);
        nextFollowersCount = currentFollowers + 1;
      }

      const nextProfile = {
        ...profile,
        isFollowing: nextFollowing,
        followersCount: nextFollowersCount,
      };

      setProfileSnapshot(nextProfile);

      setFollowUi({
        isFollowing: nextFollowing,
        followersCount: nextFollowersCount,
      });

      if (!nextFollowing && !context.isSelf) {
        renderActivityPrivate({ isSelf: false });
      } else {
        await loadActivity(context, nextProfile);
      }
    } catch (error) {
      console.error(error);
      renderGlobalState(
        "Impossibile aggiornare il follow in questo momento.",
        "error"
      );
    } finally {
      followBtn.disabled = false;
    }
  });
}
function wireActivityList() {
  const listEl = document.getElementById("userPublicActivityList");
  if (!listEl) return;

  listEl.addEventListener("click", (event) => {
    const item = event.target.closest(".user-public-activity-item.is-clickable");
    if (!item) return;

    const eventId = String(item.dataset.eventId || "").trim();
    if (!eventId) return;

    window.location.href = buildEventDetailUrl(eventId);
  });

  listEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const item = event.target.closest(".user-public-activity-item.is-clickable");
    if (!item) return;

    event.preventDefault();

    const eventId = String(item.dataset.eventId || "").trim();
    if (!eventId) return;

    window.location.href = buildEventDetailUrl(eventId);
  });
}
async function bootstrap() {
  const context = getQueryParams();

  if (!context.userId) {
    renderGlobalState("Profilo non valido: manca userId nell’URL.", "error");
    return;
  }

  wireBackButton(context);
  wireMessageButton(context);
  wireActivityList();
  
  let profileSnapshot = null;
  const getProfileSnapshot = () => profileSnapshot;
  const setProfileSnapshot = (next) => {
    profileSnapshot = next;
  };

  try {
    renderGlobalState("Caricamento profilo...", "info");

    const profile = await loadProfile(context);
    setProfileSnapshot(profile);

    wireFollowButton(context, getProfileSnapshot, setProfileSnapshot);

    hideGlobalState();

    await loadActivity(context, profile);
  } catch (error) {
    console.error(error);

    if (error.status === 404) {
      renderGlobalState("Utente non trovato.", "error");
      return;
    }

    renderGlobalState(
      "Impossibile caricare il profilo in questo momento.",
      "error"
    );
  }
}

document.addEventListener("DOMContentLoaded", bootstrap);
