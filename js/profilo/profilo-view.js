function getElement(id) {
  return document.getElementById(id);
}

function getRequiredElement(id) {
  const el = getElement(id);
  if (!el) {
    throw new Error(`Elemento DOM mancante: ${id}`);
  }
  return el;
}

/* =========================================================
   HERO / SUMMARY
   ========================================================= */

export function getHeroElements() {
  return {
    avatar: getRequiredElement("profiloAvatar"),
    name: getRequiredElement("profiloHeroTitle"),
    role: getRequiredElement("profiloRole"),
    location: getRequiredElement("profiloLocation"),
    bio: getRequiredElement("profiloBio"),
    editButton: getRequiredElement("profiloEditButton"),
    publicBoardButton: getRequiredElement("profiloPublicBoardButton"),
  };
}

/* =========================================================
   MESSAGE AREA
   ========================================================= */

export function getMessageAreaElement() {
  return getRequiredElement("profiloMessageArea");
}

/* =========================================================
   ACCOUNT STATUS
   ========================================================= */

export function getAccountStatusElements() {
  return {
    emailStatus: getRequiredElement("profiloEmailStatus"),
    resendVerifyButton: getRequiredElement("profiloResendVerifyButton"),
    l2Status: getRequiredElement("profiloL2Status"),
  };
}

/* =========================================================
   CONNECTIONS
   ========================================================= */

export function getConnectionsElements() {
  return {
    followersCount: getRequiredElement("profiloFollowersCount"),
    followingCount: getRequiredElement("profiloFollowingCount"),
    followersList: getRequiredElement("profiloFollowersList"),
    followingList: getRequiredElement("profiloFollowingList"),
  };
}

/* =========================================================
   EDITOR
   ========================================================= */

export function getEditorElements() {
  return {
    section: getRequiredElement("profiloEditorSection"),
    form: getRequiredElement("profiloForm"),

    avatarInput: getRequiredElement("profiloAvatarInput"),
    avatarPreview: getRequiredElement("profiloAvatarPreview"),

    nicknameInput: getRequiredElement("profiloNicknameInput"),
    birthYearInput: getRequiredElement("profiloBirthYearInput"),
    regionInput: getRequiredElement("profiloRegionInput"),
    cityInput: getRequiredElement("profiloCityInput"),

    bioInput: getRequiredElement("profiloBioInput"),
    languagesInput: getRequiredElement("profiloLanguagesInput"),
    interestsInput: getRequiredElement("profiloInterestsInput"),
    socialsInput: getRequiredElement("profiloSocialsInput"),

    dmEnabledInput: getRequiredElement("profiloDmEnabledInput"),
    dmsFromInput: getRequiredElement("profiloDmsFromInput"),

    saveButton: getRequiredElement("profiloSaveButton"),
    cancelButton: getRequiredElement("profiloCancelButton"),
  };
}
