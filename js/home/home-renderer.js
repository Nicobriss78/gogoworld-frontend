/**
 * GoGoWorld.life — HOME vNext Renderer
 * Renderer puro della nuova Home.
 * Nessun fetch, nessun accesso API, nessuna logica di area:
 * solo creazione markup/card/rail.
 */

/* =========================================================
   Helpers
   ========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function formatSingleDate(value) {
  if (!isValidDate(value)) return "";
  const date = new Date(value);

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatEventDate(event) {
  const start = event?.dateStart ?? event?.startDate ?? event?.date ?? "";
  const end = event?.dateEnd ?? event?.endDate ?? "";

  const startText = formatSingleDate(start);
  const endText = formatSingleDate(end);

  if (!startText) return "";
  if (!endText || endText === startText) return startText;
  return `${startText} – ${endText}`;
}

function getEventImage(event) {
  const firstImage = Array.isArray(event?.images) ? event.images[0] : "";

  const candidates = [
    event?.coverImage,
    firstImage,
    event?.imageUrl,
    event?.coverUrl,
    event?.cover,
    event?.image,
    event?.thumbUrl,
    event?.thumbnailUrl,
  ];

  const found = candidates.find((value) => typeof value === "string" && value.trim());
  return found ? found.trim() : "";
}

function normalizeText(value, fallback = "—") {
  if (value == null) return fallback;

  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text || fallback;
  }

  if (typeof value === "object") {
    const candidate =
      value?.label ??
      value?.name ??
      value?.title ??
      value?.city ??
      value?.text ??
      value?.value ??
      "";

    const text = String(candidate).trim();
    return text || fallback;
  }

  const text = String(value).trim();
  return text || fallback;
}
function normalizeLocationValue(value) {
  if (value == null) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (typeof value === "object") {
    const candidates = [
      value?.label,
      value?.name,
      value?.title,
      value?.address,
      value?.street,
      value?.city,
      value?.region,
      value?.country,
      value?.value,
      value?.text,
    ];

    const parts = candidates
      .map((v) =>
        typeof v === "string" || typeof v === "number"
          ? String(v).trim()
          : ""
      )
      .filter(Boolean);

    return [...new Set(parts)].join(" • ");
  }

  return "";
}

function buildEventPlace(event) {
  const rawParts = [
    event?.locationLabel,
    event?.location,
    event?.venue,
    event?.venueName,
    event?.address,
    event?.city,
    event?.region,
    event?.country,
  ];

  const parts = rawParts
    .map(normalizeLocationValue)
    .filter(Boolean)
    .filter((v) => v !== "[object Object]");

  return normalizeText([...new Set(parts)].join(" • "), "Luogo da definire");
}
function formatPrice(event) {
  const raw =
    event?.priceLabel ??
    event?.priceText ??
    event?.formattedPrice ??
    event?.price ??
    "";

  const text = String(raw ?? "").trim();

  if (!text) return "";
  if (/gratis/i.test(text)) return "Gratis";
  return text;
}

function mapStatusLabel(status) {
  switch (String(status ?? "").toLowerCase()) {
    case "ongoing":
      return "In corso";
    case "imminent":
      return "Imminente";
    case "future":
      return "Futuro";
    case "concluded":
      return "Concluso";
    case "past":
      return "Passato";
    default:
      return "";
  }
}

/* =========================================================
   Card actions
   ========================================================= */

function createActionButton({
  action,
  label,
  text,
  title,
  variant = "default",
}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    variant === "danger"
      ? "home-card-action-btn home-card-action-btn--danger"
      : "home-card-action-btn";

  button.dataset.homeAction = action;
  button.setAttribute("aria-label", label);
  button.title = title || label;
  button.textContent = text;

  return button;
}

function createCardActions(options = {}) {
  const {
    detailsIcon = "info",
    showClose = false,
  } = options;

  const actions = document.createElement("div");
  actions.className = "home-card-actions";

  const detailsText = detailsIcon === "plus" ? "+" : "ℹ";
  const detailsLabel =
    detailsIcon === "plus" ? "Apri più dettagli" : "Apri dettagli";

  actions.appendChild(
    createActionButton({
      action: "details",
      label: detailsLabel,
      text: detailsText,
      title: detailsLabel,
    })
  );

  if (showClose) {
    actions.appendChild(
      createActionButton({
        action: "close-detail",
        label: "Chiudi dettaglio",
        text: "×",
        title: "Chiudi dettaglio",
        variant: "danger",
      })
    );
  }

  return actions;
}

