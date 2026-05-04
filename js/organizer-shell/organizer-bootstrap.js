import { renderTopbar } from "./organizer-topbar.js?v=4";
import { renderBottomnav } from "./organizer-bottomnav.js?v=4";
import { checkAccess } from "./organizer-access-guard.js?v=4";

async function initCurrentView() {
  const path = window.location.pathname;

  if (path.includes("organizer-events-v2")) {
    const module = await import("../organizer-events/organizer-events-controller.js?v=4");
    await module.initEventsPage();
    return;
  }

  const module = await import("../organizer-dashboard/organizer-dashboard-controller.js?v=4");
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
