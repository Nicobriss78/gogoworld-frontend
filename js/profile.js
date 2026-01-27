// js/profile.js — C1 Profilo (UI)
import { getMyProfile, updateMyProfile, whoami, apiGet } from "./api.js";
// Fallback assoluto al backend Render se il proxy Netlify /api fallisce (404)
// Mantieni sincronizzato questo valore con netlify.toml
const BACKEND_ORIGIN = "https://gogoworld-api.onrender.com";
const API_PREFIX = "/api";

// --- helpers UI ---
const $ = (sel) => document.querySelector(sel);
const alerts = $("#alerts");

function showAlert(msg, type = "success", ms = 2500) {
  const div = document.createElement("div");
  div.className = `alert ${type}`;
  div.textContent = msg;
  alerts.appendChild(div);
  if (ms) setTimeout(() => div.remove(), ms);
}
function showInfo(msg) {
  const div = document.createElement("div");
  div.className = "alert info";
  div.textContent = msg;
  alerts.appendChild(div);
  return () => div.remove(); // ritorna funzione di cleanup
}

function parseCSV(input) {
  if (!input) return [];
  return input.split(",").map(s => s.trim()).filter(Boolean).slice(0, 50);
}
function parseLines(input) {
  if (!input) return [];
  return input.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 50);
}

function joinCSV(arr) {
  return Array.isArray(arr) ? arr.join(", ") : "";
}
function joinLines(arr) {
  return Array.isArray(arr) ? arr.join("\n") : "";
}
// --- setta il bottone "Torna alla mia pagina" ---
async function setReturnButton() {
  const btn = document.getElementById("btnReturn");
  if (!btn) return;
  const qs = new URLSearchParams(location.search);
  const ret = qs.get("returnTo");
  if (ret) { btn.href = ret; return; }
  try {
    const me = await whoami(localStorage.getItem("token"));
    const role = String(me?.user?.role || "").toLowerCase();
    btn.href = role === "organizer" || role === "admin" ? "/organizzatore.html" : "/partecipante.html";
  } catch {
    btn.href = "/partecipante.html";
  }
}
// --- setta il bottone "Vedi la mia bacheca pubblica" ---
async function setMyPublicBoardLink() {
  // Aggancia QUALSIASI bottone “bacheca pubblica” (anche se non ha l'id)
  const candidates = [
    ...document.querySelectorAll('#btnMyPublic, [data-my-public="1"], .js-my-public-board'),
    ...Array.from(document.querySelectorAll("a,button")).filter(el =>
      (el.textContent || "").trim().toLowerCase() === "vedi la mia bacheca pubblica"
    )
  ];

  // dedup
  const uniq = Array.from(new Set(candidates));
  if (!uniq.length) return;

  try {
    const me = await whoami(localStorage.getItem("token"));
    const id = me?.user?._id;

    if (!id) {
      uniq.forEach(el => (el.style.display = "none"));
      return;
    }

    const qs = new URLSearchParams(location.search);
    const ret = qs.get("returnTo");

    let href = `/pages/user-public.html?userId=${encodeURIComponent(id)}&self=1`;
    if (ret) href += `&returnTo=${encodeURIComponent(ret)}`;

    uniq.forEach(el => {
      // se è un <a>, metto href
      if (el.tagName === "A") {
        el.href = href;
        return;
      }
      // se è un <button> (o altro), intercetto click e navigo
      el.addEventListener("click", (e) => {
        e.preventDefault();
        location.href = href;
      });
    });

  } catch (e) {
    console.warn(e);
    uniq.forEach(el => (el.style.display = "none"));
  }
}



// --- nodes ---
const basicForm = $("#basicForm");
const privacyForm = $("#privacyForm");
const reloadBtn = $("#reloadBtn");
const profileView = document.getElementById("profileView");
const profileEdit = document.getElementById("profileEdit");
const btnEditProfile = document.getElementById("btnEditProfile");
const btnCancelEdit = document.getElementById("btnCancelEdit");

const avatarView = document.getElementById("avatarView");
const viewNickname = document.getElementById("viewNickname");
const viewPlace = document.getElementById("viewPlace");
const viewBio = document.getElementById("viewBio");
const viewLanguages = document.getElementById("viewLanguages");
const viewInterests = document.getElementById("viewInterests");
const viewSocials = document.getElementById("viewSocials");

const btnMyPublic2 = document.getElementById("btnMyPublic2");

