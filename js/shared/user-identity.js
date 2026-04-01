import { apiGet } from "../api.js";

function normalizeDisplayName(user) {
  return String(
    user?.name ||
    user?.username ||
    user?.displayName ||
    user?.fullName ||
    ""
  ).trim();
}

function normalizeRoleRaw(user) {
  return String(user?.role || "").trim().toLowerCase();
}

function normalizeLevelRaw(user) {
  return String(
    user?.status ||
    user?.level ||
    ""
  ).trim().toLowerCase();
}

function mapRoleLabel(roleRaw) {
  switch (roleRaw) {
    case "participant":
      return "Partecipante";
    case "organizer":
      return "Organizzatore";
    case "admin":
      return "Admin";
    default:
      return "";
  }
}

function mapLevelLabel(levelRaw) {
  switch (levelRaw) {
    case "novizio":
      return "Novizio";
    case "esploratore":
      return "Esploratore";
    case "veterano":
      return "Veterano";
    case "ambassador":
      return "Ambassador";
    default:
      return "";
  }
}

function buildWelcomeSubtitle({ roleRaw, roleLabel, levelLabel }) {
  // Nell’area partecipante vogliamo mostrare ruolo + livello.
  if (roleRaw === "participant") {
    if (roleLabel && levelLabel) return `${roleLabel} · ${levelLabel}`;
    if (roleLabel) return roleLabel;
    if (levelLabel) return levelLabel;
    return "Partecipante";
  }

  // Per organizer/admin, in mancanza di una regola diversa consolidata,
  // mostriamo solo il ruolo.
  if (roleLabel) return roleLabel;

  return "";
}

function normalizeUserIdentity(payload) {
  const user = payload?.user || payload || {};

  const displayName = normalizeDisplayName(user);
  const roleRaw = normalizeRoleRaw(user);
  const levelRaw = normalizeLevelRaw(user);

  const roleLabel = mapRoleLabel(roleRaw);
  const levelLabel = mapLevelLabel(levelRaw);
  const welcomeSubtitle = buildWelcomeSubtitle({
    roleRaw,
    roleLabel,
    levelLabel,
  });

  return {
    displayName,
    roleRaw,
    roleLabel,
    levelRaw,
    levelLabel,
    welcomeSubtitle,
    raw: user,
  };
}

export async function fetchUserIdentity() {
  const res = await apiGet("/users/me");

  if (!res?.ok) {
    throw new Error(res?.message || "Impossibile recuperare il profilo utente.");
  }

  const identity = normalizeUserIdentity(res);

  try {
    sessionStorage.setItem("gw:userIdentity", JSON.stringify(identity));
  } catch {}

  return identity;
}

export function getCachedUserIdentity() {
  try {
    const raw = sessionStorage.getItem("gw:userIdentity");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    return {
      displayName: String(parsed.displayName || "").trim(),
      roleRaw: String(parsed.roleRaw || "").trim().toLowerCase(),
      roleLabel: String(parsed.roleLabel || "").trim(),
      levelRaw: String(parsed.levelRaw || "").trim().toLowerCase(),
      levelLabel: String(parsed.levelLabel || "").trim(),
      welcomeSubtitle: String(parsed.welcomeSubtitle || "").trim(),
      raw: parsed.raw || null,
    };
  } catch {
    return null;
  }
}

export async function resolveUserIdentity() {
  try {
    return await fetchUserIdentity();
  } catch {
    return (
      getCachedUserIdentity() || {
        displayName: "",
        roleRaw: "",
        roleLabel: "",
        levelRaw: "",
        levelLabel: "",
        welcomeSubtitle: "",
        raw: null,
      }
    );
  }
}

export function applyUserIdentityToTopbar({
  greetingEl,
  roleEl,
  identity,
}) {
  if (greetingEl) {
    greetingEl.textContent = identity?.displayName
      ? `Ciao ${identity.displayName}`
      : "Ciao";
  }

  if (roleEl) {
    roleEl.textContent = identity?.welcomeSubtitle || "";
  }
      }
