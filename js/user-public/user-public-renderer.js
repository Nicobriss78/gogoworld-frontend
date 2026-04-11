/**
 * user-public-renderer.js
 * Rendering puro della pagina user-public.
 */

const $ = (id) => document.getElementById(id);

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitials(name = "") {
  return String(name)
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";
}

function getRoleLabel(role) {
  if (role === "organizer") return "Organizzatore";
  if (role === "admin") return "Amministratore";
  return "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function activityTypeLabel(type) {
  switch (type) {
    case "created_event":
      return "Evento creato";
    case "joined_event":
      return "Partecipa";
    case "will_join_event":
      return "Parteciperà";
    case "attended_event":
      return "Ha partecipato";
    case "review_event":
      return "Recensione";
    case "level_up":
      return "Livello";
    default:
      return "Attività";
  }
}

function activityTitle(activity) {
  const payload = activity?.payload || {};
  const title = payload?.title || "evento";

  switch (activity?.type) {
    case "created_event":
      return `Ha creato un nuovo evento: ${title}`;
    case "joined_event":
      return `Partecipa a: ${title}`;
    case "will_join_event":
      return `Parteciperà a: ${title}`;
    case "attended_event":
      return `Ha partecipato a: ${title}`;
    case "review_event":
      return `Ha scritto una recensione${payload?.rating ? ` (${payload.rating}★)` : ""}`;
    case "level_up":
      return `Ha raggiunto il livello ${payload?.to ?? ""}`.trim();
    default:
      return "Attività";
  }
}

function activityMeta(activity) {
  const payload = activity?.payload || {};

  if (activity?.type === "review_event" && payload?.title) {
    return `Evento: ${payload.title}`;
  }

  if (
    (activity?.type === "created_event" ||
      activity?.type === "joined_event" ||
      activity?.type === "will_join_event" ||
      activity?.type === "attended_event") &&
    payload?.title
  ) {
    return `Evento: ${payload.title}`;
  }

  return "";
}
function getActivityEventId(activity) {
  const raw = activity?.event;
  if (!raw) return "";

  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object") {
    return String(raw._id || raw.id || "").trim();
  }

  return "";
}
export function renderGlobalState(message, variant = "info") {
  const stateEl = $("userPublicState");
  if (!stateEl) return;

  stateEl.textContent = String(message || "");
  stateEl.className = `user-public-state user-public-state--${variant}`;
  stateEl.hidden = false;
}

export function hideGlobalState() {
  const stateEl = $("userPublicState");
  if (!stateEl) return;

  stateEl.hidden = true;
  stateEl.textContent = "";
}

export function renderProfile(profile, { isSelf = false } = {}) {
  const heroEl = $("userPublicHero");
  const bioCardEl = $("userPublicBioCard");

  const titleEl = $("userPublicTitle");
  const headerMetaEl = $("userPublicHeaderMeta");

  const avatarEl = $("userPublicAvatar");
  const avatarFallbackEl = $("userPublicAvatarFallback");

  const nameEl = $("userPublicName");
  const roleEl = $("userPublicRole");
  const metaEl = $("userPublicMeta");
  const bioEl = $("userPublicBio");

  const followersEl = $("userPublicFollowersCount");
  const followingEl = $("userPublicFollowingCount");

  const followBtn = $("userPublicFollowBtn");
  const messageBtn = $("userPublicMessageBtn");
  const followHint = $("userPublicFollowHint");

  if (!profile || typeof profile !== "object") {
    renderGlobalState("Profilo non disponibile.", "error");
    return;
  }

  hideGlobalState();

  if (heroEl) heroEl.hidden = false;
  if (bioCardEl) bioCardEl.hidden = false;

  const name = profile.name || "Utente";
  const roleLabel = getRoleLabel(profile.role);

  if (titleEl) titleEl.textContent = name;
  document.title = `${name} • GoGoWorld.life`;

  if (nameEl) nameEl.textContent = name;

  const location = [profile.profile?.city, profile.profile?.region]
    .filter(Boolean)
    .join(", ");

  if (metaEl) {
    metaEl.textContent = location;
    metaEl.hidden = !location;
  }

  if (headerMetaEl) {
    const headerBits = [location, roleLabel].filter(Boolean).join(" • ");
    headerMetaEl.textContent = headerBits;
    headerMetaEl.hidden = !headerBits;
  }

  if (roleEl) {
    roleEl.textContent = roleLabel;
    roleEl.hidden = !roleLabel;
  }

  if (bioEl) {
    bioEl.textContent = profile.profile?.bio || "Nessuna bio disponibile.";
  }

  if (followersEl) followersEl.textContent = String(profile.followersCount ?? 0);
  if (followingEl) followingEl.textContent = String(profile.followingCount ?? 0);

  if (avatarEl && avatarFallbackEl) {
    const avatarUrl = profile.profile?.avatarUrl || "";

    if (avatarUrl) {
      avatarEl.src = avatarUrl;
      avatarEl.alt = `Avatar di ${name}`;
      avatarEl.hidden = false;
      avatarFallbackEl.hidden = true;

      avatarEl.onerror = () => {
        avatarEl.hidden = true;
        avatarFallbackEl.textContent = getInitials(name);
        avatarFallbackEl.hidden = false;
      };
    } else {
      avatarEl.hidden = true;
      avatarFallbackEl.textContent = getInitials(name);
      avatarFallbackEl.hidden = false;
    }
  }

  const isFollowing = !!profile.isFollowing;
  const canReceiveMessages = !!profile.canReceiveMessages;

  if (followBtn) {
    if (isSelf) {
      followBtn.hidden = true;
    } else {
      followBtn.hidden = false;
      followBtn.dataset.following = isFollowing ? "1" : "0";
      followBtn.textContent = isFollowing ? "Smetti di seguire" : "Segui";
    }
  }

  if (followHint) {
    if (isSelf) {
      followHint.hidden = true;
      followHint.textContent = "";
    } else {
      followHint.hidden = false;
      followHint.textContent = isFollowing
        ? "Stai seguendo questo utente."
        : "Segui questo utente per restare aggiornato sulle sue attività.";
    }
  }

  if (messageBtn) {
    messageBtn.hidden = isSelf || !canReceiveMessages;
  }
}

