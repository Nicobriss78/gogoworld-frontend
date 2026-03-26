const PROFILE_ENDPOINT = "/api/users/me";
const PROFILE_CONNECTIONS_ENDPOINT = "/api/users/me/connections";
const PROFILE_VERIFY_RESEND_ENDPOINT = "/api/users/me/resend-verification";

function getAuthToken() {
  return localStorage.getItem("token") || "";
}

function buildHeaders(extraHeaders = {}) {
  const token = getAuthToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

async function parseJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      "Operazione non riuscita";
    throw new Error(message);
  }

  return payload;
}

function normalizeProfilePayload(payload) {
  const user = payload?.user || payload || {};

  return {
    id: user._id || user.id || "",
    nickname: user.nickname || user.username || user.name || "",
    roleLabel: user.roleLabel || user.role || "Esploratore",
    publicRole: user.publicRole || "Partecipante",
    avatarUrl: user.avatarUrl || user.avatar || "",
    locationLabel:
      user.locationLabel ||
      [user.city, user.region].filter(Boolean).join(", "),
    bio: user.bio || "",
    birthYear: user.birthYear || "",
    region: user.region || "",
    city: user.city || "",
    languages: Array.isArray(user.languages)
      ? user.languages.join(", ")
      : user.languages || "",
    interests: Array.isArray(user.interests)
      ? user.interests.join(", ")
      : user.interests || "",
    socials: Array.isArray(user.socials)
      ? user.socials.join(", ")
      : user.socials || "",
    allowDirectMessages: Boolean(user.allowDirectMessages),
    dmsFrom: user.dmsFrom || "everyone",
  };
}

function normalizeAccountStatusPayload(payload) {
  const source = payload?.user || payload || {};

  return {
    emailVerified: Boolean(source.emailVerified),
    emailStatusLabel: source.emailVerified
      ? "Email verificata"
      : "Email non verificata",
    profileCompletionLabel:
      source.profileCompletionLabel ||
      source.profileCompletion ||
      "Profilo incompleto",
    canResendVerification: !source.emailVerified,
  };
}

function normalizeConnectionUser(user) {
  return {
    id: user?._id || user?.id || "",
    nickname: user?.nickname || user?.username || user?.name || "Utente",
    avatarUrl: user?.avatarUrl || user?.avatar || "",
    sub: user?.sub || user?.role || "",
  };
}

function normalizeConnectionsPayload(payload) {
  const followers = Array.isArray(payload?.followers)
    ? payload.followers.map(normalizeConnectionUser)
    : [];

  const following = Array.isArray(payload?.following)
    ? payload.following.map(normalizeConnectionUser)
    : [];

  return {
    followersCount:
      payload?.followersCount ?? followers.length ?? 0,
    followingCount:
      payload?.followingCount ?? following.length ?? 0,
    followers,
    following,
  };
}

function buildProfileUpdateBody(profileInput) {
  return {
    nickname: profileInput.nickname || "",
    birthYear: profileInput.birthYear || "",
    region: profileInput.region || "",
    city: profileInput.city || "",
    bio: profileInput.bio || "",
    languages: profileInput.languages || "",
    interests: profileInput.interests || "",
    socials: profileInput.socials || "",
    allowDirectMessages: Boolean(profileInput.allowDirectMessages),
    dmsFrom: profileInput.dmsFrom || "everyone",
  };
}

export async function fetchProfile() {
  const response = await fetch(PROFILE_ENDPOINT, {
    method: "GET",
    headers: buildHeaders(),
  });

  const payload = await parseJsonResponse(response);

  return {
    profile: normalizeProfilePayload(payload),
    accountStatus: normalizeAccountStatusPayload(payload),
  };
}

export async function fetchProfileConnections() {
  const response = await fetch(PROFILE_CONNECTIONS_ENDPOINT, {
    method: "GET",
    headers: buildHeaders(),
  });

  const payload = await parseJsonResponse(response);
  return normalizeConnectionsPayload(payload);
}

export async function updateProfile(profileInput) {
  const response = await fetch(PROFILE_ENDPOINT, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(buildProfileUpdateBody(profileInput)),
  });

  const payload = await parseJsonResponse(response);

  return {
    profile: normalizeProfilePayload(payload),
    accountStatus: normalizeAccountStatusPayload(payload),
  };
}

export async function resendVerificationEmail() {
  const response = await fetch(PROFILE_VERIFY_RESEND_ENDPOINT, {
    method: "POST",
    headers: buildHeaders(),
  });

  const payload = await parseJsonResponse(response);

  return {
    message:
      payload?.message || "Email di verifica inviata con successo.",
  };
    }
