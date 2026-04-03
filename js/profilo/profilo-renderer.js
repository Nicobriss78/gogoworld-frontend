import {
  getHeroElements,
  getMessageAreaElement,
  getAccountStatusElements,
  getConnectionsElements,
  getEditorElements,
} from "./profilo-view.js";

/* =========================================================
   HELPERS
   ========================================================= */

function setText(el, value, fallback = "") {
  if (!el) return;
  el.textContent = value || fallback;
}

function setImage(el, src, fallback = "") {
  if (!el) return;

  const finalSrc = src || fallback || "";
  el.onerror = () => {
    el.onerror = null;
    el.src = "";
    el.hidden = true;
  };

  if (!finalSrc) {
    el.src = "";
    el.hidden = true;
    return;
  }

  el.hidden = false;
  el.src = finalSrc;
}

function toggle(el, show) {
  if (!el) return;
  el.hidden = !show;
}

function clear(el) {
  if (!el) return;
  el.innerHTML = "";
}

/* =========================================================
   TOPBAR
   Gestita ora dalla shared shell
   ========================================================= */
/* =========================================================
   HERO
   ========================================================= */

function renderHero(state) {
  const {
    avatar,
    name,
    role,
    location,
    bio,
  } = getHeroElements();

  setImage(avatar, state.profile.avatarUrl);

  setText(name, state.profile.nickname || "Profilo");
  setText(role, state.profile.publicRole || "Partecipante");

  const locationLabel =
    state.profile.locationLabel ||
    [state.profile.city, state.profile.region].filter(Boolean).join(", ");

  setText(location, locationLabel || "Località non disponibile");
  setText(bio, state.profile.bio || "Bio non disponibile");
}

/* =========================================================
   MESSAGE AREA
   ========================================================= */

function renderMessageArea(state) {
  const container = getMessageAreaElement();
  clear(container);

  if (state.ui.error) {
    container.innerHTML = `
      <div class="profilo-alert profilo-alert--error">
        ${state.ui.error}
      </div>
    `;
    return;
  }

  if (state.ui.message) {
    container.innerHTML = `
      <div class="profilo-alert profilo-alert--success">
        ${state.ui.message}
      </div>
    `;
  }
}

/* =========================================================
   ACCOUNT STATUS
   ========================================================= */

function renderAccountStatus(state) {
  const {
    emailStatus,
    resendVerifyButton,
    l2Status,
  } = getAccountStatusElements();

  // Email
  if (state.accountStatus.emailVerified) {
    emailStatus.innerHTML = `
      <span class="profilo-status-pill profilo-status-pill--ok">
        Email verificata
      </span>
    `;
  } else {
    emailStatus.innerHTML = `
      <span class="profilo-status-pill profilo-status-pill--warn">
        Email non verificata
      </span>
    `;
  }

  toggle(resendVerifyButton, !state.accountStatus.emailVerified);

  // Completezza
  setText(
    l2Status,
    state.accountStatus.profileCompletionLabel || "Profilo incompleto"
  );
}

/* =========================================================
   CONNECTIONS
   ========================================================= */

function renderConnections(state) {
  const {
    followersCount,
    followingCount,
    followersList,
    followingList,
  } = getConnectionsElements();

  setText(followersCount, state.connections.followersCount || 0);
  setText(followingCount, state.connections.followingCount || 0);

  // Followers
  clear(followersList);

  if (!state.connections.followers.length) {
    followersList.innerHTML =
      '<div class="profilo-empty">Nessun follower</div>';
  } else {
    followersList.innerHTML = state.connections.followers
      .map(
        (u) => `
        <div class="profilo-connection-item">
          ${u.avatarUrl ? `<img class="profilo-connection-item__avatar" src="${u.avatarUrl}" alt="" />` : `<div class="profilo-connection-item__avatar" aria-hidden="true"></div>`}
          <div class="profilo-connection-item__meta">
            <div class="profilo-connection-item__name">${u.nickname || ""}</div>
            <div class="profilo-connection-item__sub">${u.sub || ""}</div>
          </div>
        </div>
      `
      )
      .join("");
  }

  // Following
  clear(followingList);

  if (!state.connections.following.length) {
    followingList.innerHTML =
      '<div class="profilo-empty">Non segui nessuno</div>';
  } else {
    followingList.innerHTML = state.connections.following
      .map(
        (u) => `
        <div class="profilo-connection-item">
          ${u.avatarUrl ? `<img class="profilo-connection-item__avatar" src="${u.avatarUrl}" alt="" />` : `<div class="profilo-connection-item__avatar" aria-hidden="true"></div>`}
          <div class="profilo-connection-item__meta">
            <div class="profilo-connection-item__name">${u.nickname || ""}</div>
            <div class="profilo-connection-item__sub">${u.sub || ""}</div>
          </div>
        </div>
      `
      )
      .join("");
  }
}

/* =========================================================
   EDITOR
   ========================================================= */

function renderEditor(state) {
  const {
    section,
    avatarPreview,
    nicknameInput,
    birthYearInput,
    regionInput,
    cityInput,
    bioInput,
    languagesInput,
    interestsInput,
    socialsInput,
    dmEnabledInput,
    dmsFromInput,
  } = getEditorElements();

  toggle(section, state.ui.editing);

  if (!state.ui.editing) return;

  avatarPreview.src = state.profile.avatarUrl || "";

  nicknameInput.value = state.profile.nickname || "";
  birthYearInput.value = state.profile.birthYear || "";
  regionInput.value = state.profile.region || "";
  cityInput.value = state.profile.city || "";

  bioInput.value = state.profile.bio || "";
  languagesInput.value = state.profile.languages || "";
  interestsInput.value = state.profile.interests || "";
  socialsInput.value = state.profile.socials || "";

  dmEnabledInput.checked = !!state.profile.allowDirectMessages;
  dmsFromInput.value = state.profile.dmsFrom || "everyone";
}

/* =========================================================
   MAIN RENDER
   ========================================================= */

export function renderProfile(state) {
  renderHero(state);
  renderMessageArea(state);
  renderAccountStatus(state);
  renderConnections(state);
  renderEditor(state);
}
