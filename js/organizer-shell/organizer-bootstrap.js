import { renderTopbar } from "./organizer-topbar.js";
import { renderBottomnav } from "./organizer-bottomnav.js";
import { checkAccess } from "./organizer-access-guard.js";

async function bootstrap() {
  const accessResult = await checkAccess();

  if (!accessResult.allowed) {
    return;
  }

  renderTopbar();
  renderBottomnav();
}

bootstrap();
