function isValidOptionalNumber(value) {
  const raw = String(value || "").trim();

  if (!raw) return true;

  return Number.isFinite(Number(raw.replace(",", ".")));
}

function isValidOptionalUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) return true;

  try {
    const url = new URL(raw);
    return url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function areValidPipeUrls(value) {
  const raw = String(value || "").trim();

  if (!raw) return true;

  return raw
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
    .every(isValidOptionalUrl);
}

export function validateEventForm(event) {
  const errors = [];

  if (!event.title?.trim()) errors.push("Il titolo è obbligatorio.");
  if (!event.description?.trim()) errors.push("La descrizione è obbligatoria.");
  if (!event.category?.trim()) errors.push("La categoria è obbligatoria.");
  if (!event.city?.trim()) errors.push("La città è obbligatoria.");
  if (!event.region?.trim()) errors.push("La regione è obbligatoria.");
  if (!event.country?.trim()) errors.push("Il paese è obbligatorio.");
  if (!event.language?.trim()) errors.push("La lingua è obbligatoria.");
  if (!event.target?.trim()) errors.push("Il target è obbligatorio.");

  if (!event.dateStart) errors.push("La data di inizio è obbligatoria.");
  if (!event.dateEnd) errors.push("La data di fine è obbligatoria.");

  if (event.dateStart && event.dateEnd) {
    const start = new Date(event.dateStart);
    const end = new Date(event.dateEnd);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      errors.push("Le date inserite non sono valide.");
    } else if (end <= start) {
      errors.push("La data di fine deve essere successiva alla data di inizio.");
    }
  }

  if (event.isPrivate && !event.accessCode?.trim()) {
    errors.push("Il codice evento privato è obbligatorio.");
  }

  if (!isValidOptionalNumber(event.lat)) {
    errors.push("La latitudine non è valida.");
  }

  if (!isValidOptionalNumber(event.lon)) {
    errors.push("La longitudine non è valida.");
  }

  if (!event.isFree) {
    const price = Number(String(event.price || "").replace(",", "."));

    if (!Number.isFinite(price) || price <= 0) {
      errors.push("Il prezzo deve essere maggiore di zero.");
    }
  }

  if (!areValidPipeUrls(event.images)) {
    errors.push("Le immagini devono essere URL https validi separati da |.");
  }

  if (!isValidOptionalUrl(event.coverImage)) {
    errors.push("L'immagine di copertina deve essere un URL https valido.");
  }

  return errors;
}
