/**
 * GoGoWorld.life — Shared Banner Engine
 * Motore condiviso per rotazione banner/tip negli slot.
 * Nessun fetch. Nessuna dipendenza da Home/Following.
 */

function shuffleArray(array = []) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getSlotInner(slot) {
  if (!slot) return null;
  return slot.firstElementChild || null;
}
function sendBannerView(url) {
  const endpoint = String(url || "").trim();
  if (!endpoint) return;

  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(endpoint);
      if (sent) return;
    }
  } catch {}

  fetch(endpoint, {
    method: "POST",
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {});
}

function createBannerViewTracker() {
  const viewedNodes = new WeakSet();
  const timers = new WeakMap();

  if (typeof IntersectionObserver !== "function") {
    return {
      observe() {},
      unobserve() {},
    };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const node = entry.target;

        if (viewedNodes.has(node)) {
          observer.unobserve(node);
          return;
        }

        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (timers.has(node)) return;

          const timeoutId = window.setTimeout(() => {
            if (viewedNodes.has(node)) return;

            viewedNodes.add(node);
            timers.delete(node);
            observer.unobserve(node);

            sendBannerView(node.dataset.bannerViewUrl);
          }, 1000);

          timers.set(node, timeoutId);
          return;
        }

        const timeoutId = timers.get(node);
        if (timeoutId) {
          window.clearTimeout(timeoutId);
          timers.delete(node);
        }
      });
    },
    {
      threshold: [0, 0.5, 1],
    }
  );

  function observe(node, banner) {
    const viewUrl = String(banner?.viewUrl || "").trim();

    if (!node || !viewUrl) return;

    node.dataset.bannerViewUrl = viewUrl;
    observer.observe(node);
  }

  function unobserve(node) {
    if (!node) return;

    const timeoutId = timers.get(node);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timers.delete(node);
    }

    observer.unobserve(node);
  }

  return {
    observe,
    unobserve,
  };
}
export function createSharedBannerEngine({
  rotationInterval = 8000,
  emptyClassName = "",
  emptyText = "Spazio informativo",
  createBannerCard,
  createTipCard,
} = {}) {
  let slots = [];
  let pool = [];
  let timer = null;
  let currentIndex = 0;
const viewTracker = createBannerViewTracker();
  function setData({ banners = [], tips = [] } = {}) {
    const bannerItems = (Array.isArray(banners) ? banners : []).map((banner) => ({
      type: "banner",
      data: banner,
    }));

    const tipItems = (Array.isArray(tips) ? tips : []).map((tip) => ({
      type: "tip",
      data: tip,
    }));

    pool = shuffleArray([...bannerItems, ...tipItems]);
    currentIndex = 0;
  }

  function bindSlots(slotElements = []) {
    slots = Array.from(slotElements || []);
  }

  function renderIntoSlot(slot, item) {
    if (!slot) return;

    const inner = getSlotInner(slot);
    if (!inner) return;

    if (emptyClassName) {
      slot.classList.remove(emptyClassName);
    }
    inner
  .querySelectorAll("[data-banner-view-url]")
  .forEach((node) => viewTracker.unobserve(node));
    inner.replaceChildren();

    if (!item) {
      if (emptyClassName) {
        slot.classList.add(emptyClassName);
      }
      inner.textContent = emptyText;
      return;
    }

    let node = null;

    if (item.type === "banner" && typeof createBannerCard === "function") {
      node = createBannerCard(item.data);
    } else if (item.type === "tip" && typeof createTipCard === "function") {
      node = createTipCard(item.data);
    }

    if (node) {
  inner.appendChild(node);

  if (item.type === "banner") {
    viewTracker.observe(node, item.data);
  }
}
  }

  function fillInitial() {
    if (!slots.length || !pool.length) return;

    slots.forEach((slot, index) => {
      const item = pool[(currentIndex + index) % pool.length];
      renderIntoSlot(slot, item);
    });

    currentIndex = (currentIndex + slots.length) % pool.length;
  }

  function rotate() {
    if (!slots.length || !pool.length) return;

    slots.forEach((slot) => {
      const item = pool[currentIndex % pool.length];
      renderIntoSlot(slot, item);
      currentIndex += 1;
    });
  }

  function start() {
    stop();

    if (!slots.length || !pool.length) return;

    timer = setInterval(rotate, rotationInterval);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return {
    setData,
    bindSlots,
    fillInitial,
    start,
    stop,
  };
}