export function setFollowUi({
  isFollowing,
  followersCount,
}) {
  const followBtn = $("userPublicFollowBtn");
  const followersEl = $("userPublicFollowersCount");
  const followHint = $("userPublicFollowHint");

  if (followBtn) {
    followBtn.dataset.following = isFollowing ? "1" : "0";
    followBtn.textContent = isFollowing ? "Smetti di seguire" : "Segui";
  }

  if (followersEl && Number.isFinite(followersCount)) {
    followersEl.textContent = String(followersCount);
  }

  if (followHint) {
    followHint.hidden = false;
    followHint.textContent = isFollowing
      ? "Stai seguendo questo utente."
      : "Segui questo utente per restare aggiornato sulle sue attività.";
  }
}

export function renderActivityLoading() {
  const cardEl = $("userPublicActivityCard");
  const stateEl = $("userPublicActivityState");
  const privacyEl = $("userPublicActivityPrivacy");
  const emptyEl = $("userPublicActivityEmpty");
  const listEl = $("userPublicActivityList");

  if (cardEl) cardEl.hidden = false;
  if (stateEl) {
    stateEl.hidden = false;
    stateEl.textContent = "Caricamento attività...";
  }
  if (privacyEl) privacyEl.hidden = true;
  if (emptyEl) emptyEl.hidden = true;
  if (listEl) {
    listEl.hidden = true;
    listEl.innerHTML = "";
  }
}

export function renderActivityPrivate({ isSelf = false } = {}) {
  const cardEl = $("userPublicActivityCard");
  const stateEl = $("userPublicActivityState");
  const privacyEl = $("userPublicActivityPrivacy");
  const emptyEl = $("userPublicActivityEmpty");
  const listEl = $("userPublicActivityList");

  if (cardEl) cardEl.hidden = false;
  if (stateEl) stateEl.hidden = true;
  if (emptyEl) emptyEl.hidden = true;
  if (listEl) {
    listEl.hidden = true;
    listEl.innerHTML = "";
  }

  if (privacyEl) {
    privacyEl.hidden = false;
    privacyEl.textContent = isSelf
      ? "La tua bacheca attività non è disponibile in questo momento."
      : "Questa bacheca è visibile solo ai follower.";
  }
}

export function renderActivityEmpty({ isSelf = false } = {}) {
  const cardEl = $("userPublicActivityCard");
  const stateEl = $("userPublicActivityState");
  const privacyEl = $("userPublicActivityPrivacy");
  const emptyEl = $("userPublicActivityEmpty");
  const listEl = $("userPublicActivityList");

  if (cardEl) cardEl.hidden = false;
  if (stateEl) stateEl.hidden = true;
  if (privacyEl) privacyEl.hidden = true;

  if (listEl) {
    listEl.hidden = true;
    listEl.innerHTML = "";
  }

  if (emptyEl) {
    emptyEl.hidden = false;
    emptyEl.textContent = isSelf
      ? "Ancora nessuna attività registrata sulla tua bacheca."
      : "Nessuna attività da mostrare.";
  }
}

export function renderActivityList(items = []) {
  const cardEl = $("userPublicActivityCard");
  const stateEl = $("userPublicActivityState");
  const privacyEl = $("userPublicActivityPrivacy");
  const emptyEl = $("userPublicActivityEmpty");
  const listEl = $("userPublicActivityList");

  if (cardEl) cardEl.hidden = false;
  if (stateEl) stateEl.hidden = true;
  if (privacyEl) privacyEl.hidden = true;
  if (emptyEl) emptyEl.hidden = true;

  if (!listEl) return;

  listEl.innerHTML = "";

  if (!Array.isArray(items) || items.length === 0) {
    listEl.hidden = true;
    return;
  }

  listEl.hidden = false;

  for (const activity of items) {
    const li = document.createElement("li");
    li.className = "user-public-activity-item";

    const title = activityTitle(activity);
    const meta = activityMeta(activity);
    const typeLabel = activityTypeLabel(activity?.type);
    const dateLabel = formatDate(activity?.createdAt);

    li.innerHTML = `
      <div class="user-public-activity-top">
        <span class="user-public-activity-type">${escapeHtml(typeLabel)}</span>
        ${dateLabel ? `<span class="user-public-activity-date">${escapeHtml(dateLabel)}</span>` : ""}
      </div>
      <p class="user-public-activity-title">${escapeHtml(title)}</p>
      ${meta ? `<p class="user-public-activity-meta">${escapeHtml(meta)}</p>` : ""}
    `;

    listEl.appendChild(li);
  }
    }
