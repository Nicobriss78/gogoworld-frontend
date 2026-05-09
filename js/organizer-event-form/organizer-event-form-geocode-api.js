const API_BASE = window.API_BASE || "https://gogoworld-api.onrender.com/api";

function getToken() {
  return localStorage.getItem("token");
}

export async function searchEventCoordinates(payload) {
  const token = getToken();

  const response = await fetch(`${API_BASE}/geocode/search`, {
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
export async function reverseEventCoordinates(payload) {
  const token = getToken();

  const response = await fetch(`${API_BASE}/geocode/reverse`, {
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
    throw new Error("Coordinate non valide.");
  }

  if (response.status === 502) {
    throw new Error("Servizio posizione temporaneamente non disponibile.");
  }

  if (!response.ok) {
    throw new Error("Impossibile leggere la posizione.");
  }

  return response.json();
}
