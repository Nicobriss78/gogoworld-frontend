// organizzatore.js — lista eventi organizzatore con SOLO "Dettagli" in elenco.
// Fase 6: uniforma la label del bottone a "Cambia ruolo".

document.addEventListener("DOMContentLoaded", () => {
  const myBox = document.getElementById("myEventsContainer");
  const btnLogout = document.getElementById("logoutBtn");
  const btnSwitch = document.getElementById("switchRoleBtn");
  const welcome = document.getElementById("welcome");

  // Uniforma etichetta bottone
  if (btnSwitch) btnSwitch.textContent = "Cambia ruolo";

  const token = () => localStorage.getItem("token") || localStorage.getItem("ggw_token") || "";
  const getRole = () => localStorage.getItem("sessionRole") || "organizer";

  if (welcome) welcome.textContent = `Ciao! Sei in sessione come ${getRole()}`;

  async function ensureOrganizerSession() {
    if (getRole() === "organizer") return;
    const res = await fetch("/api/users/session-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token()}`
      },
      body: JSON.stringify({ role: "organizer" })
    });
    if (res.ok) {
      localStorage.setItem("sessionRole", "organizer");
      const data = await res.json().catch(() => ({}));
      if (data && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("ggw_token", data.token);
      }
    }
  }

  function toEventUrl(id) {
    const url = new URL(location.origin + "/evento.html");
    url.searchParams.set("id", id);
    return url.pathname + url.search;
  }

  async function loadMine() {
    try {
      let res = await fetch("/api/events/mine", { headers: { "Authorization": `Bearer ${token()}` } });
      if (res.status === 404 || res.status === 501) {
        res = await fetch("/api/events/mine/list", { headers: { "Authorization": `Bearer ${token()}` } });
      }
      if (!res.ok) throw new Error();
      const data = await res.json().catch(()=>([]));
      return Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
    } catch {
      return [];
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
  }

  function renderMine(list) {
    myBox.innerHTML = "";
    if (!list.length) {
      const div = document.createElement("div");
      div.className = "muted";
      div.textContent = "Non hai ancora creato eventi.";
      myBox.appendChild(div);
      return;
    }
    for (const ev of list) {
      const card = document.createElement("div");
      card.className = "event-card";
      const mainFields = [
        `<strong>${escapeHtml(ev.title || "Senza titolo")}</strong>`,
        ev.date ? `<div class="muted">${new Date(ev.date).toLocaleString()}</div>` : "",
        ev.location ? `<div>${escapeHtml(ev.location)}</div>` : "",
        ev.type ? `<div class="muted">Tipo: ${escapeHtml(ev.type)}</div>` : ""
      ].filter(Boolean).join("");
      card.innerHTML = `${mainFields}
        <div class="actions">
          <a class="btn" href="${toEventUrl(ev._id)}">Dettagli</a>
        </div>`;
      myBox.appendChild(card);
    }
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("ggw_token");
      localStorage.removeItem("sessionRole");
      location.href = "/index.html";
    });
  }

  if (btnSwitch) {
    btnSwitch.addEventListener("click", async () => {
      try {
        await fetch("/api/users/session-role", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token()}`
          },
          body: JSON.stringify({ role: "participant" })
        });
        localStorage.setItem("sessionRole", "participant");
        location.href = "/partecipante.html";
      } catch {
        alert("Impossibile cambiare ruolo");
      }
    });
  }

  (async function init() {
    await ensureOrganizerSession();
    const mine = await loadMine();
    renderMine(mine);
  })();
});

















