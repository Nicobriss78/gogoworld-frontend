import {
  apiGet,
  apiPost,
  apiDelete,
  apiErrorMessage,
  getPublicProfile,
} from "/js/api.js";

function ensureUserId(userId) {
  const safeUserId = String(userId || "").trim();
  if (!safeUserId) {
    throw new Error("USER_PUBLIC_USER_ID_REQUIRED");
  }
  return safeUserId;
}

export async function fetchPublicProfile(userId) {
  const safeUserId = ensureUserId(userId);
  const result = await getPublicProfile(safeUserId);

  if (!result?.ok) {
    throw new Error(
      apiErrorMessage(result, "Impossibile caricare il profilo pubblico")
    );
  }

  return result?.data || null;
}

export async function fetchUserActivity(userId) {
  const safeUserId = ensureUserId(userId);
  const result = await apiGet(
    `/users/${encodeURIComponent(safeUserId)}/activity`
  );

  if (result?.ok) {
    return {
      items: Array.isArray(result?.data) ? result.data : [],
      activityPrivate: false,
    };
  }

  if (result?.status === 403 && result?.error === "activity_private") {
    return {
      items: [],
      activityPrivate: true,
    };
  }

  throw new Error(
    apiErrorMessage(result, "Impossibile caricare l'attività utente")
  );
}

export async function followUser(userId) {
  const safeUserId = ensureUserId(userId);
  const result = await apiPost(
    `/users/${encodeURIComponent(safeUserId)}/follow`,
    {}
  );

  if (!result?.ok) {
    throw new Error(
      apiErrorMessage(result, "Impossibile seguire questo utente")
    );
  }

  return !!result?.following;
}

export async function unfollowUser(userId) {
  const safeUserId = ensureUserId(userId);
  const result = await apiDelete(
    `/users/${encodeURIComponent(safeUserId)}/follow`
  );

  if (!result?.ok) {
    throw new Error(
      apiErrorMessage(result, "Impossibile smettere di seguire questo utente")
    );
  }

  return !!result?.following;
}
