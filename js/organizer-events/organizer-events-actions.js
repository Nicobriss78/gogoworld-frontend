import { deleteOrganizerEvent } from "./organizer-events-api.js?v=4";

export async function handleDeleteEvent(eventId) {
  if (!eventId) return false;

  await deleteOrganizerEvent(eventId);
  return true;
}
