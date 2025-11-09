// rooms.js — C2.2 Evento pubblico
import {
  openOrJoinEvent,
  getEventRoomMeta,
  listRoomMessages,
  postRoomMessage,
  markRoomRead,
  getMyRooms,
  getUnreadSummary,
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
// (decommission) getMyRooms() locale rimosso: ora si usa l'export centralizzato da ./api.js

// === Sidebar: "Le mie stanze" (render + click + refresh) ===
function renderMyRooms(list = []) {
  const box = q("roomList");
  const hint = q("leftHint");
  if (!box) return;

  // hint visibile solo se lista vuota
  if (hint) hint.style.display = list.length ? "none" : "";

  if (!list.length) {
    box.innerHTML = "";
    return;
  }

  // costruzione voci
  const curId = current?.roomId || null;
  box.innerHTML = "";
  list.forEach(r => {
    const title = r?.title || (r?.event?.title || "Chat evento");
    const div = document.createElement("div");
    div.className = "roomItem" + (curId && r?._id === curId ? " active" : "");
    div.dataset.roomId = r?._id || "";
    div.dataset.eventId = (r?.event?._id || r?.event?.id || "") + "";
    div.innerHTML = `
      <span>${escapeHtml(title)}</span>
      ${r?.unread > 0 ? `<span class="badge">${r.unread}</span>` : ""}
    `;
    box.appendChild(div);
  });

  attachRoomClick();
}

function attachRoomClick() {
  const box = q("roomList");
  if (!box) return;
  const items = box.querySelectorAll(".roomItem");
  items.forEach(el => {
    el.onclick = async () => {
      const roomId = el.dataset.roomId || null;
      // salva ultima stanza aperta
      try { localStorage.setItem("lastRoomId", roomId); } catch {}
      const eventId = el.dataset.eventId || null;

      if (!roomId) return;

      // bind locale e apertura messaggi
      bindRoom({
        roomId,
        eventId: eventId || null,
        canSend: true,
        title: el.querySelector("span")?.textContent || "Chat evento",
        activeFrom: null,
        activeUntil: null,
      });

      // salva "ultima stanza" (non usata per auto-apertura ora, ma utile)
      try { localStorage.setItem("lastRoomId", roomId); } catch {}

      await loadMessages();
      await markRoomRead(roomId);
       try { setBadge(roomId, 0); } catch {}
      // evidenzia attiva + refresh badge
      window.dispatchEvent(new CustomEvent("rooms:updated"));
    };
  });
}

async function loadMyRooms() {
  try {
const list = await getMyRooms({ onlyActive: 1 });
    renderMyRooms(list);
  } catch (e) {
    console.debug("loadMyRooms err:", e?.message || e);
  }
}
// Aggiorna/crea/rimuove il badge per una room nella sidebar
function setBadge(roomId, count) {
  const box = q("roomList");
  if (!box) return;
  const items = box.querySelectorAll(".roomItem");
  for (const el of items) {
    if ((el.dataset.roomId || "") === (roomId || "")) {
      let badge = el.querySelector(".badge");
      if (count > 0) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "badge";
          el.appendChild(badge);
        }
        badge.textContent = String(count);
      } else if (badge) {
        badge.remove();
      }
      break;
    }
  }
}

// Poll leggero: aggiorna solo i badge senza ricostruire la lista
async function pollUnreadSummary() {
  try {
    const arr = await getUnreadSummary();
    if (!Array.isArray(arr)) throw new Error("unread-summary: invalid");
    const map = new Map(arr.map(r => [r._id, Number(r.unread) || 0]));
    const box = q("roomList");
    if (!box) return;
    const items = box.querySelectorAll(".roomItem");
    items.forEach(el => {
      const rid = el.dataset.roomId || "";
      const n = map.get(rid) || 0;
      const badge = el.querySelector(".badge");
      if (n > 0) {
        if (badge) badge.textContent = String(n);
        else {
          const b = document.createElement("span");
          b.className = "badge";
          b.textContent = String(n);
          el.appendChild(b);
        }
      } else if (badge) {
        badge.remove();
      }
    });
  } catch (e) {
    // Fallback una tantum: se l'endpoint non c'è/errore, ricarica lista
    try { await loadMyRooms(); } catch {}
  }
}

