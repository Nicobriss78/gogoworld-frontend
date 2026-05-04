export function generateAccessCode() {
  const partA = Math.random().toString(36).slice(2, 6).toUpperCase();
  const partB = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GGW-${partA}-${partB}`;
}

export function normalizePrivacy(event) {
  const isPrivate = Boolean(event.isPrivate);

  return {
    ...event,
    visibility: isPrivate ? "private" : "public",
    accessCode: isPrivate ? event.accessCode : "",
  };
}
