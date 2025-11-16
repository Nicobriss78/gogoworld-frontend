import { searchUsers, openOrJoinDM, blockUser, unblockUser } from "./api.js";

const $ = (id) => document.getElementById(id);

function debounce(fn, wait = 500) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function liTemplate(u) {
  const avatar = u.avatar
    ? `<img src="${u.avatar}" alt="" class="avatar" />`
    : `<span class="avatar placeholder">👤</span>`;

  const meta = [u.city, u.region].filter(Boolean).join(" • ");
  const role = u.role || null;
  const isAdmin = role === "admin";

  // se è admin ignoriamo eventuali vecchi dati "blockedByMe"
  let blockedByMe = !!u.blockedByMe;
  const hasBlockedMe = !!u.hasBlockedMe;

  if (isAdmin) {
    blockedByMe = false;
  }

  let actionsHtml = "";

  if (hasBlockedMe) {
    // vale per tutti, anche admin: se ti ha bloccato → niente messaggi
    actionsHtml = `
      <div class="user-status user-status--blocked-by-them">
        🔒 Questo utente ti ha bloccato
      </div>
    `;
  } else if (isAdmin) {
    // admin: solo Messaggia, niente Blocca/Sblocca
    actionsHtml = `
      <div class="user-actions">
        <button class="btn btn-primary" data-action="msg" data-user="${u._id}">Messaggia</button>
      </div>
      <div class="user-status user-status--admin">
        Amministratore
      </div>
    `;
  } else if (blockedByMe) {
    actionsHtml = `
      <div class="user-actions">
        <button class="btn" data-action="unblock" data-user="${u._id}">Sblocca</button>
      </div>
      <div class="user-status user-status--blocked-by-me">
        Hai bloccato questo utente
      </div>
    `;
  } else {
    actionsHtml = `
      <div class="user-actions">
        <button class="btn btn-primary" data-action="msg" data-user="${u._id}">Messaggia</button>
        <button class="btn btn-secondary" data-action="block" data-user="${u._id}">Blocca</button>
      </div>
    `;
  }

  return `
    <div class="user-line"
         data-user-id="${u._id}"
         data-blocked-by-me="${blockedByMe ? "1" : "0"}"
         data-has-blocked-me="${hasBlockedMe ? "1" : "0"}">
      ${avatar}
      <div class="user-info">
        <div class="name">${u.name || "Utente"}</div>
        <div class="meta">${meta || ""}</div>
      </div>
      ${actionsHtml}
    </div>
  `;
}



function render(list = []) {
  const ul = $("userResults");
  ul.innerHTML = "";
  if (!list.length) {
    ul.innerHTML = `<li class="empty">Nessun risultato</li>`;
    return;
  }
  for (const u of list) {
    const li = document.createElement("li");
    li.innerHTML = liTemplate(u);
    ul.appendChild(li);
  }
// bind pulsanti azione (Messaggia / Blocca / Sblocca)
  ul.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.onclick = async () => {
      const action = btn.getAttribute("data-action");
      const targetUserId = btn.getAttribute("data-user");
      if (!targetUserId) return;

      const row = btn.closest(".user-line");
      const blockedByMe = row?.getAttribute("data-blocked-by-me") === "1";
      const hasBlockedMe = row?.getAttribute("data-has-blocked-me") === "1";

      try {
        if (action === "msg") {
          if (blockedByMe) {
            alert("Non puoi inviare messaggi a un utente che hai bloccato.");
            return;
          }
          if (hasBlockedMe) {
            alert("Questo utente ti ha bloccato, non puoi inviargli messaggi.");
            return;
          }
          const res = await openOrJoinDM(targetUserId);
          if (res?.ok && res.data?.roomId) {
            location.href = `rooms.html?roomId=${res.data.roomId}`;
          }
          return;
        }

        if (action === "block") {
          const res = await blockUser(targetUserId);
          if (!res?.ok) {
            alert(res?.error || "Impossibile bloccare questo utente.");
            return;
          }
          alert("Utente bloccato.");
          await doSearch($("q").value);
          return;
        }

        if (action === "unblock") {
          const res = await unblockUser(targetUserId);
          if (!res?.ok) {
            alert(res?.error || "Impossibile sbloccare questo utente.");
            return;
          }
          alert("Utente sbloccato.");
          await doSearch($("q").value);
          return;
        }
      } catch (e) {
        console.warn("Azione utente fallita", e);
        alert("Si è verificato un errore. Riprova più tardi.");
      }
    };
  });
}


async function doSearch(q) {
  const rows = await searchUsers(q);
  render(rows);
}

const run = debounce(() => doSearch($("q").value), 500);

document.addEventListener("DOMContentLoaded", () => {
  $("q").addEventListener("input", run);
  $("q").focus();
});
