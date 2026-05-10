import { ensureOrganizerIconSprite } from "./organizer-icons.js?v=10";
import { renderTopbar } from "./organizer-topbar.js?v=10";
import { renderBottomnav } from "./organizer-bottomnav.js?v=10";
import { renderMenu, toggleOrganizerMenu } from "./organizer-menu.js?v=10";
import { loadBadges } from "./organizer-badges.js?v=10";
import { checkAccess } from "./organizer-access-guard.js?v=7";
import { openNotifications } from "./organizer-actions.js?v=10";
import { initNotificationsCenter } from "../shared/notifications-center.js";

let notificationsCenter = null;

async function initCurrentView() {
  const view = document.body?.dataset?.organizerView || "dashboard";

  if (view === "events") {
    const module = await import("../organizer-events/organizer-events-controller.js?v=6");
    await module.initEventsPage();
    return;
  }

  if (view === "trills") {
    const module = await import("../organizer-trills/organizer-trills-controller.js?v=8");
    await module.initOrganizerTrills();
    return;
  }

  const module = await import("../organizer-dashboard/organizer-dashboard-controller.js?v=11");
  await module.initDashboard();
}

function bindShellActions() {
  document.querySelectorAll("[data-org-action]").forEach((node) => {
    node.addEventListener("click", (event) => {
      const action = node.getAttribute("data-org-action");

      if (action === "menu") {
        event.preventDefault();
        toggleOrganizerMenu();
        return;
      }

      if (action === "notifications") {
        event.preventDefault();
        openNotifications();
      }
    });
  });

  window.addEventListener("organizer:toggle-notifications", () => {
    if (notificationsCenter) {
      notificationsCenter.toggle();
    }
  });
}

async function bootstrap() {
  const accessResult = await checkAccess();

  if (!accessResult.allowed) return;

  ensureOrganizerIconSprite();

  renderTopbar();
  renderBottomnav();
  renderMenu();

  notificationsCenter = initNotificationsCenter({
    button: document.querySelector('[data-org-action="notifications"]'),
  });

  bindShellActions();

  await loadBadges();
  await initCurrentView();
}

bootstrap();
