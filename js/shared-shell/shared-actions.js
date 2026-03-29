import { getActionConfig } from "./shared-action-registry.js";
import { setState } from "./shared-state.js";

function hasCapability(capabilities = [], requiredCapability) {
  if (!requiredCapability) return true;
  return Array.isArray(capabilities) && capabilities.includes(requiredCapability);
}

function closeMenuIfOpen() {
  setState({ menuOpen: false });
}

async function executeLogout() {
  closeMenuIfOpen();

  try {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
  } catch (err) {
    console.warn("shared-actions logout storage cleanup warning:", err);
  }

  window.location.href = "/login.html";

  return {
    status: "executed",
    actionId: "logout",
  };
}

async function executePlaceholder(actionId) {
  closeMenuIfOpen();

  return {
    status: "not-implemented",
    actionId,
  };
}

async function executeContextHandler(actionId, context = {}) {
  closeMenuIfOpen();

  if (typeof context.onAction === "function") {
    const result = await context.onAction(actionId, context);

    return {
      status: "delegated",
      actionId,
      result,
    };
  }

  return {
    status: "not-implemented",
    actionId,
  };
}

export async function executeAction(actionId, context = {}) {
  const actionConfig = getActionConfig(actionId);

  if (!actionConfig) {
    return {
      status: "not-found",
      actionId,
    };
  }

  const capabilities = Array.isArray(context.capabilities)
    ? context.capabilities
    : [];

  if (!hasCapability(capabilities, actionConfig.requiredCapability)) {
    return {
      status: "blocked",
      actionId,
      reason: "missing-capability",
      requiredCapability: actionConfig.requiredCapability,
    };
  }

  if (actionConfig.implementation === "ready") {
    if (actionId === "logout") {
      return executeLogout();
    }

    return {
      status: "failed",
      actionId,
      reason: "missing-ready-handler",
    };
  }

  if (actionConfig.implementation === "placeholder") {
    return executePlaceholder(actionId);
  }

  if (actionConfig.implementation === "context-handler") {
    return executeContextHandler(actionId, context);
  }

  return {
    status: "failed",
    actionId,
    reason: "unknown-implementation",
  };
}
