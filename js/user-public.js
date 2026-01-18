// js/user-public.js — Profilo pubblico + bacheca attività (stile social B)
import { apiGet, apiPost, apiDelete } from "./api.js";

const BACKEND_ORIGIN = "https://gogoworld-api.onrender.com";

const $ = (sel) => document.querySelector(sel);
const alerts = $("#alerts");
const QS = new URLSearchParams(location.search);
const IS_SELF = QS.get("self") === "1";

function showAlert(msg, type = "error", ms = 3000) {
  const div = document.createElement("div");
  div.className = `alert ${type}`;
  div.textContent = msg;
  alerts.appendChild(div);
  if (ms) setTimeout(() => div.remove(), ms);
}

function getUserIdFromUrl() {
  const qs = new URLSearchParams(location.search);
  return qs.get("userId") || "";
}



// --- rendering profilo ---

function renderProfile(profile) {
  const avatarEl = $("#profileAvatar");
  const nameEl = $("#profileName");
  const metaEl = $("#profileMeta");
  const roleEl = $("#profileRole");
  const bioEl = $("#profileBio");
  const followersEl = $("#followersCount");
  const followingEl = $("#followingCount");
  const followBtn = $("#followBtn");

  nameEl.textContent = profile.name || "Utente";
  document.title = `${profile.name || "Profilo"} • GoGoWorld.life`;

  const parts = [];
  if (profile.profile?.city) parts.push(profile.profile.city);
  if (profile.profile?.region) parts.push(profile.profile.region);
  metaEl.textContent = parts.join(" • ");

  if (profile.role === "organizer") {
    roleEl.textContent = "Organizzatore";
    roleEl.style.display = "inline-block";
  } else if (profile.role === "admin") {
    roleEl.textContent = "Amministratore";
    roleEl.style.display = "inline-block";
  } else {
    roleEl.textContent = "";
    roleEl.style.display = "none";
  }

  if (profile.profile?.avatarUrl) {
    avatarEl.src = profile.profile.avatarUrl.startsWith("http")
      ? profile.profile.avatarUrl
      : BACKEND_ORIGIN + profile.profile.avatarUrl;
    avatarEl.style.display = "inline-block";
  } else {
    avatarEl.style.display = "none";
  }

  if (profile.profile?.bio) {
    bioEl.textContent = profile.profile.bio;
  } else {
    bioEl.textContent = "Nessuna bio disponibile.";
  }

followersEl.textContent = profile.followersCount ?? 0;
  followingEl.textContent = profile.followingCount ?? 0;

  const isFollowing = !!profile.isFollowing;
  followBtn.dataset.following = isFollowing ? "1" : "0";
  followBtn.textContent = isFollowing ? "Smetti di seguire" : "Segui";


  // Se sto guardando me stesso (self=1 nell'URL) → niente bottone Follow
  const qs = new URLSearchParams(location.search);
  const isSelf = qs.get("self") === "1";
  if (isSelf) {
    followBtn.style.display = "none";
  }
}

// --- UI helper follow/unfollow ---
function updateFollowUI(isFollowing, followersCount, followingCount) {
  const btn = $("#followBtn");
  const hint = $("#followHint");
  const followersEl = $("#followersCount");
  const followingEl = $("#followingCount");

  if (!btn) return;

  btn.dataset.following = isFollowing ? "1" : "0";
  btn.textContent = isFollowing ? "Smetti di seguire" : "Segui";

  if (hint) {
    hint.textContent = isFollowing
      ? "Stai seguendo questo utente."
      : "Segui questo utente per vedere la sua bacheca.";
  }

  if (followersEl) followersEl.textContent = followersCount ?? 0;
  if (followingEl) followingEl.textContent = followingCount ?? 0;
}

// --- rendering attività ---

function iconForType(type) {
  switch (type) {
    case "created_event":
      return "📌";
    case "joined_event":
      return "🗓️";
    case "attended_event":
      return "✅";
    case "review_event":
      return "⭐";
    case "level_up":
      return "🚀";
    default:
      return "•";
  }
}

function labelForType(type, payload) {
  switch (type) {
    case "created_event":
      return `Ha creato un nuovo evento: ${payload?.title || "evento"}`;
    case "joined_event":
      return `Partecipa a: ${payload?.title || "un evento"}`;
    case "attended_event":
      return `Ha partecipato a: ${payload?.title || "un evento"}`;
    case "review_event":
      return `Ha scritto una recensione (${payload?.rating || "★"}★)`;
    case "level_up":
      return `Ha raggiunto il livello ${payload?.to || ""}`;
    default:
      return "Attività";
  }
}

