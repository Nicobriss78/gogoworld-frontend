/**
 * GoGoWorld.life — HOME vNext Banner Engine
 * Motore banner isolato.
 * Nessun fetch, nessuna dipendenza dal controller.
 */

import {
  createBannerCard,
  createTipCard,
} from "./home-renderer.js";

/* =========================================================
   Utils
   ========================================================= */

function shuffleArray(array = []) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* =========================================================
   Banner Engine
   ========================================================= */

export function createBannerEngine({
  rotationInterval = 8000, // ms
} = {}) {
  let slots = [];
  let pool = [];
  let timer = null;
  let currentIndex = 0;

  /* ---------------------------
     Setup pool
  --------------------------- */

  function setData({ banners = [], tips = [] } = {}) {
    const bannerItems = banners.map((b) => ({
      type: "banner",
      data: b,
    }));

    const tipItems = tips.map((t) => ({
      type: "tip",
      data: t,
    }));

    pool = shuffleArray([...bannerItems, ...tipItems]);
    currentIndex = 0;
  }

  /* ---------------------------
     Slots binding
  --------------------------- */

  function bindSlots(slotElements = []) {
    slots = Array.from(slotElements || []);
  }

  /* ---------------------------
     Rendering
  --------------------------- */

  function renderIntoSlot(slot, item) {
    if (!slot) return;

    slot.classList.remove("home-banner-slot--empty");

    const inner = slot.querySelector(".home-banner-slot__inner");
    if (!inner) return;

    inner.replaceChildren();

    if (!item) {
      slot.classList.add("home-banner-slot--empty");
      inner.textContent = "Spazio informativo";
      return;
    }

    let node = null;

    if (item.type === "banner") {
      node = createBannerCard(item.data);
    } else if (item.type === "tip") {
      node = createTipCard(item.data);
    }

    if (node) {
      inner.appendChild(node);
    }
  }

  /* ---------------------------
     Initial fill
  --------------------------- */

  function fillInitial() {
    if (!slots.length || !pool.length) return;

    slots.forEach((slot, index) => {
      const item = pool[(currentIndex + index) % pool.length];
      renderIntoSlot(slot, item);
    });

    currentIndex = (currentIndex + slots.length) % pool.length;
  }

  /* ---------------------------
     Rotation
  --------------------------- */

  function rotate() {
    if (!slots.length || !pool.length) return;

    slots.forEach((slot) => {
      const item = pool[currentIndex % pool.length];
      renderIntoSlot(slot, item);
      currentIndex++;
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

  /* ---------------------------
     Public API
  --------------------------- */

  return {
    setData,
    bindSlots,
    fillInitial,
    start,
    stop,
  };
}