/* =========================================================
   Event card
   ========================================================= */

export function createEventCard(event, options = {}) {
  const {
    detailsIcon = "info",
    showClose = false,
  } = options;

  const article = document.createElement("article");
  article.className = "home-card";
  article.dataset.eventId = String(event?._id ?? event?.id ?? "").trim();
  article.dataset.eventStatus = String(event?.status ?? "").trim();

  const imageUrl = getEventImage(event);
  const title = normalizeText(event?.title, "Evento senza titolo");
  const placeParts = [
  event?.locationLabel,
  event?.location,
  event?.venue,
  event?.venueName,
  event?.address,
  event?.city,
  event?.region,
  event?.country,
]
  .map((v) => String(v ?? "").trim())
  .filter(Boolean);

const place = normalizeText(
  [...new Set(placeParts)].join(" • "),
  "Luogo da definire"
);
  const dateText = formatEventDate(event) || "Data da definire";
  const category = normalizeText(event?.categoryLabel ?? event?.category ?? "", "Categoria non indicata");
  const target = normalizeText(event?.targetLabel ?? event?.targetAudience ?? event?.target ?? "", "Target non indicato");
  const price = formatPrice(event);
  const statusLabel = mapStatusLabel(event?.status);

  const thumb = document.createElement("div");
  thumb.className = imageUrl ? "home-card-thumb" : "home-card-thumb home-card-thumb--empty";
  if (imageUrl) {
    thumb.style.setProperty("--home-card-bg", `url("${escapeAttr(imageUrl)}")`);
  }

  const content = document.createElement("div");
  content.className = "home-card-content";

  const heading = document.createElement("h3");
  heading.className = "home-card-title";
  heading.textContent = title;

  content.appendChild(heading);

  if (statusLabel) {
    const badge = document.createElement("div");
    badge.className = "home-card-badge";
    badge.textContent = statusLabel;
    content.appendChild(badge);
  }

  const meta = document.createElement("div");
  meta.className = "home-card-meta";

  const metaRows = [
    { label: "Luogo", value: place },
    { label: "Data", value: dateText },
    { label: "Categoria", value: category },
    { label: "Target", value: target },
  ];

  for (const row of metaRows) {
    const metaRow = document.createElement("div");
    metaRow.className = "home-card-meta-row";

    const metaLabel = document.createElement("span");
    metaLabel.className = "home-card-meta-label";
    metaLabel.textContent = row.label;

    const metaValue = document.createElement("span");
    metaValue.className = "home-card-meta-value";
    metaValue.textContent = row.value;

    metaRow.append(metaLabel, metaValue);
    meta.appendChild(metaRow);
  }

  content.appendChild(meta);

  if (price) {
    const priceNode = document.createElement("div");
    priceNode.className = "home-card-price";
    priceNode.textContent = price;
    content.appendChild(priceNode);
  }

  article.appendChild(thumb);
  article.appendChild(createCardActions({ detailsIcon, showClose }));
  article.appendChild(content);

  return article;
}

/* =========================================================
   Switch card
   ========================================================= */

export function createSwitchCard({
  direction,
  count = 0,
  title = "",
  subtitle = "",
  buttonLabel = "",
}) {
  const article = document.createElement("article");
  article.className = "home-switch-card";
  article.dataset.homeCardType = "switch";
  article.dataset.homeSwitchDirection = direction;

  const body = document.createElement("div");
  body.className = "home-switch-card__body";

  const eyebrow = document.createElement("p");
  eyebrow.className = "home-switch-card__eyebrow";
  eyebrow.textContent =
    direction === "to-past"
      ? `${count} eventi`
      : "Vista attiva";

  const heading = document.createElement("h3");
  heading.className = "home-switch-card__title";
  heading.textContent = title;

  const text = document.createElement("p");
  text.className = "home-switch-card__subtitle";
  text.textContent = subtitle;

  const actions = document.createElement("div");
  actions.className = "home-switch-card__actions";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "home-switch-card__btn";
  button.dataset.homeAction =
    direction === "to-past" ? "show-past" : "show-active";
  button.textContent = buttonLabel;

  actions.appendChild(button);
  body.append(eyebrow, heading, text, actions);
  article.appendChild(body);

  return article;
}

