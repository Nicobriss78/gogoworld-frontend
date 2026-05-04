import { renderTopbar } from "./organizer-topbar.js?v=5";
import { renderBottomnav } from "./organizer-bottomnav.js?v=5";
import { checkAccess } from "./organizer-access-guard.js?v=5";

async function initCurrentView() {
  const path = window.location.pathname;

  if (path.includes("organizer-event-create-v2") || path.includes("organizer-event-edit-v2")) {
    const module = await import("../organizer-event-form/organizer-event-form-controller.js?v=5");
    await module.initEventForm();
    return;
  }

  if (path.includes("organizer-events-v2")) {
    const module = await import("../organizer-events/organizer-events-controller.js?v=5");
    await module.initEventsPage();
    return;
  }

  const module = await import("../organizer-dashboard/organizer-dashboard-controller.js?v=5");
  await module.initDashboard();
}

async function bootstrap() {
  const accessResult = await checkAccess();

  if (!accessResult.allowed) {
    return;
  }

  renderTopbar();
  renderBottomnav();

  await initCurrentView();
}

bootstrap();
