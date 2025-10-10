// messages.js — C2 DM MVP
import {
  listThreads,
  listMessages,
  sendMessage,
  getUnreadCount,
  markRead,
} from "./api.js";

let me = null;
let currentUserId = null;
let threads = [];

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
    const msgs = res?.data || [];
    renderMessages(msgs);
    await markRead(userId);
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
  if (!val || !currentUserId) return;
  try {
    const r = await sendMessage(currentUserId, val);
    if (r.ok) {
      txt.value = "";
      openThread(currentUserId); // ricarica
    }
  } catch (err) {
    console.error("Errore invio:", err);
  }
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
  init();
});