// View-mode: connessioni
const myFollowersCount_view = document.getElementById("myFollowersCount_view");
const myFollowingCount_view = document.getElementById("myFollowingCount_view");
const btnShowFollowers_view = document.getElementById("btnShowFollowers_view");
const btnShowFollowing_view = document.getElementById("btnShowFollowing_view");

const nickname = $("#nickname");
const birthYear = $("#birthYear");
const region = $("#region");
const city = $("#city");
const avatarUrl = $("#avatarUrl");
const languages = $("#languages");
const socials = $("#socials");
const interests = $("#interests");
const bio = $("#bio");
// Gestione avatar file locale
const avatarFile = $("#avatarFile");
const avatarPreview = $("#avatar-preview");
function setAvatarPreview(url) {
  if (!avatarPreview || !url) return;
  const isUploads = url.startsWith("/uploads/");
  const isApiUploads = url.startsWith("/api/uploads/");
  // normalizza su /api
  let src = isUploads ? (API_PREFIX + url) : url;
  if (!isUploads && !isApiUploads && !/^https?:\/\//i.test(url)) {
    // caso edge: percorso relativo non previsto
    src = API_PREFIX + "/" + url.replace(/^\/+/, "");
  }
  avatarPreview.onerror = () => {
    // fallback diretto al dominio Render
    const path = src.startsWith(API_PREFIX) ? src : (API_PREFIX + src);
    avatarPreview.onerror = null; // evita loop
    avatarPreview.src = BACKEND_ORIGIN + path;
  };
  avatarPreview.src = src;
  avatarPreview.style.display = "inline-block";
}


avatarFile?.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (!f || !avatarPreview) return;
  const tmp = URL.createObjectURL(f);
  avatarPreview.onload = () => URL.revokeObjectURL(tmp);
  avatarPreview.src = tmp;
  avatarPreview.style.display = "inline-block";
});

const optInDM = $("#optInDM");
const dmsFrom = $("#dmsFrom");

// token
const token = localStorage.getItem("token");
function showViewMode() {
  if (profileView) profileView.style.display = "block";
  if (profileEdit) profileEdit.style.display = "none";
}

function showEditMode() {
  if (profileView) profileView.style.display = "none";
  if (profileEdit) profileEdit.style.display = "block";
}

function renderProfileView(p) {
  if (!p) p = {};

  // avatar
  if (avatarView) {
    if (p.avatarUrl) {
      // usa la stessa logica di preview, ma su avatarView
      const tmp = document.getElementById("avatar-preview"); // riuso funzione già esistente
      // setAvatarPreview agisce su avatarPreview, quindi qui copiamo la logica in modo semplice:
      const isUploads = p.avatarUrl.startsWith("/uploads/");
      const isApiUploads = p.avatarUrl.startsWith("/api/uploads/");
      let src = isUploads ? (API_PREFIX + p.avatarUrl) : p.avatarUrl;
      if (!isUploads && !isApiUploads && !/^https?:\/\//i.test(p.avatarUrl)) {
        src = API_PREFIX + "/" + p.avatarUrl.replace(/^\/+/, "");
      }
      avatarView.onerror = () => {
        const path = src.startsWith(API_PREFIX) ? src : (API_PREFIX + src);
        avatarView.onerror = null;
        avatarView.src = BACKEND_ORIGIN + path;
      };
      avatarView.src = src;
      avatarView.style.display = "inline-block";
    } else {
      avatarView.style.display = "none";
    }
  }

  const nick = (p.nickname || "—").trim();
  if (viewNickname) viewNickname.textContent = nick || "—";

  const placeParts = [];
  if (p.city) placeParts.push(p.city);
  if (p.region) placeParts.push(p.region);
  if (viewPlace) {
    if (placeParts.length) {
      viewPlace.textContent = placeParts.join(" • ");
      viewPlace.style.display = "block";
    } else {
      viewPlace.style.display = "none";
    }
  }

  if (viewBio) {
    const b = (p.bio || "").trim();
    if (b) {
      viewBio.textContent = b;
      viewBio.style.display = "block";
    } else viewBio.style.display = "none";
  }

  if (viewLanguages) {
    const l = joinCSV(p.languages).trim();
    if (l) {
      viewLanguages.textContent = "Lingue: " + l;
      viewLanguages.style.display = "block";
    } else viewLanguages.style.display = "none";
  }

  if (viewInterests) {
    const i = joinCSV(p.interests).trim();
    if (i) {
      viewInterests.textContent = "Interessi: " + i;
      viewInterests.style.display = "block";
    } else viewInterests.style.display = "none";
  }

  if (viewSocials) {
    const s = Array.isArray(p.socials) ? p.socials : [];
    if (s.length) {
      viewSocials.innerHTML = "";
      for (const line of s) {
        const t = String(line || "").trim();
        if (!t) continue;
        const div = document.createElement("div");
        if (/^https?:\/\//i.test(t)) {
          const a = document.createElement("a");
          a.href = t;
          a.target = "_blank";
          a.rel = "noopener";
          a.textContent = t;
          div.appendChild(a);
        } else {
          div.textContent = t;
        }
        viewSocials.appendChild(div);
      }
      viewSocials.style.display = "block";
    } else {
      viewSocials.style.display = "none";
    }
  }
}

