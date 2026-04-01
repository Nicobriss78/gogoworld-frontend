import {
  getProfileState,
  setProfileData,
  patchAccountStatus,
  setConnections,
  patchUiState,
  setProfileMessage,
  setProfileError,
  clearProfileFeedback,
} from "./profilo-state.js";

import {
  fetchMyProfile,
  fetchMyAccountStatus,
  saveMyProfile,
  uploadMyAvatar,
  resendEmailVerification,
  fetchMyConnections,
  buildMyPublicProfileUrl,
} from "./profilo-api.js";

import {
  getHeroElements,
  getAccountStatusElements,
  getEditorElements,
} from "./profilo-view.js";

import { renderProfile } from "./profilo-renderer.js";
/* =========================================================
   RENDER PIPELINE
   ========================================================= */

function render() {
  renderProfile(getProfileState());
}

/* =========================================================
   FORM HELPERS
   ========================================================= */

function readProfileFormValues() {
  const {
    nicknameInput,
    birthYearInput,
    regionInput,
    cityInput,
    bioInput,
    languagesInput,
    interestsInput,
    socialsInput,
    dmEnabledInput,
    dmsFromInput,
  } = getEditorElements();

  return {
    nickname: nicknameInput.value.trim(),
    birthYear: birthYearInput.value.trim(),
    region: regionInput.value.trim(),
    city: cityInput.value.trim(),
    bio: bioInput.value.trim(),
    languages: languagesInput.value.trim(),
    interests: interestsInput.value.trim(),
    socials: socialsInput.value.trim(),
    allowDirectMessages: dmEnabledInput.checked,
    dmsFrom: dmsFromInput.value,
  };
}

function openEditor() {
  clearProfileFeedback();
  patchUiState({ editing: true });
  render();
}

function closeEditor() {
  clearProfileFeedback();
  patchUiState({ editing: false });
  render();
}

/* =========================================================
   DATA LOAD
   ========================================================= */

async function loadProfileData() {
  patchUiState({ loading: true });
  clearProfileFeedback();
  render();

  try {
    const account = await fetchMyAccountStatus();

    patchAccountStatus({
      emailVerified: account.emailVerified,
      emailStatusLabel: account.emailStatusLabel,
      profileCompletionLabel: account.profileCompletionLabel,
      canResendVerification: account.canResendVerification,
    });

    const [profile, connections] = await Promise.all([
      fetchMyProfile(),
      fetchMyConnections(account.id),
    ]);

    setProfileData({
      ...profile,
      id: profile.id || account.id,
      nickname: profile.nickname || account.nickname || "",
    });

    setConnections({
  followersCount: connections.followers.length,
  followingCount: connections.following.length,
  followers: connections.followers,
  following: connections.following,
});

    patchUiState({ loading: false });
    render();
  } catch (error) {
    patchUiState({ loading: false });
    setProfileError(error.message || "Errore nel caricamento del profilo.");
    render();
  }
}

/* =========================================================
   ACTIONS
   ========================================================= */

async function handleSaveProfile(event) {
  event.preventDefault();

  patchUiState({ saving: true });
  clearProfileFeedback();
  render();

  try {
    const formValues = readProfileFormValues();
    const result = await saveMyProfile(formValues);

    setProfileData({
      ...getProfileState().profile,
      ...result,
    });

    patchUiState({ saving: false, editing: false });
    setProfileMessage("Profilo aggiornato con successo.");
    render();
  } catch (error) {
    patchUiState({ saving: false });
    setProfileError(error.message || "Salvataggio non riuscito.");
    render();
  }
}

async function handleAvatarChange(event) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  patchUiState({ saving: true });
  clearProfileFeedback();
  render();

  try {
    const result = await uploadMyAvatar(file);

    setProfileData({
      ...getProfileState().profile,
      ...result,
    });

    patchUiState({ saving: false });
    setProfileMessage("Avatar aggiornato con successo.");
    render();
  } catch (error) {
    patchUiState({ saving: false });
    setProfileError(error.message || "Aggiornamento avatar non riuscito.");
    render();
  }
}

async function handleResendVerification() {
  clearProfileFeedback();
  render();

  try {
    const result = await resendEmailVerification();
    setProfileMessage(result.message || "Email di verifica inviata.");
    render();
  } catch (error) {
    setProfileError(error.message || "Invio email non riuscito.");
    render();
  }
}

function handleOpenPublicBoard() {
  const userId = getProfileState().profile.id;
  const url = buildMyPublicProfileUrl(userId);

  if (!url) {
    setProfileError("Impossibile aprire la bacheca pubblica.");
    render();
    return;
  }

  window.location.href = url;
}

/* =========================================================
   LISTENERS
   ========================================================= */

function bindHeroActions() {
  const { editButton, publicBoardButton } = getHeroElements();

  editButton.addEventListener("click", openEditor);
  publicBoardButton.addEventListener("click", handleOpenPublicBoard);
}

function bindAccountStatusActions() {
  const { resendVerifyButton } = getAccountStatusElements();
  resendVerifyButton.addEventListener("click", handleResendVerification);
}

function bindEditorActions() {
  const { form, cancelButton, avatarInput } = getEditorElements();

  form.addEventListener("submit", handleSaveProfile);
  cancelButton.addEventListener("click", closeEditor);
  avatarInput.addEventListener("change", handleAvatarChange);
}

/* topbar/menu ora gestiti dalla shared shell */

function bindEvents() {
  bindHeroActions();
  bindAccountStatusActions();
  bindEditorActions();
}

/* =========================================================
   INIT
   ========================================================= */

async function initProfilePage() {
  patchUiState({
    editing: false,
    loading: false,
    saving: false,
    notificationsOpen: false,
    menuOpen: false,
  });
  bindEvents();
  render();
  await loadProfileData();
}

initProfilePage();
