function setText(node, value, fallback = "") {
  if (!node) return;
  const text = String(value ?? "").trim();
  node.textContent = text || fallback;
}

function setHtml(node, value, fallback = "") {
  if (!node) return;
  const html = String(value ?? "").trim();
  node.innerHTML = html || fallback;
}

function setHidden(node, hidden) {
  if (!node) return;
  node.hidden = Boolean(hidden);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateTimeRange(event) {
  const start =
    event?.startAt ||
    event?.startDate ||
    event?.dateStart ||
    event?.date ||
    event?.startsAt ||
    "";

  const end =
    event?.endAt ||
    event?.endDate ||
    event?.dateEnd ||
    event?.endsAt ||
    "";

  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;

  const isValidStart = startDate instanceof Date && !Number.isNaN(startDate.getTime());
  const isValidEnd = endDate instanceof Date && !Number.isNaN(endDate.getTime());

  if (!isValidStart && !isValidEnd) return "Non disponibile";

  const dateFormatter = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isValidStart && !isValidEnd) {
    return `${dateFormatter.format(startDate)} • ${timeFormatter.format(startDate)}`;
  }

  if (isValidStart && isValidEnd) {
    const sameDay =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate();

    if (sameDay) {
      return `${dateFormatter.format(startDate)} • ${timeFormatter.format(startDate)}–${timeFormatter.format(endDate)}`;
    }

    return `${dateFormatter.format(startDate)} • ${timeFormatter.format(startDate)} → ${dateFormatter.format(endDate)} • ${timeFormatter.format(endDate)}`;
  }

  return "Non disponibile";
}

function formatPrice(event) {
  const price =
    event?.price ??
    event?.ticketPrice ??
    event?.pricing?.price ??
    null;

  const currency =
    event?.currency ||
    event?.pricing?.currency ||
    "EUR";

  if (price == null || price === "") {
    return "Non disponibile";
  }

  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice)) {
    return String(price);
  }

  if (numericPrice === 0) {
    return "Gratuito";
  }

  try {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(numericPrice);
  } catch {
    return `${numericPrice} ${currency}`;
  }
}

function formatLocation(event) {
  const parts = [
    event?.venueName,
    event?.locationName,
    event?.address,
    event?.city,
  ]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean);

  return parts.length ? parts.join(" • ") : "Non disponibile";
}

function formatCategory(event) {
  const values = [
    ...toArray(event?.category),
    ...toArray(event?.categories),
    ...toArray(event?.tags),
  ]
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return firstNonEmpty(item.label, item.name, item.title);
      }
      return "";
    })
    .filter(Boolean);

  if (!values.length) return "Non disponibile";

  return Array.from(new Set(values)).join(" • ");
}

function resolveDescription(event) {
  return firstNonEmpty(
    event?.description,
    event?.longDescription,
    event?.summary,
    "Descrizione non disponibile."
  );
}

function resolveTitle(event) {
  return firstNonEmpty(
    event?.title,
    event?.name,
    "Evento"
  );
}

function resolveCover(event) {
  return firstNonEmpty(
    event?.coverImage,
    event?.coverUrl,
    event?.image,
    event?.imageUrl,
    event?.banner,
    event?.bannerUrl
  );
}

function resolvePrivacyLabel(event) {
  if (event?.isPrivate === true || event?.visibility === "private" || event?.type === "private") {
    return "Privato";
  }
  return "Pubblico";
}

function resolveEventStatus(event) {
  const now = Date.now();

  const startRaw =
    event?.startAt ||
    event?.startDate ||
    event?.dateStart ||
    event?.date ||
    event?.startsAt ||
    "";

  const endRaw =
    event?.endAt ||
    event?.endDate ||
    event?.dateEnd ||
    event?.endsAt ||
    "";

  const start = startRaw ? new Date(startRaw).getTime() : NaN;
  const end = endRaw ? new Date(endRaw).getTime() : NaN;

  if (!Number.isNaN(start) && !Number.isNaN(end)) {
    if (now >= start && now <= end) return "In corso";
    if (now < start) {
      const delta = start - now;
      if (delta <= 1000 * 60 * 60 * 24) return "Imminente";
      return "In arrivo";
    }
    if (now > end) return "Concluso";
  }

  if (!Number.isNaN(start)) {
    if (now < start) {
      const delta = start - now;
      if (delta <= 1000 * 60 * 60 * 24) return "Imminente";
      return "In arrivo";
    }
    return "Concluso";
  }

  return "Da confermare";
}

