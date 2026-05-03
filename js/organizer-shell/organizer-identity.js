import { organizerState } from "./organizer-state.js";

const API_BASE = window.API_BASE || "https://gogoworld-api.onrender.com/api";

export async function loadIdentity() {
  if (organizerState.user) {
    return organizerState.user;
  }

  const token = localStorage.getItem("token");

  if (!token) {
    organizerState.user = null;
    return null;
  }

  try {
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
  } catch (error) {
    console.error("[OrganizerIdentity] loadIdentity failed", error);
    organizerState.user = null;
    return null;
  }
}

export function getOrganizerUser() {
  return organizerState.user;
}
