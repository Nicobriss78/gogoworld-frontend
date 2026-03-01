// notifications.js — aggiorna i badge DM e Rooms ogni 5s
import { getUnreadCount as getDmUnread, getRoomsUnreadCount as getRoomsUnread } from "./api.js";
// ==============================
// J2 helpers — show/hide via classi (no element.style.display)
// ==============================
function setHidden(el, hidden) {
  if (!el) return;
  el.classList.toggle("is-hidden", !!hidden);
}
function isHiddenEl(el) {
  return !!el?.classList?.contains("is-hidden");
}
function showEl(el) { setHidden(el, false); }
function hideEl(el) { setHidden(el, true); }
(function () {
  const DM_SEL = "#messagesBadge, [data-badge='messages']";
  const ROOMS_SEL = "#roomsBadge, [data-badge='rooms']";

  function setBadge(el, n) {
     if (!el) return;

     if (!n || n <= 0) {
       el.textContent = "";
       hideEl(el);
     } else {
       el.textContent = String(n);
       showEl(el);
     }
 }

  async function refreshBadges() {
    try {
      const [dm, rooms] = await Promise.all([ getDmUnread(), getRoomsUnread() ]);
      const dmCount = (dm && (dm.unread ?? dm.count ?? dm.data?.unread)) || 0;
      const roomsCount = (rooms && (rooms.unread ?? rooms.count ?? rooms.data?.unread)) || 0;

      setBadge(document.querySelector(DM_SEL), dmCount);
      setBadge(document.querySelector(ROOMS_SEL), roomsCount);
    } catch (e) {
      // silenzioso
    }
  }

  // primo giro e polling leggero
  document.addEventListener("DOMContentLoaded", refreshBadges);
  let t = setInterval(refreshBadges, 5000);

  // pausa quando la tab non è visibile
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { clearInterval(t); t = null; }
    else { refreshBadges(); t = setInterval(refreshBadges, 5000); }
  });

  // aggiornamenti immediati su eventi FE (opzionali)
  window.addEventListener("dm:updated", refreshBadges);
  window.addEventListener("rooms:updated", refreshBadges);
})();
