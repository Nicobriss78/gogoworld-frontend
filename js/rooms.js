/* =========================================================
   GoGoWorld.life – Rooms UI
   VERSIONE: P25-ROOMS-2025-10-13
   Dipendenze: ./api.js (wrappers auto-token)
   ========================================================= */

import {
  requireAuthOrRedirect,
  openOrJoinEvent,
  unlockEventRoom,
  getEventRoomMeta,
  listRoomMessages,
  postRoomMessage,
  markRoomRead,
} from "./api.js";

/* -------- DOM refs -------- */
const qs = (s) => document.querySelector(s);
const qsa = (s) => Array.from(document.querySelectorAll(s));

const elStatus = qs("#room-status");
const elMsgList = qs("#messages");
const elForm = qs("#message-form");
const elInput = qs("#message-text");
const elUnlockForm = qs("#unlock-form");
const elAccessCode = qs("#access-code");
const elRoomTitle = qs("#room-title");
const elSendBtn = qs("#send-btn");

let currentEventId = null;
let currentRoomId = null;
let polling = null;

/* -------- Utils -------- */
function getEventIdFromURL() {
  const u = new URL(window.location.href);
  return u.searchParams.get("eventId");
}

function setStatus(text) {
  if (elStatus) elStatus.textContent = text || "";
}

function renderMessages(messages = []) {
  if (!elMsgList) return;
  elMsgList.innerHTML = "";
  messages.forEach((m) => {
    const li = document.createElement("li");
    li.className = "message-item";
    const date = m.createdAt ? new Date(m.createdAt) : null;
    li.innerHTML = `
      <div class="msg-head">
        <span class="msg-author">${m.authorName || "Utente"}</span>
        <span class="msg-time">${date ? date.toLocaleString() : ""}</span>
      </div>
      <div class="msg-body">${(m.text || "").replace(/\n/g, "<br>")}</div>
    `;
    elMsgList.appendChild(li);
  });
  // scroll bottom
  elMsgList.scrollTop = elMsgList.scrollHeight;
}

/* -------- Bootstrap -------- */
async function boot() {
  if (!requireAuthOrRedirect()) return;

  currentEventId = getEventIdFromURL();
  if (!currentEventId) {
    setStatus("Evento non specificato.");
    return;
  }

  try {
    // 1) Apri/entra nella room legata all'evento
    setStatus("Connessione alla chat in corso…");
    const openRes = await openOrJoinEvent(currentEventId);
    currentRoomId = openRes?.room?._id || openRes?.roomId;

    // 2) Metadati evento/room (privato, finestra, ecc.)
    const meta = await getEventRoomMeta(currentEventId);

    if (elRoomTitle) {
      elRoomTitle.textContent = meta?.event?.title || "Chat evento";
    }

    // 3) Se privata e non sbloccata → mostra form di sblocco
    if (meta?.event?.isPrivate && meta?.room?.locked) {
      setStatus("Chat privata. Inserisci il codice per sbloccare.");
      if (elUnlockForm) elUnlockForm.style.display = "block";
      if (elForm) elForm.style.display = "none";
      return; // stop qui finché non sblocchi
    } else {
      if (elUnlockForm) elUnlockForm.style.display = "none";
      if (elForm) elForm.style.display = "flex";
    }

    // 4) Carica messaggi iniziali
    await refreshMessages();
    setStatus("");

    // 5) Avvia polling leggero (puoi passare a WS/sse in futuro)
    startPolling();
  } catch (err) {
    console.error(err);
    if (err.status === 401) {
      // token mancante/scaduto
      requireAuthOrRedirect();
      return;
    }
    setStatus(err?.payload?.message || err.message || "Errore di connessione.");
  }
}

/* -------- Polling -------- */
function startPolling() {
  stopPolling();
  polling = setInterval(refreshMessages, 5000);
}

function stopPolling() {
  if (polling) {
    clearInterval(polling);
    polling = null;
  }
}

/* -------- Azioni -------- */
async function refreshMessages() {
  if (!currentRoomId) return;
  try {
    const page = 1;
    const limit = 100; // prima vista ampia, poi ottimizziamo con virtual scroll
    const data = await listRoomMessages(currentRoomId, { page, limit });
    renderMessages(data?.messages || data || []);
    await markRoomRead(currentRoomId).catch(() => {});
  } catch (err) {
    console.error("refreshMessages error:", err);
    if (err.status === 401) requireAuthOrRedirect();
  }
}

async function handleSend(e) {
  e?.preventDefault?.();
  if (!currentRoomId) return;
  const text = (elInput?.value || "").trim();
  if (!text) return;

  elSendBtn && (elSendBtn.disabled = true);

  try {
    await postRoomMessage(currentRoomId, text);
    elInput.value = "";
    await refreshMessages();
  } catch (err) {
    console.error(err);
    if (err.status === 401) requireAuthOrRedirect();
    else alert(err?.payload?.message || err.message || "Errore nell'invio.");
  } finally {
    elSendBtn && (elSendBtn.disabled = false);
  }
}

async function handleUnlock(e) {
  e?.preventDefault?.();
  const code = (elAccessCode?.value || "").trim();
  if (!code) {
    setStatus("Inserisci il codice di accesso.");
    return;
  }
  try {
    setStatus("Verifica codice…");
    await unlockEventRoom(currentEventId, code);
    // ok sbloccata: ricarica meta e messaggi
    const meta = await getEventRoomMeta(currentEventId);
    if (meta?.room && !meta.room.locked) {
      if (elUnlockForm) elUnlockForm.style.display = "none";
      if (elForm) elForm.style.display = "flex";
      await refreshMessages();
      setStatus("");
    } else {
      setStatus("Codice non valido o chat non sbloccata.");
    }
  } catch (err) {
    console.error(err);
    if (err.status === 401) requireAuthOrRedirect();
    else setStatus(err?.payload?.message || err.message || "Errore sblocco.");
  }
}

/* -------- Bind -------- */
elForm && elForm.addEventListener("submit", handleSend);
elUnlockForm && elUnlockForm.addEventListener("submit", handleUnlock);

/* -------- Start -------- */
document.addEventListener("DOMContentLoaded", boot);
