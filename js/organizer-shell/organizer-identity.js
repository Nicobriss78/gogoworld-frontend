import { organizerState } from "./organizer-state.js";

const API_BASE = window.API_BASE || "https://gogoworld-api.onrender.com/api";

export async function loadIdentity() {
  const token = localStorage.getItem("token");

  if (!token) {
    organizerState.user = null;
    return null;
  }

  const res = await fetch(`${API_BASE}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    organizerState.user = null;
    return null;
  }

  const user = await res.json();
  organizerState.user = user;
  return user;
}

export function getOrganizerUser() {
  return organizerState.user;
}
