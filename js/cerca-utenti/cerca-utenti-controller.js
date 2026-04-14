import {
  searchUsersForView,
  blockUserForView,
  unblockUserForView,
} from "/js/cerca-utenti/cerca-utenti-api.js";

import { openOrJoinDM } from "/js/api.js";
import {
  renderSearchState,
  hideSearchState,
  renderUserResults,
} from "./cerca-utenti-renderer.js";

const inputNode = document.getElementById("cercaUtentiInput");
const stateNode = document.getElementById("cercaUtentiState");
const resultsNode = document.getElementById("cercaUtentiResults");
const backNode = document.getElementById("cercaUtentiBack");

function debounce(fn, wait = 500) {
  let timeoutId = null;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), wait);
  };
}

function isSafeInternalPath(value) {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  return true;
}

function getRootReturnTo() {
  const params = new URLSearchParams(window.location.search);
  const rootReturnTo = String(params.get("rootReturnTo") || "").trim();

  if (isSafeInternalPath(rootReturnTo)) {
    return rootReturnTo;
  }

  return "/pages/home-v2.html";
}

function getCurrentSearchPageUrl() {
  const currentUrl = new URL(window.location.href);
  const params = new URLSearchParams(currentUrl.search);
  const rootReturnTo = getRootReturnTo();

  if (rootReturnTo && !params.get("rootReturnTo")) {
    params.set("rootReturnTo", rootReturnTo);
  }

  const query = params.toString();
  return `${currentUrl.pathname}${query ? `?${query}` : ""}${currentUrl.hash}`;
}
async function runSearch(query) {
  const trimmedQuery = String(query || "").trim();

  if (!trimmedQuery) {
    resultsNode.innerHTML = "";
    renderSearchState(
      stateNode,
      "Inizia a digitare per cercare un utente.",
      "info"
    );
    return;
  }

  renderSearchState(stateNode, "Ricerca in corso...", "info");

  try {
    const users = await searchUsersForView(trimmedQuery);

    if (!Array.isArray(users) || users.length === 0) {
      resultsNode.innerHTML = "";
      renderSearchState(stateNode, "Nessun risultato.", "info");
      return;
    }

    renderUserResults(resultsNode, users);
    hideSearchState(stateNode);
  } catch (error) {
    resultsNode.innerHTML = "";
    renderSearchState(
      stateNode,
      "Si è verificato un errore. Riprova più tardi.",
      "error"
    );
  }
}

const runSearchDebounced = debounce(() => {
  runSearch(inputNode.value);
}, 500);

async function handleResultAction(event) {
  const actionNode = event.target.closest("[data-action]");
  if (!actionNode) return;

  const action = actionNode.getAttribute("data-action");
  const userId = actionNode.getAttribute("data-user");
  if (!action || !userId) return;

  const cardNode = actionNode.closest(".cerca-utenti-card");
  const blockedByMe = cardNode?.getAttribute("data-blocked-by-me") === "1";
  const hasBlockedMe = cardNode?.getAttribute("data-has-blocked-me") === "1";

  if (action === "profile") {
  const params = new URLSearchParams();
  params.set("userId", userId);

  // La pagina corrente (cerca-utenti) diventa il primo livello di ritorno
  const currentSearchPage = getCurrentSearchPageReturnTo();
  if (currentSearchPage) {
    params.set("returnTo", currentSearchPage);
  }

  window.location.href = `/pages/user-public.html?${params.toString()}`;
  return;
}

  if (action === "msg") {
    if (blockedByMe) {
      window.alert("Non puoi inviare messaggi a un utente che hai bloccato.");
      return;
    }

    if (hasBlockedMe) {
      window.alert("Questo utente ti ha bloccato, non puoi inviargli messaggi.");
      return;
    }

    const returnTo = getSafeReturnUrl();

    await openOrJoinDM(userId, {
      returnTo,
    });
    return;
  }

  try {
    if (action === "block") {
      const result = await blockUserForView(userId);
      if (!result?.ok) {
        window.alert(result?.error || "Impossibile bloccare questo utente.");
        return;
      }

      window.alert("Utente bloccato.");
      await runSearch(inputNode.value);
      return;
    }

    if (action === "unblock") {
      const result = await unblockUserForView(userId);
      if (!result?.ok) {
        window.alert(result?.error || "Impossibile sbloccare questo utente.");
        return;
      }

      window.alert("Utente sbloccato.");
      await runSearch(inputNode.value);
    }
  } catch (_) {
    window.alert("Si è verificato un errore. Riprova più tardi.");
  }
}

function bindBackButton() {
  const fallback = getUpstreamReturnTo();

  backNode.addEventListener("click", () => {
    window.location.href = fallback;
  });
}

function init() {
  bindBackButton();
  inputNode.addEventListener("input", runSearchDebounced);
  resultsNode.addEventListener("click", handleResultAction);
  inputNode.focus();
}

document.addEventListener("DOMContentLoaded", init);
