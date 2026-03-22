/**
 * GoGoWorld.life — FOLLOWING V2 Banner Engine
 * Motore banner isolato.
 * Nessun fetch, nessuna dipendenza dal controller.
 */

function normalizeText(value, fallback = "") {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function createSeguitiBannerSlot(slotIndex = 0) {
  const article = document.createElement("article");
  article.className = "seguiti-banner-slot seguiti-banner-slot--empty";
  article.dataset.seguitiCardType = "banner-slot";
  article.dataset.bannerSlotIndex = String(slotIndex);

  const inner = document.createElement("div");
  inner.className = "seguiti-banner-slot__inner";
  inner.textContent = "Spazio informativo";

  article.appendChild(inner);
  return article;
}

export function createSeguitiBannerCard(banner) {
  const link = document.createElement("a");
  link.className = "seguiti-banner-card";
  link.href = String(banner?.targetUrl ?? banner?.url ?? "#");
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  const thumb = document.createElement("div");
  thumb.className = "seguiti-banner-card__thumb";

  const imageUrl = normalizeText(
    banner?.imageUrl ?? banner?.coverImage ?? banner?.image ?? "",
    ""
  );

  if (imageUrl) {
    thumb.style.setProperty("--seguiti-banner-bg", `url("${escapeAttr(imageUrl)}")`);
  }

  const content = document.createElement("div");
  content.className = "seguiti-banner-card__content";

  const eyebrow = document.createElement("p");
  eyebrow.className = "seguiti-banner-card__eyebrow";
  eyebrow.textContent = "Sponsor";

  const title = document.createElement("h3");
  title.className = "seguiti-banner-card__title";
  title.textContent = normalizeText(banner?.title, "Contenuto sponsorizzato");

  const text = document.createElement("p");
  text.className = "seguiti-banner-card__text";
  text.textContent = normalizeText(
    banner?.text ?? banner?.description ?? banner?.subtitle ?? "",
    "Scopri di più"
  );

  content.append(eyebrow, title, text);
  link.append(thumb, content);

  return link;
}

export function createSeguitiTipCard(tip) {
  const article = document.createElement("article");
  article.className = "seguiti-banner-card seguiti-banner-card--tip";
  article.dataset.tipType = String(tip?.id ?? "");

  const thumb = document.createElement("div");
  thumb.className = "seguiti-banner-card__thumb";

  const content = document.createElement("div");
  content.className = "seguiti-banner-card__content";

  const eyebrow = document.createElement("p");
  eyebrow.className = "seguiti-banner-card__eyebrow";
  eyebrow.textContent = "Suggerimento";

  const title = document.createElement("h3");
  title.className = "seguiti-banner-card__title";
  title.textContent = normalizeText(tip?.title, "Suggerimento utile");

  const text = document.createElement("p");
  text.className = "seguiti-banner-card__text";
  text.textContent = normalizeText(tip?.text, "");

  content.append(eyebrow, title, text);
  article.append(thumb, content);

  return article;
}

function shuffleArray(array = []) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createSeguitiBannerEngine({
  rotationInterval = 8000,
} = {}) {
  let slots = [];
  let pool = [];
  let timer = null;
  let currentIndex = 0;

  function setData({ banners = [], tips = [] } = {}) {
    const bannerItems = banners.map((banner) => ({
      type: "banner",
      data: banner,
    }));

    const tipItems = tips.map((tip) => ({
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

    slot.classList.remove("seguiti-banner-slot--empty");

    const inner = slot.querySelector(".seguiti-banner-slot__inner");
    if (!inner) return;

    inner.replaceChildren();

    if (!item) {
      slot.classList.add("seguiti-banner-slot--empty");
      inner.textContent = "Spazio informativo";
      return;
    }

    let node = null;

    if (item.type === "banner") {
      node = createSeguitiBannerCard(item.data);
    } else if (item.type === "tip") {
      node = createSeguitiTipCard(item.data);
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
