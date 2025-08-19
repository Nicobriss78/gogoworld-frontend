// organizzatore.js — lista SOLO miei eventi (API /events/mine), CRUD, switch sessionRole
document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("event-list") || document.getElementById("myEventsContainer");
  const form = document.getElementById("createEventForm");
  const btnLogout = document.getElementById("logoutBtn");
  const btnSwitch = document.getElementById("switchRoleBtn");

  const F = (id) => document.getElementById(id);

  function token() { return localStorage.getItem("token") || ""; }

  async function fetchJSON(url, opts = {}) {
    const resp = await fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token()}`,
        ...(opts.headers || {})
      }
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
  }

  async function loadMine() {
    if (list) list.innerHTML = "<p>Caricamento...</p>";
    const data = await fetchJSON(`/api/events/mine`);
    if (!Array.isArray(data) || !list) return;

    list.innerHTML = "";
    data.forEach(ev => {
      const div = document.createElement("div");
      div.className = "event-card";
      div.innerHTML = `
        <h3>${ev.title || "Senza titolo"}</h3>
        <p>${ev.city || ""} · ${new Date(ev.dateStart).toLocaleString("it-IT")} — Stato: ${ev.status}</p>
        <div class="actions">
          <button class="publish" data-id="${ev._id}" data-on="${ev.status !== "published"}">
            ${ev.status === "published" ? "Metti in bozza" : "Pubblica"}
          </button>
          <button class="delete" data-id="${ev._id}">Elimina</button>
        </div>
      `;
      list.appendChild(div);
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const payload = {
          title: F("title")?.value || "",
          description: F("description")?.value || "",
          dateStart: F("dateStart")?.value || "",
          city: F("city")?.value || "",
          address: F("address")?.value || "",
          status: F("status")?.value || "draft",
          visibility: F("visibility")?.value || "public",
          isFree: F("isFree")?.checked === true,
          priceMin: F("price")?.value ? Number(F("price").value) : undefined,
          capacity: F("capacity")?.value ? Number(F("capacity").value) : undefined,
          category: F("category")?.value || "",
          type: F("type")?.value || ""
        };
        await fetchJSON(`/api/events`, { method: "POST", body: JSON.stringify(payload) });
        form.reset();
        await loadMine();
      } catch (err) {
        console.error(err);
        alert("Creazione non riuscita.");
      }
    });
  }

  if (list) {
    list.addEventListener("click", async (e) => {
      const pub = e.target.closest(".publish");
      const del = e.target.closest(".delete");
      try {
        if (pub) {
          const id = pub.dataset.id;
          const makePublished = pub.dataset.on === "true";
          await fetchJSON(`/api/events/${id}`, {
            method: "PUT",
            body: JSON.stringify({ status: makePublished ? "published" : "draft" })
          });
          await loadMine();
        }
        if (del) {
          const id = del.dataset.id;
          if (!confirm("Eliminare l'evento?")) return;
          await fetchJSON(`/api/events/${id}`, { method: "DELETE" });
          await loadMine();
        }
      } catch (err) {
        console.error(err);
        alert("Azione non riuscita.");
      }
    });
  }

  // Switch ruolo dinamico (→ participant) SENZA re-login
  if (btnSwitch) {
    btnSwitch.addEventListener("click", async () => {
      try {
        const out = await fetchJSON(`/api/users/session-role`, {
          method: "PUT",
          body: JSON.stringify({ sessionRole: "participant" })
        });
        localStorage.setItem("token", out.token);
        localStorage.setItem("sessionRole", out.sessionRole);
        window.location.href = "partecipante.html";
      } catch (err) {
        console.error(err);
        alert("Impossibile cambiare ruolo.");
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "index.html";
    });
  }

  loadMine();
  // (Opzionale) Real-time leggero: refresh ogni 20s
  // setInterval(loadMine, 20000);
});






