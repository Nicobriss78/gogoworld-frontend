export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("currentUser");
  window.location.href = "/index.html";
}

export function openNotifications() {
  window.location.href = "/pages/notifiche-v2.html?rootReturnTo=organizer";
}