function buildMetaHtml(event) {
  const organizer = firstNonEmpty(
    event?.organizerName,
    event?.organizer?.name,
    event?.createdBy?.name
  );

  const capacity = firstNonEmpty(
    event?.capacity,
    event?.maxParticipants
  );

  const access = resolvePrivacyLabel(event);

  const rows = [
    organizer ? { label: "Organizzatore", value: organizer } : null,
    capacity ? { label: "Capienza", value: capacity } : null,
    access ? { label: "Accesso", value: access } : null,
  ].filter(Boolean);

  if (!rows.length) {
    return "<p>Nessun dettaglio aggiuntivo disponibile.</p>";
  }

  return rows
    .map(
      (row) => `
        <p>
          <strong>${escapeHtml(row.label)}:</strong>
          ${escapeHtml(row.value)}
        </p>
      `
    )
    .join("");
}

function buildMediaHtml(event) {
  const mediaItems = [
    ...toArray(event?.media),
    ...toArray(event?.gallery),
  ].filter(Boolean);

  const normalized = mediaItems
    .map((item) => {
      if (typeof item === "string") {
        return { type: "image", url: item, alt: "Media evento" };
      }

      if (item && typeof item === "object") {
        const url = firstNonEmpty(item.url, item.src, item.image, item.imageUrl);
        if (!url) return null;

        return {
          type: item.type === "video" ? "video" : "image",
          url,
          alt: firstNonEmpty(item.alt, item.caption, "Media evento"),
        };
      }

      return null;
    })
    .filter(Boolean);

  if (!normalized.length) {
    return "";
  }

  return normalized
    .map((item) => {
      if (item.type === "video") {
        return `
          <video controls preload="metadata">
            <source src="${escapeHtml(item.url)}" />
            Il tuo browser non supporta il video.
          </video>
        `;
      }

      return `
        <img
          src="${escapeHtml(item.url)}"
          alt="${escapeHtml(item.alt)}"
          loading="lazy"
        />
      `;
    })
    .join("");
}

function resolveParticipation(event, currentUser) {
  const currentUserId = firstNonEmpty(
    currentUser?._id,
    currentUser?.id
  );

  const participants = toArray(event?.participants);

  if (!currentUserId || !participants.length) {
    return false;
  }

  return participants.some((participant) => {
    if (!participant) return false;

    if (typeof participant === "string") {
      return participant === currentUserId;
    }

    if (typeof participant === "object") {
      const participantId = firstNonEmpty(
        participant._id,
        participant.id,
        participant.userId,
        participant.user?._id,
        participant.user?.id
      );
      return participantId === currentUserId;
    }

    return false;
  });
}

function resolveChatButtonLabel(event) {
  if (event?.isPrivate === true || event?.visibility === "private") {
    return "Apri chat evento";
  }
  return "Apri chat evento";
}

function resolveBackLabel(state) {
  const fromView = String(state?.fromView || "").trim();

  switch (fromView) {
    case "home":
      return "Torna alla Home";
    case "following":
      return "Torna a Eventi seguiti";
    case "map":
      return "Torna alla Mappa";
    case "private-map":
      return "Torna alla Mappa Privati";
    default:
      return "Torna alla schermata precedente";
  }
}
function formatReviewDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function normalizeReviewAuthorId(review) {
  const raw = review?.participant;
  if (!raw) return "";

  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object") {
    return firstNonEmpty(raw._id, raw.id);
  }

  return "";
}
function isSafeInternalPath(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return false;
  if (!normalized.startsWith("/")) return false;
  if (normalized.startsWith("//")) return false;
  return true;
}

function getEventoRootReturnTo() {
  const params = new URLSearchParams(window.location.search);
  const rootReturnTo = String(params.get("rootReturnTo") || "").trim();

  if (isSafeInternalPath(rootReturnTo)) {
    return rootReturnTo;
  }

  return "";
}

function getEventoStructuralParent() {
  return `${window.location.pathname}${window.location.search}`;
}

