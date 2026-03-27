import { apiGet, apiDelete } from "/js/api.js";

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildLocationLabel(user) {
  const city = normalizeText(user?.profile?.city);
  const region = normalizeText(user?.profile?.region);

  const location = [city, region].filter(Boolean).join(" • ");
  if (location) return location;

  const role = normalizeText(user?.role);
  return role;
}

function normalizeFollowedUser(user) {
  const id = normalizeText(user?._id || user?.id);
  const name = normalizeText(user?.name || user?.username) || "Utente";
  const role = normalizeText(user?.role);
  const avatarUrl =
    normalizeText(user?.profile?.avatarUrl) ||
    normalizeText(user?.avatarUrl) ||
    normalizeText(user?.avatar);

  return {
    id,
    name,
    role,
    avatarUrl,
    locationLabel: buildLocationLabel(user),
    publicProfileUrl: id ? `/pages/user-public.html?userId=${encodeURIComponent(id)}` : "#",
  };
}

export function getSeguitiUtentiAuthToken() {
  return localStorage.getItem("token") || "";
}

export async function fetchCurrentUserProfile() {
  const response = await apiGet("/users/me");

  return response?.user || response?.data || response || null;
}

export async function fetchFollowingUsers(userId) {
  if (!userId) {
    throw new Error("Impossibile caricare gli utenti seguiti: userId mancante.");
  }

  const response = await apiGet(`/users/${encodeURIComponent(userId)}/following`);
  const rawUsers = Array.isArray(response?.data)
    ? response.data
    : Array.isArray(response)
      ? response
      : [];

  return rawUsers
    .map(normalizeFollowedUser)
    .filter((user) => user.id);
}

export async function unfollowUser(userId) {
  if (!userId) {
    throw new Error("Impossibile completare l'operazione: userId mancante.");
  }

  const response = await apiDelete(`/users/${encodeURIComponent(userId)}/follow`);
  return response || { ok: true };
}