/* =========================================================
   Banner slot
   ========================================================= */

export function createBannerSlot(slotIndex = 0) {
  const article = document.createElement("article");
  article.className = "home-banner-slot home-banner-slot--empty";
  article.dataset.homeCardType = "banner-slot";
  article.dataset.bannerSlotIndex = String(slotIndex);

  const inner = document.createElement("div");
  inner.className = "home-banner-slot__inner";
  inner.textContent = "Spazio informativo";

  article.appendChild(inner);
  return article;
}

/* =========================================================
   Banner card / Tip card
   ========================================================= */

export function createBannerCard(banner) {
  const link = document.createElement("a");
  link.className = "home-banner-card";
  link.href = String(banner?.targetUrl ?? banner?.url ?? "#");
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  const thumb = document.createElement("div");
  thumb.className = "home-banner-card__thumb";

  const imageUrl = normalizeText(
    banner?.imageUrl ?? banner?.coverImage ?? banner?.image ?? "",
    ""
  );

  if (imageUrl) {
    thumb.style.setProperty("--home-banner-bg", `url("${escapeAttr(imageUrl)}")`);
  }

  const content = document.createElement("div");
  content.className = "home-banner-card__content";

  const eyebrow = document.createElement("p");
  eyebrow.className = "home-banner-card__eyebrow";
  eyebrow.textContent = "Sponsor";

  const title = document.createElement("h3");
  title.className = "home-banner-card__title";
  title.textContent = normalizeText(banner?.title, "Contenuto sponsorizzato");

  const text = document.createElement("p");
  text.className = "home-banner-card__text";
  text.textContent = normalizeText(
    banner?.text ?? banner?.description ?? banner?.subtitle ?? "",
    "Scopri di più"
  );

  content.append(eyebrow, title, text);
  link.append(thumb, content);

  return link;
}

export function createTipCard(tip) {
  const article = document.createElement("article");
  article.className = "home-banner-card home-banner-card--tip";
  article.dataset.tipType = String(tip?.id ?? "");

  const thumb = document.createElement("div");
  thumb.className = "home-banner-card__thumb";

  const content = document.createElement("div");
  content.className = "home-banner-card__content";

  const eyebrow = document.createElement("p");
  eyebrow.className = "home-banner-card__eyebrow";
  eyebrow.textContent = "Suggerimento";

  const title = document.createElement("h3");
  title.className = "home-banner-card__title";
  title.textContent = normalizeText(tip?.title, "Suggerimento utile");

  const text = document.createElement("p");
  text.className = "home-banner-card__text";
  text.textContent = normalizeText(tip?.text, "");

  content.append(eyebrow, title, text);
  article.append(thumb, content);

  return article;
}

/* =========================================================
   States
   ========================================================= */

export function createStateBlock({
  type = "info",
  title = "",
  text = "",
}) {
  const article = document.createElement("article");
  article.className =
    type === "error"
      ? "home-state home-state--error"
      : "home-state";

  const heading = document.createElement("strong");
  heading.className = "home-state__title";
  heading.textContent = title;

  const body = document.createElement("p");
  body.className = "home-state__text";
  body.textContent = text;

  article.append(heading, body);
  return article;
}

/* =========================================================
   Rail rendering
   ========================================================= */

export function clearRail(railElement) {
  if (!railElement) return;
  railElement.replaceChildren();
}

export function renderRail(railElement, nodes = []) {
  if (!railElement) return;
  clearRail(railElement);

  const fragment = document.createDocumentFragment();
  for (const node of nodes) {
    if (node instanceof Node) {
      fragment.appendChild(node);
    }
  }

  railElement.appendChild(fragment);
}

/* =========================================================
   Node builders ad alto livello
   ========================================================= */

export function buildGeneralActiveNodes(events = [], options = {}) {
  return events.map((event) => createEventCard(event, options));
}

export function buildPastNodes(events = [], options = {}) {
  return events.map((event) => createEventCard(event, options));
}
