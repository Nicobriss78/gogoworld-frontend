// rooms.js — C2.2 Evento pubblico
import {
  openOrJoinEvent,
  getEventRoomMeta,
  listRoomMessages,
  postRoomMessage,
  markRoomRead,
} from "./api.js";

// Stato locale
let current = { roomId: null, eventId: null, canSend: false, title: "", activeFrom: null, activeUntil: null };
let polling = null;

function q(id) { return document.getElementById(id); }
function fmtDate(d) {
  const dt = new Date(d);
  const pad = (n) => (n < 10 ? "0" + n : "" + n);
  return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}
function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
}

async function init() {
  // eventId da URL
  const url = new URL(window.location.href);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) {
    showEmpty("Evento non specificato.");
    return;
  }
  current.eventId = eventId;

  // 1) open-or-join
  const joinRes = await openOrJoinEvent(eventId);
  if (joinRes?.ok === false) {
    showEmpty(joinRes.message || "Errore di apertura stanza.");
    return;
  }
  current.roomId = joinRes?.room?._id || joinRes?.roomId || joinRes?.id || null;

  // 2) meta (titolo/finestra invio)
  const meta = await getEventRoomMeta(eventId);
  if (meta?.ok === false) {
    showEmpty(meta.message || "Errore meta stanza.");
    return;
  }
  current.title = meta?.event?.title || "Chat evento";
  current.activeFrom = meta?.room?.activeFrom || meta?.event?.chat?.activeFrom || null;
  current.activeUntil = meta?.room?.activeUntil || meta?.event?.chat?.activeUntil || null;

  renderHeader();
  await loadMessages();

  // polling
  startPolling();
}

function renderHeader() {
  q("roomTitle").textContent = current.title || "Chat evento";
  if (current.activeFrom || current.activeUntil) {
    const from = current.activeFrom ? fmtDate(current.activeFrom) : "—";
    const to = current.activeUntil ? fmtDate(current.activeUntil) : "—";
    q("roomWindow").textContent = `Finestra chat: ${from} → ${to}`;
  } else {
    q("roomWindow").textContent = "";
  }
}

async function loadMessages() {
  if (!current.roomId) {
    showEmpty("Nessuna stanza aperta.");
    return;
  }
  const res = await listRoomMessages(current.roomId, { limit: 100 });
  if (res?.ok === false) {
    showEmpty(res.message || "Errore caricamento messaggi.");
    return;
  }
  const messages = res?.messages || res || [];
  q("msgs").innerHTML = messages
    .map(m => {
      const when = m.createdAt ? fmtDate(m.createdAt) : "";
      const who = escapeHtml(m.authorName || "Utente");
      const body = escapeHtml(m.text || "");
      return `<div class="msg"><div class="msg-head">${who} • <span class="muted">${when}</span></div><div class="msg-body">${body.replace(/\n/g,"<br>")}</div></div>`;
    })
    .join("");
  q("msgs").scrollTop = q("msgs").scrollHeight;

  // segna come letti
  try { await markRoomRead(current.roomId); } catch {}
}

function startPolling() {
  stopPolling();
  polling = setInterval(loadMessages, 5000);
}
function stopPolling() {
  if (polling) { clearInterval(polling); polling = null; }
}

q("sendForm")?.addEventListener("submit", onSend);
async function onSend(e) {
  e?.preventDefault?.();
  if (!current.roomId) return;
  const txt = q("txt");
  const val = (txt?.value || "").trim();
  if (!val) return;

  // invio
  const sent = await postRoomMessage(current.roomId, val);
  if (sent?.ok === false) {
    alert(sent.message || "Errore invio.");
  } else {
    txt.value = "";
    await loadMessages();
  }
}

function showEmpty(message) {
  q("roomTitle").textContent = "Nessuna stanza aperta";
  q("roomWindow").textContent = "";
  q("msgs").innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
  q("txt").disabled = true;
  q("sendBtn").disabled = true;
}

document.addEventListener("DOMContentLoaded", init);
