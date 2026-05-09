export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("currentUser");
  window.location.href = "/index.html";
}

export function openNotifications() {
  window.dispatchEvent(new CustomEvent("organizer:toggle-notifications"));
}
