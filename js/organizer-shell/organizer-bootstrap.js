import { renderTopbar } from "./organizer-topbar.js";
import { renderBottomnav } from "./organizer-bottomnav.js";
import { checkAccess } from "./organizer-access-guard.js";
import { loadIdentity } from "./organizer-identity.js";

async function bootstrap() {
  await checkAccess();
  await loadIdentity();

  renderTopbar();
  renderBottomnav();
}

bootstrap();
