// frontend/js/map-chat.js
import {
  openOrJoinEvent,
  listRoomMessages,
  postRoomMessage,
  markRoomRead,
} from "./api.js";

function escapeHtml(t = "") {
  return String(t).replace(/[&<>]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[c]));
}
function fmtDate(d) {
  const dt = new Date(d);
  return dt.toLocaleString("it-IT", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" });
}

/**
 * Mount chat evento dentro i 3 blocchi Mappa.
 * Richiede che esistano:
 * - mapChatPanel (container)
 * - mapChatComposer (wrapper input+btn)
 * - mapChatInput (textarea/input)
 * - mapChatSend (button)
 */
export function createEmbeddedEventChat({
  panelId = "mapChatPanel",
  composerId = "mapChatComposer",
  inputId = "mapChatInput",
  sendId = "mapChatSend",
  messagesId = "mapChatMessages",
  noticeId = "mapChatNotice",
  pollMs = 10000
} = {}) {
  let state = { roomId: null, eventId: null, canSend: false, title: "" };
  let timer = null;

  const q = (id) => document.getElementById(id);

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function renderShell(title) {
    const panel = q(panelId);
    if (!panel) return;

    panel.innerHTML = `
      <div class="gw-map-chat-head">
        <p class="gw-muted" style="margin:0;">
          Chat evento: <strong>${escapeHtml(title || "Evento")}</strong>
        </p>
      </div>
      <div id="${messagesId}" class="gw-map-chat-messages"></div>
      <div id="${noticeId}" class="gw-map-chat-notice gw-muted"></div>
    `;
  }

  function renderMessages(msgs = []) {
    const box = q(messagesId);
    if (!box) return;
    box.innerHTML = "";

    // rooms.js renderizza in ordine cronologico (reverse della lista BE che arriva desc)
    msgs.slice().reverse().forEach(m => {
      const div = document.createElement("div");
      div.className = "msg " + (m.sender === "me" ? "me" : "them");
      div.innerHTML = `<span>${escapeHtml(m.text)}</span><br><small>${fmtDate(m.createdAt)}</small>`;
      box.appendChild(div);
    });

    box.scrollTop = box.scrollHeight;
  }

  function setNotice(text, isLocked = false) {
    const n = q(noticeId);
    if (!n) return;
    n.textContent = text || "";
    n.style.display = text ? "" : "none";
    if (isLocked) n.classList.add("locked-info");
    else n.classList.remove("locked-info");
  }

  function setComposerEnabled(enabled) {
    const composer = q(composerId);
    const input = q(inputId);
    const send = q(sendId);

    if (composer) composer.style.display = "flex";
    if (input) input.disabled = !enabled;
    if (send) send.disabled = !enabled;
  }

  async function loadOnce() {
    if (!state.roomId) return;
    const res = await listRoomMessages(state.roomId);
    const msgs = res?.data || [];
    renderMessages(msgs);
    await markRoomRead(state.roomId);
  }

  async function startPolling() {
    stop();
    await loadOnce();

    timer = setInterval(async () => {
      try {
        await loadOnce();
      } catch (e) {
        // non spammare errori in UI, basta silent
        console.debug("[map-chat] poll err:", e?.message || e);
      }
    }, pollMs);
  }

  async function bindSend() {
    const input = q(inputId);
    const send = q(sendId);
    if (!input || !send) return;
// ✅ Evita refresh pagina (il composer è un <form>)
    const composer = q(composerId);
    if (composer) {
    composer.onsubmit = (e) => e.preventDefault();
    }
    send.onclick = async () => {
      if (!state.roomId || !state.canSend) return;
      const val = (input.value || "").trim();
      if (!val) return;

      await postRoomMessage(state.roomId, val);
      input.value = "";
      await loadOnce();
    };

    input.onkeydown = async (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send.click();
      }
    };
  }

  async function openForEvent(eventId, titleHint = "") {
    stop();
    state = { roomId: null, eventId, canSend: false, title: titleHint || "" };

    renderShell(titleHint || "Evento");
    setNotice("Caricamento chat…");
    setComposerEnabled(false);

    const res = await openOrJoinEvent(eventId); // POST /api/rooms/event/:eventId/open-or-join 6
    if (!res?.ok) {
      setNotice("Impossibile aprire la chat di questo evento.", true);
      setComposerEnabled(false);
      return;
    }

    // roomsController può rispondere locked (eventi privati non autorizzati) 7
    if (res?.data?.locked) {
      setNotice("🔒 Non puoi accedere alla chat di questo evento.", true);
      setComposerEnabled(false);
      return;
    }

    state.roomId = res.data.roomId;
    state.canSend = !!res.data.canSend;
    state.title = res.data.title || titleHint || "Chat evento";

    // aggiorna header titolo con quello vero
    renderShell(state.title);

    if (!state.canSend) {
      setNotice("🔒 Chat non attiva o invio disabilitato.", true);
    } else {
      setNotice("");
    }

    setComposerEnabled(state.canSend);
    await bindSend();
    await startPolling();
  }

  return { openForEvent, stop };
}
