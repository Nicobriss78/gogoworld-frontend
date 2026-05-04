import { deleteOrganizerEvent } from "./organizer-events-api.js?v=4";

export async function handleDeleteEvent(eventId) {
  if (!eventId) return false;

  const confirmed = window.confirm("Vuoi davvero eliminare questo evento?");

  if (!confirmed) {
    return false;
  }

  await deleteOrganizerEvent(eventId);
  return true;
}
