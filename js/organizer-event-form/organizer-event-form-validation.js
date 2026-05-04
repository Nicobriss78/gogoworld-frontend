export function validateEventForm(event) {
  const errors = [];

  if (!event.title?.trim()) {
    errors.push("Il titolo è obbligatorio.");
  }

  if (!event.description?.trim()) {
    errors.push("La descrizione è obbligatoria.");
  }

  if (!event.dateStart) {
    errors.push("La data di inizio è obbligatoria.");
  }

  if (!event.dateEnd) {
    errors.push("La data di fine è obbligatoria.");
  }

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

  if (!event.isFree) {
    const price = Number(event.price);

    if (!Number.isFinite(price) || price <= 0) {
      errors.push("Il prezzo deve essere maggiore di zero.");
    }
  }

  return errors;
}
