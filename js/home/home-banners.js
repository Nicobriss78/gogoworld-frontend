/**
 * GoGoWorld.life — HOME vNext Banner Engine
 * Wrapper locale sul motore shared.
 */

import { createSharedBannerEngine } from "../shared/banner-engine.js";
import {
  createBannerCard,
  createTipCard,
} from "./home-renderer.js";

export function createBannerEngine({
  rotationInterval = 8000,
} = {}) {
  return createSharedBannerEngine({
    rotationInterval,
    emptyClassName: "home-banner-slot--empty",
    emptyText: "Spazio informativo",
    createBannerCard,
    createTipCard,
  });
}
