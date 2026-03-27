const MY_PROFILE_ENDPOINT = "/api/profile/me";
const MY_ACCOUNT_ENDPOINT = "/api/users/me";
const VERIFY_RESEND_ENDPOINT = "/api/users/verify/resend";
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
  return typeof value === "string" ? value : "";
}

function normalizeProfilePayload(payload) {
  const root =
    payload?.data ||
    payload?.profile ||
    payload?.user ||
    payload ||
    {};

  const profile = root.profile || {};

  return {
    id: root._id || root.id || root.userId || "",

    nickname:
      root.nickname ||
      root.username ||
      root.name ||
      "",

    roleLabel: root.roleLabel || root.role || "Esploratore",
    publicRole: root.publicRole || "Partecipante",

    avatarUrl: normalizeAvatarUrl(
      profile.avatarUrl ||
      root.avatarUrl ||
      root.avatar ||
      root.photoURL
    ),

    locationLabel:
      profile.locationLabel ||
      [profile.city, profile.region].filter(Boolean).join(", "),

    bio: profile.bio || "",

    birthYear: root.birthYear || "",

    region: profile.region || "",
    city: profile.city || "",

    languages: asCommaString(profile.languages),
    interests: asCommaString(profile.interests),
    socials: asCommaString(profile.socials),

    allowDirectMessages: Boolean(
      profile?.privacy?.optInDM ??
      root.allowDirectMessages ??
      root.dmEnabled
    ),

    dmsFrom:
      profile?.privacy?.dmsFrom ||
      root.dmsFrom ||
      root.dmPrivacy ||
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
    avatarUrl: normalizeAvatarUrl(user?.avatarUrl || user?.avatar || user?.photoURL),
    sub: user?.bio || user?.role || "",
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
    languages: profileInput.languages || "",
    interests: profileInput.interests || "",
    socials: profileInput.socials || "",
    allowDirectMessages: Boolean(profileInput.allowDirectMessages),
    dmsFrom: profileInput.dmsFrom || "everyone",
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
  const response = await fetch(VERIFY_RESEND_ENDPOINT, {
    method: "POST",
    headers: buildHeaders(),
  });

  const payload = await parseResponse(response);

  return {
    message: payload?.message || "Email di verifica inviata con successo.",
  };
}

export async function fetchMyFollowers(userId) {
  if (!userId) {
    return [];
  }

  const response = await fetch(`/api/users/${encodeURIComponent(userId)}/followers`, {
    method: "GET",
    headers: buildHeaders(),
  });

  const payload = await parseResponse(response);
  return normalizeConnectionList(payload);
}

export async function fetchMyFollowing(userId) {
  if (!userId) {
    return [];
  }

  const response = await fetch(`/api/users/${encodeURIComponent(userId)}/following`, {
    method: "GET",
    headers: buildHeaders(),
  });

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

return `/pages/user-public.html?userId=${encodeURIComponent(userId)}`;    }
  
