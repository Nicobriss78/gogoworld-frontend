import { getToken } from "/js/auth.js";

export async function searchEventCoordinates(payload) {
  const token = getToken();

  const response = await fetch("/api/geocode/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 429) {
    throw new Error("Troppe richieste. Attendi qualche secondo e riprova.");
  }

  if (response.status === 400) {
    throw new Error("Inserisci almeno un luogo, una città o un indirizzo valido.");
  }

  if (response.status === 502) {
    throw new Error("Servizio coordinate temporaneamente non disponibile.");
  }

  if (!response.ok) {
    throw new Error("Impossibile cercare le coordinate.");
  }

  return response.json();
}