function buildReviewAuthorUrl(authorId) {
  const safeAuthorId = String(authorId || "").trim();
  if (!safeAuthorId) return "";

  const params = new URLSearchParams();
  params.set("userId", safeAuthorId);

  const rootReturnTo = getEventoRootReturnTo();
  if (rootReturnTo) {
    params.set("rootReturnTo", rootReturnTo);
  }

  const structuralParent = getEventoStructuralParent();
  if (structuralParent) {
    params.set("structuralParent", structuralParent);
  }

  return `/pages/user-public.html?${params.toString()}`;
}
function buildReviewsSummaryHtml(state) {
  const reviews = Array.isArray(state?.reviews) ? state.reviews : [];
  const total = Number(state?.reviewsTotal || reviews.length || 0);

  if (!reviews.length || total <= 0) {
    return "";
  }

  const ratings = reviews
    .map((review) => Number(review?.rating))
    .filter((value) => Number.isFinite(value) && value > 0);

  const average = ratings.length
    ? (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1)
    : "—";

  const label =
    total === 1 ? "1 recensione pubblicata" : `${total} recensioni pubblicate`;

  return `
    <div class="evento-reviews-summary__score">${escapeHtml(average)}</div>
    <div class="evento-reviews-summary__meta">
      <p class="evento-reviews-summary__rating-label">Valutazione media</p>
      <p class="evento-reviews-summary__count">${escapeHtml(label)}</p>
    </div>
  `;
}

function buildReviewCardHtml(review) {
  const authorName = firstNonEmpty(review?.authorName, "Utente");
  const authorStatus = firstNonEmpty(review?.authorStatus);
  const authorId = normalizeReviewAuthorId(review);
  const authorUrl = authorId ? buildReviewAuthorUrl(authorId) : "";
  const rating = Number(review?.rating);
  const ratingLabel = Number.isFinite(rating) ? `${rating}/5` : "—";
  const comment = firstNonEmpty(review?.comment, "Nessun commento disponibile.");
  const dateLabel = formatReviewDate(review?.createdAt);

  return `
    <article class="evento-review-card">
      <div class="evento-review-card__head">
        <div class="evento-review-card__author-block">
          ${
            authorUrl
              ? `<a class="evento-review-card__author-link" href="${escapeHtml(authorUrl)}">${escapeHtml(authorName)}</a>`
              : `<span class="evento-review-card__author">${escapeHtml(authorName)}</span>`
          }
          ${
            authorStatus
              ? `<span class="evento-review-card__status">${escapeHtml(authorStatus)}</span>`
              : ""
          }
        </div>
        <div class="evento-review-card__rating" aria-label="Valutazione ${escapeHtml(ratingLabel)}">
          ${escapeHtml(ratingLabel)}
        </div>
      </div>

      <p class="evento-review-card__comment">${escapeHtml(comment)}</p>

      ${
        dateLabel
          ? `<p class="evento-review-card__date">${escapeHtml(dateLabel)}</p>`
          : ""
      }
    </article>
  `;
}
function createDomRefs(root = document) {
  return {
    loadingState: root.getElementById("eventoLoadingState"),
    errorState: root.getElementById("eventoErrorState"),
    notFoundState: root.getElementById("eventoNotFoundState"),

    cover: root.getElementById("eventoCover"),
    privacyBadge: root.getElementById("eventoPrivacyBadge"),
    statusBadge: root.getElementById("eventoStatusBadge"),

    kicker: root.getElementById("eventoKicker"),
    title: root.getElementById("eventoTitle"),
    dateSummary: root.getElementById("eventoDateSummary"),
    locationSummary: root.getElementById("eventoLocationSummary"),

    participationButton: root.getElementById("eventoToggleParticipationButton"),
    openChatButton: root.getElementById("eventoOpenChatButton"),

    description: root.getElementById("eventoDescription"),
    schedule: root.getElementById("eventoSchedule"),
    location: root.getElementById("eventoLocation"),
    pricing: root.getElementById("eventoPricing"),
    taxonomy: root.getElementById("eventoTaxonomy"),
    meta: root.getElementById("eventoMeta"),

    mediaSection: root.getElementById("eventoMediaSection"),
    media: root.getElementById("eventoMedia"),

    reviewsSection: root.getElementById("eventoReviewsSection"),
    reviewsLoading: root.getElementById("eventoReviewsLoading"),
    reviewsSummary: root.getElementById("eventoReviewsSummary"),
    reviewsEmpty: root.getElementById("eventoReviewsEmpty"),
    reviewsList: root.getElementById("eventoReviewsList"),

    backButton: root.getElementById("eventoBackButton"),
    backFooterButton: root.getElementById("eventoBackFooterButton"),
  };
}

