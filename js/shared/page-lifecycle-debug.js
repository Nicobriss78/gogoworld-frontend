export function initPageLifecycleDebug(label = "PAGE") {
  const startedAt = Date.now();

  function log(eventName, extra = {}) {
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);

    console.log(`[${label}] ${eventName}`, {
      t: `${seconds}s`,
      visibility: document.visibilityState,
      hidden: document.hidden,
      url: window.location.href,
      ...extra
    });
  }

  log("debug-start");

  window.addEventListener("load", () => {
    log("window.load");
  });

  document.addEventListener("readystatechange", () => {
    log("document.readystatechange", {
      readyState: document.readyState
    });
  });

  document.addEventListener("visibilitychange", () => {
    log("document.visibilitychange");
  });

  window.addEventListener("pageshow", (event) => {
    log("window.pageshow", {
      persisted: !!event.persisted
    });
  });

  window.addEventListener("pagehide", (event) => {
    log("window.pagehide", {
      persisted: !!event.persisted
    });
  });

  window.addEventListener("focus", () => {
    log("window.focus");
  });

  window.addEventListener("blur", () => {
    log("window.blur");
  });

  window.addEventListener("beforeunload", () => {
    log("window.beforeunload");
  });

  window.addEventListener("unload", () => {
    log("window.unload");
  });

  window.addEventListener("error", (event) => {
    log("window.error", {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    log("window.unhandledrejection", {
      reason:
        event.reason instanceof Error
          ? {
              message: event.reason.message,
              stack: event.reason.stack
            }
          : event.reason
    });
  });

  if ("onfreeze" in document) {
    document.addEventListener("freeze", () => {
      log("document.freeze");
    });
  }

  if ("onresume" in document) {
    document.addEventListener("resume", () => {
      log("document.resume");
    });
  }

  setInterval(() => {
    log("heartbeat");
  }, 10000);
}
