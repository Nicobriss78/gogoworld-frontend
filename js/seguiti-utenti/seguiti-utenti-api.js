import { apiGet, apiDelete, apiErrorMessage } from "/js/api.js";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildLocationLabel(user) {
  const city = normalizeText(user?.profile?.city);
  const region = normalizeText(user?.profile?.region);

  const location = [city, region].filter(Boolean).join(" • ");
  if (location) return location;

  return normalizeText(user?.role);
}

function normalizeFollowedUser(user) {
  const id = normalizeText(user?._id || user?.id);
  const name = normalizeText(user?.name || user?.username) || "Utente";
  const role = normalizeText(user?.role);
  const avatarUrl =
    normalizeText(user?.profile?.avatarUrl) ||
    normalizeText(user?.avatarUrl) ||
    normalizeText(user?.avatar);

  const currentRootReturnTo =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/pages/seguiti-utenti-v2.html";

  const params = new URLSearchParams();
  if (id) {
    params.set("userId", id);
    params.set("rootReturnTo", currentRootReturnTo);
  }

  return {
    id,
    name,
    role,
    avatarUrl,
    locationLabel: buildLocationLabel(user),
    publicProfileUrl: id
      ? `/pages/user-public.html?${params.toString()}`
      : "#",
  };
}

export function getSeguitiUtentiAuthToken() {
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

export async function fetchCurrentUserProfile() {
  const response = await apiGet("/users/me");

  if (!response?.ok) {
    throw new Error(apiErrorMessage(response, "Impossibile recuperare il profilo utente."));
  }

  return response;
}

export async function fetchFollowingUsers(userId) {
  if (!userId) {
    throw new Error("Impossibile caricare gli utenti seguiti: userId mancante.");
  }

  const response = await apiGet(`/users/${encodeURIComponent(userId)}/following`);

  if (!response?.ok) {
    throw new Error(apiErrorMessage(response, "Errore nel caricamento degli utenti seguiti."));
  }

  const rawUsers = Array.isArray(response?.data) ? response.data : [];

  return rawUsers
    .map(normalizeFollowedUser)
    .filter((user) => user.id);
}

export async function unfollowUser(userId) {
  if (!userId) {
    throw new Error("Impossibile completare l'operazione: userId mancante.");
  }

  const response = await apiDelete(`/users/${encodeURIComponent(userId)}/follow`);

  if (!response?.ok) {
    throw new Error(apiErrorMessage(response, "Operazione non riuscita."));
  }

  return response;
}
