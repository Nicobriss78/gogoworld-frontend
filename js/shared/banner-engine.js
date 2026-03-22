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