async function init() {
  const token = localStorage.getItem("token");
  if (!token) { window.location.href = "../index.html"; return; }

  // Query: ?eventId=... oppure ?roomId=...
  const qs = new URLSearchParams(location.search);
  const eventId = qs.get("eventId");
  const roomId = qs.get("roomId");
  // Imposta il link "Home": priorità a returnTo, altrimenti pagina ruolo (partecipante/organizzatore)
  (function setHomeLink() {
    const home = q("btnHome");
    if (!home) return;
    const rt = qs.get("returnTo");
    if (rt) {
      home.href = decodeURIComponent(rt);
      return;
    }
    // fallback in base al ruolo memorizzato (se disponibile)
    let roleHref = "../partecipante.html";
    try {
      const role = (localStorage.getItem("role") || "").toLowerCase();
      if (role.includes("organ")) roleHref = "../organizzatore.html";
    } catch {}
    home.href = roleHref;
  })();
// Popola subito la lista "Le mie stanze" nella colonna sinistra
await loadMyRooms();

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
  // Nessun parametro -> prova ad aprire la prima mia stanza (se esiste)
  try {
const mine = await getMyRooms({ onlyActive: 1 });
    // Preferisci l'ultima stanza usata se presente nell'elenco
    try {
      const lastRoomId = localStorage.getItem("lastRoomId");
      if (lastRoomId) {
        const found = mine.find(r => r._id === lastRoomId);
        if (found) {
          // Se ha un evento, riusa openOrJoinEvent per canSend/finestra corretti
          if (found.event && (found.event._id || found.event.id)) {
            const evId2 = found.event._id || found.event.id;
            const res2 = await openOrJoinEvent(evId2);
            if (res2?.ok) {
              bindRoom({
                roomId: res2.data.roomId,
                eventId: evId2,
                canSend: !!res2.data.canSend,
                title: res2.data.title,
                activeFrom: res2.data.activeFrom,
                activeUntil: res2.data.activeUntil,
              });
              await loadMessages();
              await markRoomRead(res2.data.roomId);
               try { setBadge(res2.data.roomId, 0); } catch {}
              return; // non aprire la "prima" stanza, abbiamo ripristinato l'ultima
            }
          }
          // Fallback: apri direttamente via roomId
          bindRoom({
            roomId: found._id,
            eventId: found.event?._id || found.event?.id || null,
            canSend: true,
            title: found.title || "Chat evento",
            activeFrom: found.activeFrom || null,
            activeUntil: found.activeUntil || null,
          });
          await loadMessages();
          await markRoomRead(found._id);
           try { setBadge(found._id, 0); } catch {}
          return; // non aprire la "prima" stanza
        }
      }
    } catch {}

    if (mine.length > 0) {
      const r0 = mine[0]; // la più recente (ordinamento lato BE consigliato per updatedAt desc)
      // Se la room è legata a un evento, riusa openOrJoinEvent per avere canSend/finestra coerente
      if (r0.event && (r0.event._id || r0.event.id)) {
        const evId = r0.event._id || r0.event.id;
        const res = await openOrJoinEvent(evId);
        if (res?.ok) {
          bindRoom({
            roomId: res.data.roomId,
            eventId: evId,
            canSend: !!res.data.canSend,
            title: res.data.title || (r0.title || "Chat evento"),
            activeFrom: res.data.activeFrom || r0.activeFrom || null,
            activeUntil: res.data.activeUntil || r0.activeUntil || null,
          });
          await loadMessages();
        } else {
          showEmpty(`Impossibile aprire la stanza dell’evento.`);
        }
      } else if (r0._id) {
        // Fallback: stanza senza event popolato → apri via roomId
        bindRoom({
          roomId: r0._id,
          eventId: r0.event?._id || r0.event?.id || null,
          canSend: true,
          title: r0.title || "Chat evento",
          activeFrom: r0.activeFrom || null,
          activeUntil: r0.activeUntil || null,
        });
        await loadMessages();
      } else {
        showEmpty(`Apri una chat evento dalla pagina di dettaglio evento.`);
      }
    } else {
      showEmpty(`Apri una chat evento dalla pagina di dettaglio evento.`);
    }
  } catch (e) {
    console.debug("getMyRooms err:", e?.message || e);
    showEmpty(`Apri una chat evento dalla pagina di dettaglio evento.`);
  }
}

  q("sendBtn").addEventListener("click", onSend);
  q("txt").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  });
}

