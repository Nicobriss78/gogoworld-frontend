import { renderTopbar } from "./organizer-topbar.js?v=9";
import { renderBottomnav } from "./organizer-bottomnav.js?v=9";
import { renderMenu, toggleOrganizerMenu } from "./organizer-menu.js?v=9";
import { loadBadges } from "./organizer-badges.js?v=9";
import { checkAccess } from "./organizer-access-guard.js?v=7";
import { openNotifications } from "./organizer-actions.js?v=9";

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

  const module = await import("../organizer-dashboard/organizer-dashboard-controller.js?v=6");
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
}

async function bootstrap() {
  const accessResult = await checkAccess();

  if (!accessResult.allowed) return;

  renderTopbar();
  renderBottomnav();
  renderMenu();
  bindShellActions();

  await loadBadges();
  await initCurrentView();
}

bootstrap();
