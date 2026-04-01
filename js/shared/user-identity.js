import { apiGet } from "../api.js";

function normalizeUserIdentity(payload) {
  const user = payload?.user || payload || {};

  const displayName = String(
    user?.name ||
    user?.username ||
    user?.displayName ||
    user?.fullName ||
    ""
  ).trim();

  const rawRole = String(
    user?.roleLabel ||
    user?.role ||
    ""
  ).trim();

  const roleLabel = rawRole || "Esploratore";

  return {
    displayName,
    roleLabel,
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
      roleLabel: String(parsed.roleLabel || "Esploratore").trim() || "Esploratore",
      raw: parsed.raw || null,
    };
  } catch {
    return null;
  }
}

export async function resolveUserIdentity() {
  // 1. prova cache immediata (UX veloce)
  const cached = getCachedUserIdentity();
  if (cached) return cached;

  // 2. prova fetch reale
  try {
    return await fetchUserIdentity();
  } catch {
    return {
      displayName: "",
      roleLabel: "Esploratore",
      raw: null,
    };
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
    roleEl.textContent = identity?.roleLabel || "Esploratore";
  }
}
