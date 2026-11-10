const MY_PROFILE_ENDPOINT = "/api/profile/me";
const MY_ACCOUNT_ENDPOINT = "/api/users/me";
const VERIFY_RESEND_ENDPOINT = "/api/users/me/verify/resend";
const MY_AVATAR_ENDPOINT = "/api/profile/me/avatar";

function getAuthToken() {
  return localStorage.getItem("token") || "";
}

function buildHeaders(extraHeaders = {}) {
  const token = getAuthToken();

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

function buildJsonHeaders(extraHeaders = {}) {
  return buildHeaders({
    "Content-Type": "application/json",
    ...extraHeaders,
  });
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      payload?.details ||
      response.statusText ||
      "Operazione non riuscita";
    throw new Error(message);
  }

  return payload;
}

function asCommaString(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return typeof value === "string" ? value : "";
}

function normalizeAvatarUrl(value) {
  if (typeof value !== "string") {
    return "";
  }

  const url = value.trim();
  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) {
    return url;
  }

  const API_ROOT =
    (typeof window !== "undefined" && window.__API_BASE__?.replace(/\/api\/?$/, "")) ||
    "https://gogoworld-api.onrender.com";

  if (url.startsWith("/api/uploads/") || url.startsWith("/uploads/")) {
    return `${API_ROOT}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  if (url.startsWith("/")) {
    return `${API_ROOT}${url}`;
  }

  return `${API_ROOT}/${url.replace(/^\/+/, "")}`;
}

function parseCsvToArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLinesToArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeProfilePayload(payload) {
  const source =
    payload?.data ||
    payload?.profile ||
    payload?.user ||
    payload ||
    {};

  return {
    id: source._id || source.id || source.userId || "",
    nickname: source.nickname || source.username || source.name || "",
    roleLabel: source.roleLabel || source.role || "Esploratore",
    publicRole: source.publicRole || "Partecipante",
    avatarUrl: normalizeAvatarUrl(
      source.avatarUrl || source.avatar || source.photoURL
    ),
    locationLabel:
      source.locationLabel ||
      [source.city, source.region].filter(Boolean).join(", "),
    bio: source.bio || "",
    birthYear: source.birthYear || "",
    region: source.region || "",
    city: source.city || "",
    languages: asCommaString(source.languages),
    interests: asCommaString(source.interests),
    socials: asCommaString(source.socials),
    allowDirectMessages: Boolean(
      source.privacy?.optInDM ??
      source.allowDirectMessages ??
      source.dmEnabled ??
      source.directMessagesEnabled
    ),
    dmsFrom:
      source.privacy?.dmsFrom ||
      source.dmsFrom ||
      source.dmPrivacy ||
      "everyone",
  };
}

function normalizeAccountPayload(payload) {
  const source = payload?.user || payload || {};

  return {
    id: source._id || source.id || "",
    nickname: source.nickname || source.username || source.name || "",
    roleLabel: source.role || "Esploratore",
    emailVerified: Boolean(source.verified ?? source.emailVerified),
    emailStatusLabel:
      Boolean(source.verified ?? source.emailVerified)
        ? "Email verificata"
        : "Email non verificata",
    profileCompletionLabel:
      source.profileCompletionLabel ||
      source.profileCompletion ||
      "Profilo incompleto",
    canResendVerification: !Boolean(source.verified ?? source.emailVerified),
    followersCount: Number(source.followersCount || 0),
    followingCount: Array.isArray(source.following)
      ? source.following.length
      : Number(source.followingCount || 0),
  };
}

function normalizeConnectionUser(user) {
  return {
    id: user?._id || user?.id || "",
    nickname: user?.nickname || user?.username || user?.name || "Utente",
    avatarUrl: normalizeAvatarUrl(
      user?.profile?.avatarUrl ||
      user?.avatarUrl ||
      user?.avatar ||
      user?.photoURL
    ),
    sub:
      [user?.profile?.city, user?.profile?.region]
        .filter(Boolean)
        .join(" • ") ||
      user?.role ||
      "",
  };
}

function normalizeConnectionList(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.users)
    ? payload.users
    : Array.isArray(payload?.followers)
    ? payload.followers
    : Array.isArray(payload?.following)
    ? payload.following
    : [];

  return items.map(normalizeConnectionUser);
}

function normalizeProfileUpdateBody(profileInput) {
  return {
    nickname: profileInput.nickname || "",
    birthYear: profileInput.birthYear || "",
    region: profileInput.region || "",
    city: profileInput.city || "",
    bio: profileInput.bio || "",
    languages: parseCsvToArray(profileInput.languages),
    interests: parseCsvToArray(profileInput.interests),
    socials: parseLinesToArray(profileInput.socials),
    privacy: {
      optInDM: Boolean(profileInput.allowDirectMessages),
      dmsFrom: profileInput.dmsFrom || "everyone",
    },
  };
}

export async function fetchMyProfile() {
  const response = await fetch(MY_PROFILE_ENDPOINT, {
    method: "GET",
    headers: buildHeaders(),
  });

  const payload = await parseResponse(response);
  return normalizeProfilePayload(payload);
}

export async function fetchMyAccountStatus() {
  const response = await fetch(MY_ACCOUNT_ENDPOINT, {
    method: "GET",
    headers: buildHeaders(),
  });

  const payload = await parseResponse(response);
  return normalizeAccountPayload(payload);
}

export async function saveMyProfile(profileInput) {
  const response = await fetch(MY_PROFILE_ENDPOINT, {
    method: "PUT",
    headers: buildJsonHeaders(),
    body: JSON.stringify(normalizeProfileUpdateBody(profileInput)),
  });

  const payload = await parseResponse(response);
  return normalizeProfilePayload(payload);
}

export async function uploadMyAvatar(file) {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await fetch(MY_AVATAR_ENDPOINT, {
    method: "POST",
    headers: buildHeaders(),
    body: formData,
  });

  const payload = await parseResponse(response);
  return normalizeProfilePayload(payload);
}

export async function resendEmailVerification() {
  // FE-PKT-03: richiesta autenticata, un solo POST, nessun retry o email scelta dal client.
  // Manteniamo la politica attuale del profilo V2 (token da localStorage).
  let token = "";
  try {
    token = getAuthToken();
  } catch (_) {}

  if (!token) {
    const error = new Error("Per richiedere un nuovo link, accedi nuovamente.");
    error.status = 401;
    throw error;
  }

  let response;
  try {
    response = await fetch(VERIFY_RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (_) {
    const error = new Error("Impossibile confermare la richiesta. Controlla lo stato dell'account prima di ripetere.");
    error.status = 0;
    throw error;
  }

  if (!response.ok) {
    // Messaggi locali fissi: non riflettere payload o dettagli server nel DOM.
    const message = response.status === 401
      ? "Sessione non valida. Accedi nuovamente."
      : response.status === 503
        ? "Servizio di verifica temporaneamente non disponibile. Riprova più tardi."
        : response.status === 429
          ? "Troppe richieste. Riprova più tardi."
          : "Impossibile richiedere un nuovo link di verifica. Riprova più tardi.";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (_) {
    const error = new Error("Risposta non confermata. Controlla lo stato dell'account prima di ripetere.");
    error.status = response.status;
    throw error;
  }

  if (payload?.ok !== true) {
    const error = new Error("Risposta non confermata. Controlla lo stato dell'account prima di ripetere.");
    error.status = response.status;
    throw error;
  }

  // ok:true e' un esito neutro: non certifica la consegna dell'email.
  return {
    message: "Richiesta ricevuta. Se la verifica è ancora necessaria e il servizio è disponibile, riceverai un'email.",
  };
}

export async function fetchMyFollowers(userId) {
  if (!userId) {
    return [];
  }

  const response = await fetch(
    `/api/users/${encodeURIComponent(userId)}/followers`,
    {
      method: "GET",
      headers: buildHeaders(),
    }
  );

  const payload = await parseResponse(response);
  return normalizeConnectionList(payload);
}

export async function fetchMyFollowing(userId) {
  if (!userId) {
    return [];
  }

  const response = await fetch(
    `/api/users/${encodeURIComponent(userId)}/following`,
    {
      method: "GET",
      headers: buildHeaders(),
    }
  );

  const payload = await parseResponse(response);
  return normalizeConnectionList(payload);
}

export async function fetchMyConnections(userId) {
  const [followers, following] = await Promise.all([
    fetchMyFollowers(userId),
    fetchMyFollowing(userId),
  ]);

  return {
    followersCount: followers.length,
    followingCount: following.length,
    followers,
    following,
  };
}

export function buildMyPublicProfileUrl(userId) {
  if (!userId) {
    return "";
  }

  return `/pages/user-public.html?userId=${encodeURIComponent(userId)}&self=1&rootReturnTo=${encodeURIComponent("/pages/profilo-v2.html")}`;
}
