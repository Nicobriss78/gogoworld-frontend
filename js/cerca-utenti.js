import { searchUsers } from "./api.js";

const $ = (id) => document.getElementById(id);

function debounce(fn, wait = 500) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function liTemplate(u) {
  const avatar = u.avatar ? `<img src="${u.avatar}" alt="" class="avatar" />` : `<span class="avatar placeholder">👤</span>`;
  const meta = [u.city, u.region].filter(Boolean).join(" • ");
  return `
    <div class="user-line">
      ${avatar}
      <div class="user-info">
        <div class="name">${u.name || "Utente"}</div>
        <div class="meta">${meta || ""}</div>
      </div>
      <button class="btn btn-primary" data-user="${u._id}">Messaggia</button>
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
// bind pulsanti Messaggia
  ul.querySelectorAll("button[data-user]").forEach((btn) => {
    btn.onclick = () => {
      const targetUserId = btn.getAttribute("data-user");
      if (!targetUserId) return;

      const base =
        typeof window !== "undefined"
          ? window.location.origin
          : "";
      const url = `${base}/messages.html?to=${encodeURIComponent(targetUserId)}`;

      if (typeof window !== "undefined") {
        window.location.href = url;
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