function renderActivityList(items) {
  const listEl = $("#activityList");
  const emptyEl = $("#activityEmpty");
  const privateEl = $("#activityPrivate");

  privateEl.style.display = "none";

listEl.innerHTML = "";
  if (!items || !items.length) {
    emptyEl.textContent = IS_SELF
      ? "Ancora nessuna attività registrata sulla tua bacheca."
      : "Nessuna attività da mostrare.";
    emptyEl.style.display = "block";
    return;
  }
  emptyEl.style.display = "none";

for (const item of items) {
    const li = document.createElement("li");
    li.className = "activity-item";

    const icon = document.createElement("div");
    icon.className = "activity-icon";
    icon.textContent = iconForType(item.type);

    const payload = item.payload || item.meta || {};
    const main = document.createElement("div");
    main.className = "activity-main";

    const title = document.createElement("div");
    title.className = "activity-title";
    title.textContent = labelForType(item.type, payload);

    const meta = document.createElement("div");
    meta.className = "activity-meta muted";
    const date = item.createdAt ? new Date(item.createdAt) : null;
    const dateStr = date ? date.toLocaleString("it-IT") : "";
    meta.textContent = dateStr;

    main.appendChild(title);
    if (dateStr) main.appendChild(meta);

    li.appendChild(icon);
    li.appendChild(main);
    listEl.appendChild(li);
  }

}

// --- LOAD ---

async function loadAll(userId) {
  // Profilo pubblico
  const profRes = await apiGet(`/users/${userId}/public`);
  if (!profRes.data || profRes.data.ok === false) {
    showAlert(profRes.data?.error || "Impossibile caricare il profilo");
    return;
  }
  renderProfile(profRes.data.data);

  // Bacheca attività
  const actRes = await apiGet(`/users/${userId}/activity`);
  if (actRes.status === 403 && actRes.data?.error === "activity_private") {
    $("#activityPrivate").style.display = "block";
    $("#activityList").innerHTML = "";
    $("#activityEmpty").style.display = "none";
    return;
  }
  if (!actRes.data || actRes.data.ok === false) {
    showAlert(actRes.data?.error || "Impossibile caricare la bacheca");
    return;
  }
  renderActivityList(actRes.data.data || []);
}

// --- FOLLOW / UNFOLLOW ---

async function onFollowClick(userId) {
  const btn = $("#followBtn");
  const followersEl = $("#followersCount");
  const followingEl = $("#followingCount");

  if (!btn) return;

  const currently = btn.dataset.following === "1";

  // Leggo i valori attuali dai contatori
  const currentFollowers = followersEl ? parseInt(followersEl.textContent, 10) || 0 : 0;
  const currentFollowing = followingEl ? parseInt(followingEl.textContent, 10) || 0 : 0;

  try {
    if (currently) {
      const res = await apiDelete(`/users/${userId}/follow`);
      if (!res.data?.ok) {
        showAlert(res.data?.error || "Impossibile smettere di seguire");
        return;
      }

      // L'utente ha un follower in meno (io)
      const newFollowers = Math.max(0, currentFollowers - 1);
      updateFollowUI(false, newFollowers, currentFollowing);

    } else {
      const res = await apiPost(`/users/${userId}/follow`);
      if (!res.data?.ok) {
        showAlert(res.data?.error || "Impossibile seguire questo utente");
        return;
      }

      // L'utente ha un follower in più (io)
      const newFollowers = currentFollowers + 1;
      updateFollowUI(true, newFollowers, currentFollowing);
    }

    // Ricarico in background per allineare tutto con il backend
    setTimeout(() => loadAll(userId), 150);
  } catch (e) {
    console.warn(e);
    showAlert("Errore di rete, riprova più tardi.");
  }
}

// --- bootstrap ---

document.addEventListener("DOMContentLoaded", () => {
  const userId = getUserIdFromUrl();
  if (!userId) {
    showAlert("Profilo non valido (manca userId nell'URL)");
    return;
  }

const qs = new URLSearchParams(location.search);
  const isSelf = qs.get("self") === "1";
  const ret = qs.get("returnTo");

  const backBtn = $("#btnBack");
  if (backBtn) {
    if (isSelf) {
      // Se sto guardando la mia bacheca, tornare al mio profilo
      backBtn.textContent = "Torna al mio profilo";

      // Di base torna al profilo
      let href = "/profile.html";

      // Se ho un contesto di ritorno, lo propago
      if (ret) {
        href += `?returnTo=${encodeURIComponent(ret)}`;
      }

      backBtn.href = href;
      backBtn.onclick = null;
    } else if (history.length > 1) {
      backBtn.onclick = (e) => {
        e.preventDefault();
        history.back();
      };
    }
  }

  loadAll(userId);

  const followBtn = $("#followBtn");
  if (!isSelf && followBtn) {
    followBtn.addEventListener("click", () => onFollowClick(userId));
  }
});
