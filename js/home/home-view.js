import { renderRail, createStateBlock } from "./home-renderer.js";
import { splitEvents } from "./home-data.js";
import { HOME_CONFIG } from "./home-state.js";

export function renderHomeView(dom, payload, helpers) {
  const {
    buildGeneralActiveNodes,
    buildGeneralPastNodes,
    buildJoinedActiveNodes,
    buildJoinedPastNodes,
    buildEmptyGeneralNodes,
    buildEmptyJoinedNodes,
    setRailMode,
    attachScrollbar,
    autoFocusFirstRealEvent,
    setupBannerEngine,
    hasDirectionalBridgeCard,
  } = helpers;

  const split = splitEvents(payload.events, payload.currentUserId);

  const generalActiveNodes = split.generalActive.length || split.generalPast.length
    ? buildGeneralActiveNodes(split.generalActive, split.generalPast.length, {
        hasHotPast: split.hasHotGeneralPast,
      })
    : buildEmptyGeneralNodes();

  const generalPastPreview = split.generalPast.slice(
    0,
    HOME_CONFIG.generalPastPreviewLimit
  );

  const generalPastNodes = generalPastPreview.length
    ? buildGeneralPastNodes(generalPastPreview)
    : buildEmptyGeneralNodes();

  const joinedPastPreview = split.joinedPast.slice(
    0,
    HOME_CONFIG.joinedPastPreviewLimit
  );

  const joinedActiveNodes = split.joinedActive.length || joinedPastPreview.length
    ? buildJoinedActiveNodes(split.joinedActive, split.joinedPast.length, {
        hasHotPast: split.hasHotJoinedPast,
      })
    : buildEmptyJoinedNodes();

  const joinedPastNodes = joinedPastPreview.length
    ? buildJoinedPastNodes(joinedPastPreview)
    : buildEmptyJoinedNodes();

  renderRail(dom.generalActiveRail, generalActiveNodes);
  renderRail(dom.generalPastRail, generalPastNodes);
  renderRail(dom.joinedActiveRail, joinedActiveNodes);
  renderRail(dom.joinedPastRail, joinedPastNodes);

  setRailMode(dom.generalShell, "active");
  setRailMode(dom.joinedShell, "active");

  attachScrollbar(dom.generalActiveRail, dom.generalActiveScrollbar);
  attachScrollbar(dom.generalPastRail, dom.generalPastScrollbar);
  attachScrollbar(dom.joinedActiveRail, dom.joinedActiveScrollbar);
  attachScrollbar(dom.joinedPastRail, dom.joinedPastScrollbar);

  requestAnimationFrame(() => {
    autoFocusFirstRealEvent(dom.generalActiveRail);
    autoFocusFirstRealEvent(dom.joinedActiveRail);
  });

  const bannerEngine = setupBannerEngine(
    dom,
    payload.banners,
    payload.tips || []
  );

  requestAnimationFrame(() => {
    if (hasDirectionalBridgeCard(dom.generalActiveRail)) {
      dom.generalActiveRail.scrollLeft = 0;
    }

    if (hasDirectionalBridgeCard(dom.joinedActiveRail)) {
      dom.joinedActiveRail.scrollLeft = 0;
    }
  });

  return { bannerEngine };
}