// --- load profile ---
async function loadProfile() {
  const res = await getMyProfile(token);
  if (!res || res.ok === false) {
    showAlert(res?.message || "Impossibile caricare il profilo", "error", 3500);
    return;
  }
  const p = res.data || {};
  renderProfileView(p);
  nickname.value = p.nickname || "";
  birthYear.value = p.birthYear || "";
  region.value = p.region || "";
  city.value = p.city || "";
avatarUrl.value = p.avatarUrl || "";
  
  if (avatarPreview) {
if (p.avatarUrl) {
  setAvatarPreview(p.avatarUrl);
} else {
  avatarPreview.style.display = "none";
}

  }

  bio.value = p.bio || "";

  languages.value = joinCSV(p.languages);
  interests.value = joinCSV(p.interests);
  socials.value = joinLines(p.socials);

  optInDM.checked = !!(p.privacy && p.privacy.optInDM);
  dmsFrom.value = (p.privacy && p.privacy.dmsFrom) || "everyone";
}

// --- submit basic ---
basicForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  // Validazione client birthYear (ora *dentro* al submit)
if (birthYear.value) {
  const y = Number(birthYear.value);
  if (!Number.isInteger(y) || y < 1900 || y > 2100) {
    showAlert("Anno non valido (1900–2100)", "error", 3500);
    return; // <-- ora è legale: ferma solo il submit
  }
}
// Se c'è un file da caricare, invialo prima
if (avatarFile?.files?.[0]) {
  const removeInfo = showInfo("📤 Caricamento avatar in corso…");
  try {
    const fd = new FormData();
    fd.append("avatar", avatarFile.files[0]);
    const resp = await fetch("/api/profile/me/avatar", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: fd
    });
    const out = await resp.json();
    removeInfo();
if (out?.ok && out.avatarUrl) {
const savedUrl = out.avatarUrl;
avatarUrl.value = savedUrl;
setAvatarPreview(savedUrl);

      showAlert("✅ Avatar aggiornato con successo");

    } else if (out?.error) {
      showAlert("❌ Upload avatar fallito: " + out.error, "error", 4000);
      return; // interrompi submit se upload fallisce
    } else {
      showAlert("❌ Upload avatar fallito", "error", 4000);
      return;
    }
  } catch (err) {
    removeInfo();
    showAlert("❌ Errore di rete durante l'upload", "error", 4000);
    return;
  }
}


  const payload = {
    nickname: nickname.value.trim() || null,
    birthYear: birthYear.value ? Number(birthYear.value) : undefined,
    region: region.value.trim() || null,
    city: city.value.trim() || null,
    avatarUrl: avatarUrl.value.trim() || null,
    bio: bio.value.trim() || null,
    languages: parseCSV(languages.value),
    interests: parseCSV(interests.value),
    socials: parseLines(socials.value),
  };
  // ripulisci null/undefined vuoti
  Object.keys(payload).forEach(k => {
    if (payload[k] === null || payload[k] === "" ||
        (Array.isArray(payload[k]) && payload[k].length === 0)) {
      delete payload[k];
    }
  });

  const res = await updateMyProfile(payload, token);
  if (!res || res.ok === false) {
    showAlert(res?.message || "Salvataggio non riuscito", "error", 3500);
    return;
  }
  showAlert("Profilo aggiornato");
  await loadProfile();
});

