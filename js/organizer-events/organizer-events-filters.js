export function applyEventFilters(events, filters) {
  const query = String(filters.query || "").trim().toLowerCase();
  const approvalStatus = filters.approvalStatus || "all";
  const visibility = filters.visibility || "all";
  const privacy = filters.privacy || "all";

  return events.filter((event) => {
    const title = String(event.title || "").toLowerCase();
    const city = String(event.city || "").toLowerCase();
    const region = String(event.region || "").toLowerCase();

    const matchesQuery =
      !query ||
      title.includes(query) ||
      city.includes(query) ||
      region.includes(query);

    const matchesApproval =
      approvalStatus === "all" || event.approvalStatus === approvalStatus;

    const matchesVisibility =
      visibility === "all" || event.visibility === visibility;

    const isPrivate = Boolean(event.isPrivate);
    const matchesPrivacy =
      privacy === "all" ||
      (privacy === "private" && isPrivate) ||
      (privacy === "public" && !isPrivate);

    return matchesQuery && matchesApproval && matchesVisibility && matchesPrivacy;
  });
}
