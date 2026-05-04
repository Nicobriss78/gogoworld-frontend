import { renderTopbar } from "./organizer-topbar.js?v=3";
import { renderBottomnav } from "./organizer-bottomnav.js?v=3";
import { checkAccess } from "./organizer-access-guard.js?v=3";
import { initDashboard } from "../organizer-dashboard/organizer-dashboard-controller.js?v=3";

async function bootstrap() {
  const accessResult = await checkAccess();

  if (!accessResult.allowed) {
    return;
  }

  renderTopbar();
  renderBottomnav();

  await initDashboard();
}

bootstrap();