// --- submit privacy ---
privacyForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    privacy: {
      optInDM: !!optInDM.checked,
      dmsFrom: dmsFrom.value || "everyone",
    }
  };
  const res = await updateMyProfile(payload, token);
  if (!res || res.ok === false) {
    showAlert(res?.message || "Impostazioni non salvate", "error", 3500);
    return;
  }
  showAlert("Privacy aggiornata");
});
async function loadFollowersList_view() {
  // temporaneamente reindirizzo gli ID view verso quelli originali
  // (clone semplice: copio il contenuto in view dopo il load originale)
  await loadFollowersList();
  const srcBox = document.getElementById("followersBox");
  const dstBox = document.getElementById("followersBox_view");
  if (srcBox && dstBox) {
    dstBox.innerHTML = srcBox.innerHTML;
    dstBox.style.display = srcBox.style.display;
    dstBox.dataset.open = srcBox.dataset.open || "0";
  }
}

async function loadFollowingList_view() {
  await loadFollowingList();
  const srcBox = document.getElementById("followingBox");
  const dstBox = document.getElementById("followingBox_view");
  if (srcBox && dstBox) {
    dstBox.innerHTML = srcBox.innerHTML;
    dstBox.style.display = srcBox.style.display;
    dstBox.dataset.open = srcBox.dataset.open || "0";
  }
}

// --- carica i conteggi follower/seguiti nella card "Connessioni" ---
async function loadFollowStats() {
  // aggiorna conteggi follower/seguiti (card Connessioni)
  const followersEl = document.getElementById("myFollowersCount_view");
  const followingEl = document.getElementById("myFollowingCount_view");
  if (!followersEl || !followingEl) return;

  try {
    const me = await whoami(localStorage.getItem("token"));
    const id = me?.user?._id;
    if (!id) return;

    // usa api.js (token auto)
    const res = await apiGet(`/users/${id}/public`);
    if (!res || res.ok === false) return;

    const data = res.data || {};
    followersEl.textContent = data.followersCount ?? 0;
    followingEl.textContent = data.followingCount ?? 0;
  } catch (e) {
    console.warn("Impossibile caricare i dati follower/seguiti", e);
  }
}

// --- liste follower/seguiti nel profilo ---

async function loadFollowersList() {
  const box = document.getElementById("followersBox");
  const listEl = document.getElementById("followersList");
  const emptyEl = document.getElementById("followersEmpty");
  const otherBox = document.getElementById("followingBox");
  const otherEmpty = document.getElementById("followingEmpty");

  if (!box || !listEl || !emptyEl) return;

  // toggle: se è già aperto, chiudi
  if (box.dataset.open === "1") {
    box.style.display = "none";
    box.dataset.open = "0";
    return;
  }

  // chiudi l'altra box
  if (otherBox) {
    otherBox.style.display = "none";
    otherBox.dataset.open = "0";
    if (otherEmpty) otherEmpty.style.display = "none";
  }

  box.style.display = "block";
  box.dataset.open = "1";
  listEl.innerHTML = "";
  emptyEl.style.display = "none";

  const liLoading = document.createElement("li");
  liLoading.textContent = "Caricamento…";
  liLoading.className = "muted";
  listEl.appendChild(liLoading);

  try {
    const me = await whoami(localStorage.getItem("token"));
    const id = me?.user?._id;
    if (!id) {
      listEl.innerHTML = "";
      emptyEl.textContent = "Devi essere loggato per vedere chi ti segue.";
      emptyEl.style.display = "block";
      return;
    }

    const json = await apiGet(`/users/${id}/followers`);

    listEl.innerHTML = "";
    if (!json || json.ok === false) {
      emptyEl.textContent = "Impossibile caricare i follower.";
      emptyEl.style.display = "block";
      return;
    }

    const arr = json.data || [];
    if (!arr.length) {
      emptyEl.textContent = "Nessuno ti segue ancora.";
      emptyEl.style.display = "block";
      return;
    }

    for (const u of arr) {
      const li = document.createElement("li");
      const parts = [];
      if (u.profile?.city) parts.push(u.profile.city);
      if (u.profile?.region) parts.push(u.profile.region);

      li.textContent = parts.length
        ? `${u.name || "Utente"} — ${parts.join(" • ")}`
        : (u.name || "Utente");

      listEl.appendChild(li);
    }
  } catch (e) {
    console.warn("Errore nel caricamento follower", e);
    listEl.innerHTML = "";
    emptyEl.textContent = "Errore di rete nel caricamento follower.";
    emptyEl.style.display = "block";
  }
}

