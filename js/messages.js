// messages.js — C2 DM MVP
import {
  listThreads,
  listMessages,
  sendMessage,
  getUnreadCount,
  markRead,
} from "./api.js";
// Validatore semplice per ObjectId Mongo
const isObjectId = (s) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);
let me = null;
let currentUserId = null;
let threads = [];
let currentMsgs = [];
async function init() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return (window.location.href = "../index.html");

    // carica lista threads
    await loadThreads();
    // se query ?to=<id> => apri subito quel thread
    const params = new URLSearchParams(location.search);
    const to = params.get("to");
    if (to) openThread(to);
  } catch (err) {
    console.error("Init error:", err);
  }
}

async function loadThreads() {
  try {
    const res = await listThreads();
    threads = res?.data || [];
    renderThreads();
  } catch (err) {
    console.error("Errore caricamento threads:", err);
  }
}

function renderThreads() {
  const list = document.getElementById("threadsList");
  list.innerHTML = "";
  if (!threads.length) {
    list.innerHTML = `<p>Nessuna conversazione</p>`;
    return;
  }

  for (const t of threads) {
    const div = document.createElement("div");
    div.className = "threadItem";
    div.dataset.uid = t.user.id;
    div.innerHTML = `
      <strong>${t.user.nickname || "Utente"}</strong><br>
      <small>${t.last.text}</small>
      ${t.unread ? `<span class="badge">${t.unread}</span>` : ""}
    `;
    div.addEventListener("click", () => openThread(t.user.id));
    list.appendChild(div);
  }
}

async function openThread(userId) {
  try {
    currentUserId = userId;
    document.getElementById("chatUser").textContent = "...";
    const thread = threads.find(t => t.user.id === userId);
    if (thread) document.getElementById("chatUser").textContent = thread.user.nickname || "Utente";
    const res = await listMessages(userId);
    currentMsgs = res?.data || [];
    renderMessages(currentMsgs);
    await markRead(userId);
    window.dispatchEvent(new CustomEvent("dm:updated"));
  } catch (err) {
    console.error("Errore openThread:", err);
  }
}

function renderMessages(msgs) {
  const box = document.getElementById("chatMessages");
  box.innerHTML = "";
  msgs.slice().reverse().forEach(m => {
    const div = document.createElement("div");
    div.className = "msg " + (m.sender === "me" ? "me" : "them");
    div.innerHTML = `<span>${escapeHtml(m.text)}</span><br><small>${formatTime(m.createdAt)}</small>`;
    box.appendChild(div);
  });
  box.scrollTop = box.scrollHeight;
}

async function onSend() {
  const txt = document.getElementById("msgText");
  const val = txt.value.trim();
  const btn = document.getElementById("sendBtn");
   if (btn) btn.disabled = true;

// Validazioni robuste prima dell'invio
if (!currentUserId || !isObjectId(currentUserId)) {
alert("Destinatario non valido. (manca ?to=<organizerId> oppure formato ID errato)");
return;
}
if (!val) {
alert("Il messaggio è vuoto.");
return;
}
 try {
 const r = await sendMessage(currentUserId, val);
 if (!r || r.ok === false) {
 const msg = (r && (r.message || r.error)) || "Invio non riuscito.";
 alert(msg); // es. INVALID_RECIPIENT / INVALID_TEXT dal backend
 return;
 }
window.dispatchEvent(new CustomEvent("dm:updated"));
   // --- Render ottimistico & pulizia input ---
   // Accoda subito il messaggio tra i "miei" e renderizza senza attendere reload
   currentMsgs.unshift({
   sender: "me",
   text: val,
   createdAt: new Date().toISOString(),
   });
   renderMessages(currentMsgs);
   // svuota la textarea e rimetti il focus
   txt.value = "";
   txt.focus();
 } catch (err) {
     console.error("Errore invio:", err);
  }
     if (btn) btn.disabled = false;
}

function escapeHtml(t) {
  return t.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
function formatTime(d) {
  const dt = new Date(d);
  return dt.toLocaleString("it-IT", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

   // Bind
    document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("sendBtn").addEventListener("click", onSend);
    // PATCH A4: back dinamico se arrivo da evento
    const params = new URLSearchParams(location.search);
    const rt = params.get("returnTo");
    if (rt) {
    const back = document.getElementById("backLink");
    if (back) back.href = decodeURIComponent(rt);
    }
    init();
    });
