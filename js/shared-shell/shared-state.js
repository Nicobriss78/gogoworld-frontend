const STATE = {
  currentViewId: null,
  menuOpen: false,
  activeNavKey: null,
  capabilities: [],
};

const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    try {
      listener(getState());
    } catch (err) {
      console.warn("shared-state listener error:", err);
    }
  }
}

export function getState() {
  return structuredClone(STATE);
}

export function setState(partial) {
  if (!partial || typeof partial !== "object") return;

  let changed = false;

  for (const key of Object.keys(partial)) {
    if (STATE[key] !== partial[key]) {
      STATE[key] = partial[key];
      changed = true;
    }
  }

  if (changed) notify();
}

export function subscribe(listener) {
  if (typeof listener !== "function") return () => {};

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
