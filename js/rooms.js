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
  return dt.toLocaleString("it-IT", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
}
function escapeHtml(t="") {
  return t.replace(/[&<>]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c]));
}
// override solo per test: rooms.html?...&forceSend=1
function forceSendEnabled() {
  try { return new URLSearchParams(location.search).get("forceSend") === "1"; }
  catch { return false; }
}

async function init() {
  const token = localStorage.getItem("token");
  if (!token) { window.location.href = "../index.html"; return; }

  // Query: ?eventId=... oppure ?roomId=...
  const qs = new URLSearchParams(location.search);
  const eventId = qs.get("eventId");
  const roomId = qs.get("roomId");

  if (eventId) {
    // crea/entra stanza dell'evento (pubblica)
    const res = await openOrJoinEvent(eventId);
    if (res?.ok) {
      bindRoom({
        roomId: res.data.roomId,
        eventId,
        canSend: !!res.data.canSend,
        title: res.data.title,
        activeFrom: res.data.activeFrom,
        activeUntil: res.data.activeUntil,
      });
      await loadMessages();
    } else {
      showEmpty(`Impossibile aprire la stanza dell’evento.`);
    }
  } else if (roomId) {
    // meta stanza da roomId (facoltativo: non abbiamo ancora API dedicata, usiamo GET event meta se possibile)
    // In MVP: senza eventId non mostriamo il link "torna all'evento".
    bindRoom({ roomId, eventId: null, canSend: true, title: "Chat evento", activeFrom: null, activeUntil: null });
    await loadMessages();
  } else {
    // Nessun parametro -> UI vuota con istruzione
    showEmpty(`Apri una chat evento dalla pagina di dettaglio evento.`);
  }

  q("sendBtn").addEventListener("click", onSend);
  q("txt").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  });
}

function bindRoom(meta) {
  current = { ...current, ...meta };
  q("roomTitle").textContent = current.title || "Chat evento";
  if (current.activeFrom && current.activeUntil) {
  q("roomWindow").textContent = `Invio abilitato tra ${fmtDate(current.activeFrom)} e ${fmtDate(current.activeUntil)}.`;
  } else {
    q("roomWindow").textContent = "";
  }
  // link “torna all’evento” se eventId presente
  const back = q("btnBackToEvent");
  if (current.eventId) {
    back.style.display = "";
    back.href = `../evento.html?id=${encodeURIComponent(current.eventId)}`;
  } else {
    back.style.display = "none";
  }
 q("txt").disabled = !(current.canSend || forceSendEnabled());
 q("sendBtn").disabled = !(current.canSend || forceSendEnabled());
}

async function loadMessages(before) {
  if (!current.roomId) return;
  const res = await listRoomMessages(current.roomId, { before });
  const msgs = res?.data || [];
  renderMessages(msgs);
  await markRoomRead(current.roomId);
  // polling leggero ogni 10s
  if (polling) clearInterval(polling);
  polling = setInterval(async () => {
    const res2 = await listRoomMessages(current.roomId);
    const msgs2 = res2?.data || [];
    renderMessages(msgs2);
    await markRoomRead(current.roomId);
  }, 10000);
}

function renderMessages(msgs) {
  const box = q("msgs");
  box.innerHTML = "";
  msgs.slice().reverse().forEach(m => {
    const div = document.createElement("div");
    div.className = "msg " + (m.sender === "me" ? "me" : "them");
    div.innerHTML = `<span>${escapeHtml(m.text)}</span><br><small>${fmtDate(m.createdAt)}</small>`;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;
}

async function onSend() {
if (!current.roomId || !(current.canSend || forceSendEnabled())) return;
  const txt = q("txt");
  const val = (txt.value || "").trim();
  if (!val) return;
  const r = await postRoomMessage(current.roomId, val);
  if (r?.ok) {
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
