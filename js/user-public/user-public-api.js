/**
 * user-public-api.js
 * Gestisce tutte le chiamate API per la pagina user-public.
 * Nessuna logica di rendering o orchestrazione.
 */

const API_BASE = '/api';

/**
 * Recupera il token JWT dal localStorage.
 * Se non presente, restituisce null.
 */
function getAuthToken() {
  return localStorage.getItem('token');
}

/**
 * Helper per effettuare richieste fetch con gestione standardizzata.
 */
async function apiRequest(url, options = {}) {
  const token = getAuthToken();

  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  let data;
  try {
    data = await response.json();
  } catch (e) {
    throw new Error('Risposta non valida dal server');
  }

  if (!response.ok || data.ok === false) {
    const error = new Error(data?.error || 'Errore nella richiesta API');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data.data;
}

/**
 * Recupera il profilo pubblico di un utente.
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function fetchPublicProfile(userId) {
  return apiRequest(`${API_BASE}/users/${userId}/public`);
}

/**
 * Recupera le attività pubbliche dell’utente.
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function fetchUserActivity(userId) {
  try {
    return await apiRequest(`${API_BASE}/users/${userId}/activity`);
  } catch (error) {
    // Gestione specifica per bacheca privata
    if (error.status === 403 && error.data?.error === 'activity_private') {
      return { activityPrivate: true };
    }
    throw error;
  }
}

/**
 * Segue un utente.
 * @param {string} userId
 * @returns {Promise<boolean>} Stato following
 */
export async function followUser(userId) {
  const result = await apiRequest(
    `${API_BASE}/users/${userId}/follow`,
    {
      method: 'POST'
    }
  );
  return result.following;
}

/**
 * Smette di seguire un utente.
 * @param {string} userId
 * @returns {Promise<boolean>} Stato following
 */
export async function unfollowUser(userId) {
  const result = await apiRequest(
    `${API_BASE}/users/${userId}/follow`,
    {
      method: 'DELETE'
    }
  );
  return result.following;
}
