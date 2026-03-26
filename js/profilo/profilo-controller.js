import {
  getProfileState,
  patchProfileData,
  patchAccountStatus,
  setConnections,
  patchUiState,
  setProfileMessage,
  setProfileError,
  clearProfileFeedback,
} from "./profilo-state.js";

import {
  fetchProfile,
  fetchProfileConnections,
  updateProfile,
  resendVerificationEmail,
} from "./profilo-api.js";

import {
  getTopbarElements,
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
    const [profileResult, connectionsResult] = await Promise.all([
      fetchProfile(),
      fetchProfileConnections(),
    ]);

    patchProfileData(profileResult.profile);
    patchAccountStatus(profileResult.accountStatus);
    setConnections(connectionsResult);
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
    const result = await updateProfile(formValues);

    patchProfileData(result.profile);
    patchAccountStatus(result.accountStatus);
    patchUiState({ saving: false, editing: false });
    setProfileMessage("Profilo aggiornato con successo.");
    render();
  } catch (error) {
    patchUiState({ saving: false });
    setProfileError(error.message || "Salvataggio non riuscito.");
    render();
  }
}

async function handleResendVerification() {
  clearProfileFeedback();
  render();

  try {
    const result = await resendVerificationEmail();
    setProfileMessage(result.message || "Email di verifica inviata.");
    render();
  } catch (error) {
    setProfileError(error.message || "Invio email non riuscito.");
    render();
  }
}

/* =========================================================
   LISTENERS
   ========================================================= */

function bindHeroActions() {
  const { editButton, publicBoardButton } = getHeroElements();

  editButton.addEventListener("click", openEditor);

  publicBoardButton.addEventListener("click", () => {
    // placeholder intenzionale: la navigazione reale verrà collegata
    // quando fisseremo il flusso della bacheca pubblica V2
  });
}

function bindAccountStatusActions() {
  const { resendVerifyButton } = getAccountStatusElements();
  resendVerifyButton.addEventListener("click", handleResendVerification);
}

function bindEditorActions() {
  const { form, cancelButton } = getEditorElements();

  form.addEventListener("submit", handleSaveProfile);
  cancelButton.addEventListener("click", closeEditor);
}

function bindTopbarActions() {
  const { notificationsBtn, menuButton } = getTopbarElements();

  notificationsBtn.addEventListener("click", () => {
    patchUiState({
      notificationsOpen: !getProfileState().ui.notificationsOpen,
    });
  });

  menuButton.addEventListener("click", () => {
    const nextValue = !getProfileState().ui.menuOpen;

    patchUiState({ menuOpen: nextValue });

    menuButton.setAttribute("aria-expanded", String(nextValue));
  });
}

function bindEvents() {
  bindTopbarActions();
  bindHeroActions();
  bindAccountStatusActions();
  bindEditorActions();
}

/* =========================================================
   INIT
   ========================================================= */

async function initProfilePage() {
  bindEvents();
  render();
  await loadProfileData();
}

initProfilePage();
