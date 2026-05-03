import { organizerState } from "./organizer-state.js";
import { loadIdentity } from "./organizer-identity.js";

export async function checkAccess() {
  const token = localStorage.getItem("token");

  if (!token) {
    organizerState.access = {
      checked: true,
      allowed: false,
      reason: "missing-token",
    };

    window.location.href = "/index.html";
    return false;
  }

  const user = await loadIdentity();

  if (!user) {
    organizerState.access = {
      checked: true,
      allowed: false,
      reason: "invalid-user",
    };

    localStorage.removeItem("token");
    window.location.href = "/index.html";
    return false;
  }

  const role = String(user.role || "").toLowerCase();
  const sessionRole = String(user.sessionRole || "").toLowerCase();
  const canOrganize = Boolean(user.canOrganize);

  const isAdmin = role === "admin";
  const isOrganizer = role === "organizzatore" || role === "organizer";
  const isSessionOrganizer =
    sessionRole === "organizzatore" || sessionRole === "organizer";

  const allowed = isAdmin || isOrganizer || canOrganize || isSessionOrganizer;

  organizerState.access = {
    checked: true,
    allowed,
    reason: allowed ? null : "not-authorized",
  };

  if (!allowed) {
    window.location.href = "/index.html";
    return false;
  }

  return true;
}
