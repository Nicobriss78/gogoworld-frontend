/**
 * user-public-renderer.js
 * Gestisce esclusivamente il rendering della UI per la pagina user-public.
 */

// ----------------------
// Helper DOM
// ----------------------
const $ = (id) => document.getElementById(id);

// ----------------------
// Utility
// ----------------------

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function getRoleLabel(role) {
  if (role === 'organizer') return 'Organizzatore';
  if (role === 'admin') return 'Admin';
  return '';
}

function getActivityLabel(type) {
  const labels = {
    created_event: 'Evento creato',
    joined_event: 'Partecipa a un evento',
    attended_event: 'Ha partecipato a un evento',
    will_join_event: 'Parteciperà a un evento',
    review_event: 'Ha recensito un evento',
    level_up: 'Avanzamento di livello'
  };
  return labels[type] || 'Attività';
}

// ----------------------
// Stato globale pagina
// ----------------------

export function renderGlobalState(message, type = 'info') {
  const stateEl = $('userPublicState');
  if (!stateEl) return;

  stateEl.textContent = message;
  stateEl.className = `user-public-state user-public-state--${type}`;
  stateEl.hidden = false;
}

// ----------------------
// Rendering Profilo
// ----------------------

export function renderProfile(profileData, isSelf) {
  const {
    name,
    role,
    profile = {},
    followersCount = 0,
    followingCount = 0,
    isFollowing = false,
    canReceiveMessages = true
  } = profileData;

  const avatar = $('userPublicAvatar');
  const avatarFallback = $('userPublicAvatarFallback');
  const nameEl = $('userPublicName');
  const roleEl = $('userPublicRole');
  const metaEl = $('userPublicMeta');
  const bioEl = $('userPublicBio');
  const followersEl = $('userPublicFollowersCount');
  const followingEl = $('userPublicFollowingCount');
  const followBtn = $('userPublicFollowBtn');
  const messageBtn = $('userPublicMessageBtn');
  const followHint = $('userPublicFollowHint');
  const hero = $('userPublicHero');
  const bioCard = $('userPublicBioCard');
  const globalState = $('userPublicState');

  if (globalState) globalState.hidden = true;
  if (hero) hero.hidden = false;
  if (bioCard) bioCard.hidden = false;

  // Nome
  nameEl.textContent = name || 'Utente';

  // Avatar
  if (profile.avatarUrl) {
    avatar.src = profile.avatarUrl;
    avatar.hidden = false;
    avatarFallback.hidden = true;
  } else {
    avatar.hidden = true;
    avatarFallback.textContent = getInitials(name);
    avatarFallback.hidden = false;
  }

  // Ruolo
  const roleLabel = getRoleLabel(role);
  if (roleLabel) {
    roleEl.textContent = roleLabel;
    roleEl.hidden = false;
  } else {
    roleEl.hidden = true;
  }

  // Località
  const location = [profile.city, profile.region]
    .filter(Boolean)
    .join(', ');
  if (location) {
    metaEl.textContent = location;
    metaEl.hidden = false;
  } else {
    metaEl.hidden = true;
  }

  // Bio
  bioEl.textContent = profile.bio || 'Nessuna bio disponibile.';

  // Statistiche
  followersEl.textContent = followersCount;
  followingEl.textContent = followingCount;

  // Follow button
  if (!isSelf) {
    followBtn.hidden = false;
    followBtn.textContent = isFollowing ? 'Smetti di seguire' : 'Segui';

    followHint.textContent = isFollowing
      ? 'Stai seguendo questo utente.'
      : 'Segui questo utente per restare aggiornato sulle sue attività.';
    followHint.hidden = false;
  } else {
    followBtn.hidden = true;
    followHint.hidden = true;
  }

  // Messaggia
  if (!isSelf && canReceiveMessages) {
    messageBtn.hidden = false;
  } else {
    messageBtn.hidden = true;
  }
}

// ----------------------
// Rendering Attività
// ----------------------

export function renderActivityList(activities = []) {
  const listEl = $('userPublicActivityList');
  const emptyEl = $('userPublicActivityEmpty');
  const privacyEl = $('userPublicActivityPrivacy');
  const stateEl = $('userPublicActivityState');
  const cardEl = $('userPublicActivityCard');

  if (stateEl) stateEl.hidden = true;
  if (privacyEl) privacyEl.hidden = true;
  if (cardEl) cardEl.hidden = false;

  listEl.innerHTML = '';

  if (!activities.length) {
    emptyEl.hidden = false;
    listEl.hidden = true;
    return;
  }

  emptyEl.hidden = true;
  listEl.hidden = false;

  activities.forEach((activity) => {
    const li = document.createElement('li');
    li.className = 'user-public-activity-item';

    li.innerHTML = `
      <div class="user-public-activity-top">
        <span class="user-public-activity-type">
          ${getActivityLabel(activity.type)}
        </span>
        <span class="user-public-activity-date">
          ${formatDate(activity.createdAt)}
        </span>
      </div>
      <p class="user-public-activity-title">
        ${activity.payload?.title || ''}
      </p>
    `;

    listEl.appendChild(li);
  });
}

// ----------------------
// Stato bacheca privata
// ----------------------

export function renderActivityPrivate() {
  const privacyEl = $('userPublicActivityPrivacy');
  const stateEl = $('userPublicActivityState');
  const listEl = $('userPublicActivityList');
  const emptyEl = $('userPublicActivityEmpty');
  const cardEl = $('userPublicActivityCard');

  if (stateEl) stateEl.hidden = true;
  if (listEl) listEl.hidden = true;
  if (emptyEl) emptyEl.hidden = true;
  if (cardEl) cardEl.hidden = false;

  privacyEl.hidden = false;
}

// ----------------------
// Stato di caricamento attività
// ----------------------

export function renderActivityLoading() {
  const stateEl = $('userPublicActivityState');
  if (stateEl) {
    stateEl.textContent = 'Caricamento attività...';
    stateEl.hidden = false;
  }
  }
