// js/profile.js — C1 Profilo (UI)
import { getMyProfile, updateMyProfile, whoami } from "./api.js";

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
// --- nodes ---
const basicForm = $("#basicForm");
const privacyForm = $("#privacyForm");
const reloadBtn = $("#reloadBtn");

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

avatarFile?.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (!f || !avatarPreview) return;
  avatarPreview.src = URL.createObjectURL(f);
  avatarPreview.style.display = "inline-block";
});

const optInDM = $("#optInDM");
const dmsFrom = $("#dmsFrom");

// token
const token = localStorage.getItem("token");

// --- load profile ---
async function loadProfile() {
  const res = await getMyProfile(token);
  if (!res || res.ok === false) {
    showAlert(res?.message || "Impossibile caricare il profilo", "error", 3500);
    return;
  }
  const p = res.data || {};

  nickname.value = p.nickname || "";
  birthYear.value = p.birthYear || "";
  region.value = p.region || "";
  city.value = p.city || "";
  avatarUrl.value = p.avatarUrl || "";
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
      headers: { Authorization: `Bearer ${token}` },
      body: fd
    });
    const out = await resp.json();
    removeInfo();
    if (out?.ok && out.avatarUrl) {
      avatarUrl.value = out.avatarUrl;
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

// --- reload ---
reloadBtn?.addEventListener("click", loadProfile);

// --- bootstrap ---
document.addEventListener("DOMContentLoaded", () => { setReturnButton(); loadProfile(); });
