import { renderTopbar } from "./organizer-topbar.js?v=2";
import { renderBottomnav } from "./organizer-bottomnav.js?v=2";
import { checkAccess } from "./organizer-access-guard.js?v=2";

async function bootstrap() {
  const accessResult = await checkAccess();

  if (!accessResult.allowed) {
    return;
  }

  renderTopbar();
  renderBottomnav();
}

bootstrap();