function bindRoom(meta) {
  current = { ...current, ...meta };
  // memorizza ultima stanza aperta (anche quando arrivi da evento/roomId)
  try { if (current.roomId) localStorage.setItem("lastRoomId", current.roomId); } catch {}
  q("roomTitle").textContent = current.title || "Chat evento";
   if (current.activeUntil) {
   q("roomWindow").textContent = `Chat attiva fino a ${fmtDate(current.activeUntil)}.`;
   } else {
   q("roomWindow").textContent = "Chat attiva.";
   }
   // link "torna all’evento" se eventId presente
const back = q("btnBackToEvent");
  if (current.eventId) {
    back.style.display = "";
    back.href = `../evento.html?id=${encodeURIComponent(current.eventId)}`;
  } else {
    back.style.display = "none";
  }

 q("txt").disabled = !(current.canSend || forceSendEnabled());
 q("sendBtn").disabled = !(current.canSend || forceSendEnabled());
// Se la chat è scaduta (oltre la fine +24h) disabilita comunque
if (current.activeUntil && new Date() > new Date(current.activeUntil)) {
 q("txt").disabled = true;
 q("sendBtn").disabled = true;
 q("roomWindow").textContent = "Chat non più attiva (evento concluso).";
 }
}

async function loadMessages(before) {
  if (!current.roomId) return;
  const res = await listRoomMessages(current.roomId, { before });
  const msgs = res?.data || [];
  renderMessages(msgs);
 window.dispatchEvent(new CustomEvent("rooms:updated"));
  // polling leggero ogni 10s
  if (polling) clearInterval(polling);
  polling = setInterval(async () => {
    const res2 = await listRoomMessages(current.roomId);
    const msgs2 = res2?.data || [];
    renderMessages(msgs2);
    await markRoomRead(current.roomId);
    try { setBadge(current.roomId, 0); } catch {}
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
 await postRoomMessage(current.roomId, val);
 txt.value = "";
 await loadMessages();
 await markRoomRead(current.roomId);
  try { setBadge(current.roomId, 0); } catch {}
 window.dispatchEvent(new CustomEvent("rooms:updated"));
 }


function showEmpty(message) {
  q("roomTitle").textContent = "Nessuna stanza aperta";
  q("roomWindow").textContent = "";
  q("msgs").innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
  q("txt").disabled = true;
  q("sendBtn").disabled = true;
}
// refresh lista quando cambiano i messaggi (es. invio, markRead, ecc.)
window.addEventListener("rooms:updated", () => {
  loadMyRooms().catch(() => {});
});

// === Poll unread raffinato ===
let unreadTimer = null;
let pollFailures = 0;
let isPolling = false;

async function safePollUnread() {
  if (isPolling) return; // single-flight
  isPolling = true;
  try {
    await pollUnreadSummary();
    pollFailures = 0;
    console.debug("[rooms] unread-summary OK", new Date().toLocaleTimeString());
  } catch (e) {
    pollFailures++;
    console.debug("[rooms] unread-summary FAIL", pollFailures, e?.message || e);
    // backoff dopo 3 errori consecutivi → pausa 60 s
    if (pollFailures >= 3) {
      clearInterval(unreadTimer);
      console.debug("[rooms] unread-summary backoff 60 s");
      setTimeout(startUnreadPoll, 60000);
      isPolling = false;
      return;
    }
  }
  isPolling = false;
}

function startUnreadPoll() {
  if (unreadTimer) clearInterval(unreadTimer);
  const delay = document.visibilityState === "visible" ? 10000 : 25000;
  unreadTimer = setInterval(() => safePollUnread(), delay);
  safePollUnread(); // run immediately
}

// aggiorna intervallo quando cambia visibilità tab
document.addEventListener("visibilitychange", () => {
  startUnreadPoll();
});

startUnreadPoll();


document.addEventListener("DOMContentLoaded", init);