async function loadFollowingList() {
  const box = document.getElementById("followingBox");
  const listEl = document.getElementById("followingList");
  const emptyEl = document.getElementById("followingEmpty");
  const otherBox = document.getElementById("followersBox");
  const otherEmpty = document.getElementById("followersEmpty");

  if (!box || !listEl || !emptyEl) return;

  // toggle: se è già aperto, chiudi
  if (box.dataset.open === "1") {
    box.style.display = "none";
    box.dataset.open = "0";
    return;
  }

  // chiudi l'altra box
  if (otherBox) {
    otherBox.style.display = "none";
    otherBox.dataset.open = "0";
    if (otherEmpty) otherEmpty.style.display = "none";
  }

  box.style.display = "block";
  box.dataset.open = "1";
  listEl.innerHTML = "";
  emptyEl.style.display = "none";

  const liLoading = document.createElement("li");
  liLoading.textContent = "Caricamento…";
  liLoading.className = "muted";
  listEl.appendChild(liLoading);

  try {
    const me = await whoami(localStorage.getItem("token"));
    const id = me?.user?._id;
    if (!id) {
      listEl.innerHTML = "";
      emptyEl.textContent = "Devi essere loggato per vedere chi segui.";
      emptyEl.style.display = "block";
      return;
    }


    const json = await apiGet(`/users/${id}/following`);

    listEl.innerHTML = "";
    if (!json || json.ok === false) {
      emptyEl.textContent = "Impossibile caricare i seguiti.";
      emptyEl.style.display = "block";
      return;
    }

    const arr = json.data || [];
    if (!arr.length) {
      emptyEl.textContent = "Non stai ancora seguendo nessuno.";
      emptyEl.style.display = "block";
      return;
    }

    for (const u of arr) {
      const li = document.createElement("li");
      const parts = [];
      if (u.profile?.city) parts.push(u.profile.city);
      if (u.profile?.region) parts.push(u.profile.region);

      li.textContent = parts.length
        ? `${u.name || "Utente"} — ${parts.join(" • ")}`
        : (u.name || "Utente");

      listEl.appendChild(li);
    }
  } catch (e) {
    console.warn("Errore nel caricamento seguiti", e);
    listEl.innerHTML = "";
    emptyEl.textContent = "Errore di rete nel caricamento seguiti.";
    emptyEl.style.display = "block";
  }
}

// --- reload ---
reloadBtn?.addEventListener("click", () => {
  loadProfile();
});
function hideIfMissing() {
  // se stai usando l’HTML "vecchio" (senza _view), non deve esplodere nulla.
  // Questa funzione serve solo a rendere compatibili gli ID _view e non-_view.

  const pairs = [
    ["myFollowersCount_view", "myFollowersCount"],
    ["myFollowingCount_view", "myFollowingCount"],
    ["btnShowFollowers_view", "btnShowFollowers"],
    ["btnShowFollowing_view", "btnShowFollowing"],
    ["followersBox_view", "followersBox"],
    ["followingBox_view", "followingBox"],
    ["followersList_view", "followersList"],
    ["followingList_view", "followingList"],
    ["followersEmpty_view", "followersEmpty"],
    ["followingEmpty_view", "followingEmpty"],
  ];

  for (const [viewId, legacyId] of pairs) {
    const viewEl = document.getElementById(viewId);
    const legacyEl = document.getElementById(legacyId);

    // Se manca la versione _view ma esiste quella legacy, ok: continueremo a usare la legacy.
    // Non facciamo clone/append per non sporcare l’HTML: ci basta non rompere nulla.
    if (!viewEl && legacyEl) continue;
  }
}

// --- bootstrap ---
document.addEventListener("DOMContentLoaded", () => {
  setReturnButton();
  setMyPublicBoardLink();
  hideIfMissing();
  loadProfile();
  loadFollowStats();
  // --- VIEW/EDIT toggle ---
  showViewMode();

  btnEditProfile?.addEventListener("click", () => {
    showEditMode();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  btnCancelEdit?.addEventListener("click", () => {
    showViewMode();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // --- Sync link "bacheca pubblica" anche in VIEW ---
  if (btnMyPublic2) {
    const topHref = document.getElementById("btnMyPublic")?.href;
    btnMyPublic2.href = topHref || "#";
  }

  // --- Bottoni VIEW per liste follower/seguiti ---
  btnShowFollowers_view?.addEventListener("click", loadFollowersList_view);
  btnShowFollowing_view?.addEventListener("click", loadFollowingList_view);


  const btnShowFollowers = document.getElementById("btnShowFollowers");
  const btnShowFollowing = document.getElementById("btnShowFollowing");

  btnShowFollowers?.addEventListener("click", loadFollowersList);
  btnShowFollowing?.addEventListener("click", loadFollowingList);
});