function renderPageStates(refs, state) {
  setHidden(refs.loadingState, !state.isLoading);
  setHidden(refs.errorState, state.isLoading || !state.error);
  setHidden(refs.notFoundState, state.isLoading || !state.notFound);

  if (refs.errorState && state.error) {
    refs.errorState.textContent = state.error;
  }
}

function renderHero(refs, state) {
  const event = state.event || null;
  if (!event) return;

  const title = resolveTitle(event);
  const privacyLabel = resolvePrivacyLabel(event);
  const statusLabel = resolveEventStatus(event);
  const coverUrl = resolveCover(event);

  setText(refs.kicker, "Evento");
  setText(refs.title, title, "Evento");
  setText(refs.dateSummary, formatDateTimeRange(event), "Non disponibile");
  setText(refs.locationSummary, formatLocation(event), "Non disponibile");

  if (refs.cover) {
    if (coverUrl) {
      refs.cover.src = coverUrl;
      refs.cover.alt = title;
    } else {
      refs.cover.removeAttribute("src");
      refs.cover.alt = title;
    }
  }

  if (refs.privacyBadge) {
    refs.privacyBadge.textContent = privacyLabel;
    refs.privacyBadge.hidden = false;
  }

  if (refs.statusBadge) {
    refs.statusBadge.textContent = statusLabel;
    refs.statusBadge.hidden = false;
  }
}

function renderActions(refs, state) {
  const event = state.event || null;
  if (!event) return;

  const isParticipant = resolveParticipation(event, state.currentUser);
  const isBusy = state.isJoining || state.isLeaving;

  if (refs.participationButton) {
    refs.participationButton.textContent = isParticipant ? "Lascia evento" : "Partecipa";
    refs.participationButton.disabled = isBusy || state.isOpeningChat;
    refs.participationButton.dataset.action = isParticipant ? "leave" : "join";
    refs.participationButton.setAttribute(
      "aria-label",
      isParticipant ? "Lascia evento" : "Partecipa all'evento"
    );
  }

  if (refs.openChatButton) {
    refs.openChatButton.textContent = state.isOpeningChat
      ? "Apertura chat…"
      : resolveChatButtonLabel(event);
    refs.openChatButton.disabled = state.isOpeningChat || state.isJoining || state.isLeaving;
  }

  const backLabel = resolveBackLabel(state);
  if (refs.backFooterButton) {
    refs.backFooterButton.textContent = backLabel;
  }
  if (refs.backButton) {
    refs.backButton.setAttribute("aria-label", backLabel);
    refs.backButton.setAttribute("title", backLabel);
  }
}

