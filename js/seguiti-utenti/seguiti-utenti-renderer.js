function setHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
}
/* topbar/menu ora gestiti dalla shared shell */
function getInitialLetter(name = "") {
  const clean = typeof name === "string" ? name.trim() : "";
  return clean ? clean.charAt(0).toUpperCase() : "?";
}

function setText(element, value) {
  if (!element) return;
  element.textContent = value || "";
}

function createCardFromTemplate(view) {
  const fragment = view.cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".seguiti-utenti-card");
  const article = fragment.querySelector(".seguiti-utenti-user");
  const avatar = fragment.querySelector(".seguiti-utenti-user__avatar");
  const avatarFallback = fragment.querySelector(".seguiti-utenti-user__avatar-fallback");
  const name = fragment.querySelector(".seguiti-utenti-user__name");
  const meta = fragment.querySelector(".seguiti-utenti-user__meta");
  const openProfileLink = fragment.querySelector('[data-action="open-profile"]');
  const unfollowButton = fragment.querySelector('[data-action="unfollow"]');
  const unfollowLabel = unfollowButton?.querySelector("span");

  return {
    fragment,
    card,
    article,
    avatar,
    avatarFallback,
    name,
    meta,
    openProfileLink,
    unfollowButton,
    unfollowLabel,
  };
}

function renderUserCard(view, user, state) {
  const {
    fragment,
    article,
    avatar,
    avatarFallback,
    name,
    meta,
    openProfileLink,
    unfollowButton,
    unfollowLabel,
  } = createCardFromTemplate(view);

  article.dataset.userId = user.id;

  setText(name, user.name);
  setText(meta, user.locationLabel || user.role || "");

  if (user.avatarUrl) {
    avatar.src = user.avatarUrl;
    avatar.alt = `Avatar di ${user.name}`;
    avatar.hidden = false;
    setText(avatarFallback, "");
    avatarFallback.hidden = true;
  } else {
    avatar.removeAttribute("src");
    avatar.alt = "";
    avatar.hidden = true;
    setText(avatarFallback, getInitialLetter(user.name));
    avatarFallback.hidden = false;
  }

  openProfileLink.href = user.publicProfileUrl || "#";
  openProfileLink.dataset.userId = user.id;

  unfollowButton.dataset.userId = user.id;

  const isUnfollowing = state.unfollowingUserId === user.id;
  unfollowButton.disabled = isUnfollowing;
  setText(unfollowLabel, isUnfollowing ? "Aggiornamento..." : "Smetti di seguire");

  return fragment;
}

export function clearSeguitiUtentiMessage(view) {
  view.messageArea.textContent = "";
  view.messageArea.className = "seguiti-utenti-message-area";
}

export function renderSeguitiUtentiMessage(view, message = "", type = "info") {
  if (!message) {
    clearSeguitiUtentiMessage(view);
    return;
  }

  view.messageArea.textContent = message;
  view.messageArea.className = `seguiti-utenti-message-area is-${type}`;
}

export function renderSeguitiUtentiPage(view, state) {
  const hasError = Boolean(state.error);
  const hasUsers = Array.isArray(state.users) && state.users.length > 0;
  const showEmpty = !state.loading && !hasError && !hasUsers;

  setHidden(view.loadingState, !state.loading);
  setHidden(view.errorState, !hasError);
  setHidden(view.emptyState, !showEmpty);
  setHidden(view.listWrap, !hasUsers || state.loading || hasError);

  if (hasError) {
    setText(view.errorText, state.error);
  } else {
    setText(view.errorText, "");
  }

  view.list.innerHTML = "";

  if (!hasUsers || state.loading || hasError) {
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const user of state.users) {
    fragment.appendChild(renderUserCard(view, user, state));
  }

  view.list.appendChild(fragment);
}
