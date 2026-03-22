/**
 * GoGoWorld.life — FOLLOWING V2 Banner Engine
 * Factory locali + wrapper sul motore shared.
 */

import { createSharedBannerEngine } from "../shared/banner-engine.js";

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

export function createSeguitiBannerEngine({
  rotationInterval = 8000,
} = {}) {
  return createSharedBannerEngine({
    rotationInterval,
    emptyClassName: "seguiti-banner-slot--empty",
    emptyText: "Spazio informativo",
    createBannerCard: createSeguitiBannerCard,
    createTipCard: createSeguitiTipCard,
  });
}