function renderContent(refs, state) {
  const event = state.event || null;
  if (!event) return;

  setHtml(refs.description, `<p>${escapeHtml(resolveDescription(event))}</p>`, "<p>Descrizione non disponibile.</p>");
  setText(refs.schedule, formatDateTimeRange(event), "Non disponibile");
  setText(refs.location, formatLocation(event), "Non disponibile");
  setText(refs.pricing, formatPrice(event), "Non disponibile");
  setText(refs.taxonomy, formatCategory(event), "Non disponibile");
  setHtml(refs.meta, buildMetaHtml(event), "<p>Nessun dettaglio aggiuntivo disponibile.</p>");

  const mediaHtml = buildMediaHtml(event);
  if (refs.mediaSection) {
    refs.mediaSection.hidden = !mediaHtml;
  }
  if (refs.media) {
    refs.media.innerHTML = mediaHtml;
  }
}
function renderReviews(refs, state) {
  const reviews = Array.isArray(state?.reviews) ? state.reviews : [];
  const hasReviews = reviews.length > 0;
  const reviewsError = String(state?.reviewsError || "").trim();

  if (refs.reviewsSection) {
    refs.reviewsSection.hidden = false;
  }

  if (refs.reviewsLoading) {
    refs.reviewsLoading.hidden = !state.isReviewsLoading;
    refs.reviewsLoading.textContent = "Caricamento recensioni…";
  }

  if (refs.reviewsSummary) {
    const summaryHtml = buildReviewsSummaryHtml(state);
    refs.reviewsSummary.innerHTML = summaryHtml;
    refs.reviewsSummary.hidden = state.isReviewsLoading || !summaryHtml;
  }

  if (refs.reviewsList) {
    refs.reviewsList.hidden = state.isReviewsLoading || !hasReviews;
    refs.reviewsList.innerHTML = hasReviews
      ? reviews.map((review) => `<li>${buildReviewCardHtml(review)}</li>`).join("")
      : "";
  }

  if (refs.reviewsEmpty) {
    refs.reviewsEmpty.hidden = state.isReviewsLoading || hasReviews;
    refs.reviewsEmpty.textContent = reviewsError
      ? "Le recensioni non sono disponibili in questo momento."
      : "Non ci sono ancora recensioni pubblicate per questo evento.";
  }
}
function renderEmptyContent(refs) {
  setText(refs.kicker, "Evento");
  setText(refs.title, "Evento");
  setText(refs.dateSummary, "Non disponibile");
  setText(refs.locationSummary, "Non disponibile");

  if (refs.cover) {
    refs.cover.removeAttribute("src");
    refs.cover.alt = "Immagine evento";
  }

  if (refs.privacyBadge) refs.privacyBadge.hidden = true;
  if (refs.statusBadge) refs.statusBadge.hidden = true;

  if (refs.description) {
    refs.description.innerHTML = "<p>Descrizione non disponibile.</p>";
  }

  setText(refs.schedule, "Non disponibile");
  setText(refs.location, "Non disponibile");
  setText(refs.pricing, "Non disponibile");
  setText(refs.taxonomy, "Non disponibile");

  if (refs.meta) {
    refs.meta.innerHTML = "<p>Nessun dettaglio aggiuntivo disponibile.</p>";
  }

  if (refs.mediaSection) refs.mediaSection.hidden = true;
  if (refs.media) refs.media.innerHTML = "";

  if (refs.reviewsSection) refs.reviewsSection.hidden = false;
  if (refs.reviewsLoading) {
    refs.reviewsLoading.hidden = true;
    refs.reviewsLoading.textContent = "Caricamento recensioni…";
  }
  if (refs.reviewsSummary) {
    refs.reviewsSummary.hidden = true;
    refs.reviewsSummary.innerHTML = "";
  }
  if (refs.reviewsList) {
    refs.reviewsList.hidden = true;
    refs.reviewsList.innerHTML = "";
  }
  if (refs.reviewsEmpty) {
    refs.reviewsEmpty.hidden = false;
    refs.reviewsEmpty.textContent = "Non ci sono ancora recensioni pubblicate per questo evento.";
  }

  if (refs.participationButton) {
    refs.participationButton.textContent = "Partecipa";
    refs.participationButton.disabled = true;
    refs.participationButton.dataset.action = "join";
  }

  if (refs.openChatButton) {
    refs.openChatButton.textContent = "Apri chat evento";
    refs.openChatButton.disabled = true;
  }

  const fallbackBack = "Torna alla schermata precedente";
  if (refs.backFooterButton) refs.backFooterButton.textContent = fallbackBack;
  if (refs.backButton) {
    refs.backButton.setAttribute("aria-label", fallbackBack);
    refs.backButton.setAttribute("title", fallbackBack);
  }
}

export function createEventoRenderer(root = document) {
  const refs = createDomRefs(root);

  function render(state) {
    renderPageStates(refs, state);

    const canRenderReadyState =
      !state.isLoading &&
      !state.error &&
      !state.notFound &&
      state.event;

    if (!canRenderReadyState) {
      renderEmptyContent(refs);
      return;
    }

    renderHero(refs, state);
    renderActions(refs, state);
    renderContent(refs, state);
    renderReviews(refs, state);
  }

  return {
    refs,
    render,
  };
    }
