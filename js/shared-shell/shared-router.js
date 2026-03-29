import { getNavItem } from "./shared-nav-registry.js";
import { getMenuItem } from "./shared-menu-registry.js";
import { getActionConfig } from "./shared-action-registry.js";
import { getViewConfig } from "./shared-view-registry.js";

function hasCapability(capabilities = [], requiredCapability) {
  if (!requiredCapability) return true;
  return Array.isArray(capabilities) && capabilities.includes(requiredCapability);
}

export function resolveNavRequest(navKey) {
  const navItem = getNavItem(navKey);

  if (!navItem) {
    return {
      type: "not-found",
      source: "nav",
      navKey,
    };
  }

  return {
    type: "navigate",
    source: "nav",
    navKey,
    targetViewId: navItem.targetViewId,
  };
}

export function resolveMenuRequest(menuItemId, context = {}) {
  const menuItem = getMenuItem(menuItemId);

  if (!menuItem) {
    return {
      type: "not-found",
      source: "menu",
      menuItemId,
    };
  }

  const capabilities = Array.isArray(context.capabilities)
    ? context.capabilities
    : [];

  if (!hasCapability(capabilities, menuItem.requiredCapability)) {
    return {
      type: "blocked",
      source: "menu",
      menuItemId,
      reason: "missing-capability",
      requiredCapability: menuItem.requiredCapability,
    };
  }

  if (menuItem.type === "navigation") {
    return {
      type: "navigate",
      source: "menu",
      menuItemId,
      targetViewId: menuItem.targetViewId,
    };
  }

  if (menuItem.type === "action" || menuItem.type === "special") {
    return {
      type: "action",
      source: "menu",
      menuItemId,
      actionId: menuItem.actionId,
    };
  }

  return {
    type: "not-found",
    source: "menu",
    menuItemId,
  };
}

export function resolveViewRequest(viewId) {
  const viewConfig = getViewConfig(viewId);

  if (!viewConfig) {
    return {
      type: "not-found",
      source: "view",
      viewId,
    };
  }

  return {
    type: "navigate",
    source: "view",
    viewId,
    targetViewId: viewConfig.viewId,
  };
}

export function resolveActionRequest(actionId, context = {}) {
  const actionConfig = getActionConfig(actionId);

  if (!actionConfig) {
    return {
      type: "not-found",
      source: "action",
      actionId,
    };
  }

  const capabilities = Array.isArray(context.capabilities)
    ? context.capabilities
    : [];

  if (!hasCapability(capabilities, actionConfig.requiredCapability)) {
    return {
      type: "blocked",
      source: "action",
      actionId,
      reason: "missing-capability",
      requiredCapability: actionConfig.requiredCapability,
    };
  }

  return {
    type: "action",
    source: "action",
    actionId,
  };
    }
