import { getAuthHeaders } from "../shared/user-identity.js";

export async function fetchEventById(eventId) {
  const res = await fetch(`/api/events/${eventId}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Errore caricamento evento");
  }

  return res.json();
}
