// js/import.js — Import CSV eventi (Opzione A)
// - Bottone visibile a tutti in FE; autorizzazione reale lato BE (whitelist email)
// - Dry-run per validazione; Import per creazione effettiva
// - Usa FormData (multipart) direttamente: NON passa da api.js (JSON-only)

function getApiBase() {
// Opzione B: usa sempre il proxy relativo /api
return "/api";
}
// ==============================
// J2 helpers — show/hide via classi (no element.style.display)
// ==============================
function setHidden(el, hidden) {
  if (!el) return;
  el.classList.toggle("is-hidden", !!hidden);
}
function isHiddenEl(el) {
  return !!el?.classList?.contains("is-hidden");
}
function showEl(el) { setHidden(el, false); }
function hideEl(el) { setHidden(el, true); }
function toggleHidden(el) { setHidden(el, !isHiddenEl(el)); }
// Banner messaggi (error/success/info) riusando classi di style.css
function showAlert(message, type = "error", opts = {}) {
  const { autoHideMs = 0 } = opts;
  const box = document.getElementById("alertBox");
  if (!box) return;
  showEl(box);
  const t = type === "success" ? "success" : type === "error" ? "error" : "info";
  box.className = `alert ${t}`;
  box.textContent = message;
  if (autoHideMs > 0) {
    if (box._hideTimer) clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => {
      box.style.display = "none";
    }, autoHideMs);
  }
}

function setPreviewRows(rows) {
  const tbody = document.querySelector("#previewTable tbody");
  const section = document.getElementById("previewSection");
  if (!tbody || !section) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3">Nessun dato</td></tr>`;
    section.style.display = "block";
    return;
  }

  const html = rows
    .map((r) => {
      const line = r.line ?? "—";
      const status = r.status || "—";
      let details = "";
      if (Array.isArray(r.errors) && r.errors.length) {
        details = r.errors.join("; ");
      } else if (r.preview) {
        const parts = [];
        if (r.preview.title) parts.push(`title: ${r.preview.title}`);
        if (r.preview.date) parts.push(`date: ${r.preview.date}`);
        details = parts.join(", ");
      } else if (r.id) {
        details = `id: ${r.id}`;
      } else {
        details = "—";
      }
      return `<tr>
        <td>${line}</td>
        <td>${status}</td>
        <td>${details}</td>
      </tr>`;
    })
    .join("");

  tbody.innerHTML = html;
  section.style.display = "block";
}

async function postCsv({ dryRun }) {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  const apiBase = getApiBase();
  const fileInput = document.getElementById("csvFile");
  const file = fileInput?.files?.[0];

  if (!file) {
    showAlert("Seleziona un file .csv", "error", { autoHideMs: 3000 });
    return null;
  }

  // Costruisci FormData
  const fd = new FormData();
  fd.append("file", file, file.name);

  const url = `${apiBase}/events/import-csv?dryRun=${dryRun ? "true" : "false"}`;

  let res, data;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: fd,
    });
  } catch (err) {
    showAlert("Errore di rete o server non raggiungibile", "error", { autoHideMs: 4000 });
    return null;
  }

  // Prova a leggere JSON anche in caso di errore HTTP
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  // Gestione status
  if (!res.ok) {
    if (res.status === 403) {
      showAlert("Non sei autorizzato a importare eventi (403)", "error");
      return { ok: false, status: 403 };
    }
    if (res.status === 400) {
      const msg = data?.error || "Richiesta non valida (400)";
      showAlert(msg, "error");
      // Se il server restituisce anche le righe, mostriamole
      if (Array.isArray(data?.rows)) {
        setPreviewRows(data.rows);
      }
      return { ok: false, status: 400, data };
    }
    if (res.status === 413) {
      showAlert("File troppo grande. Riduci la dimensione del CSV.", "error");
      return { ok: false, status: 413 };
    }
    const generic = data?.error || `Errore imprevisto (${res.status})`;
    showAlert(generic, "error");
    return { ok: false, status: res.status, data };
  }

  return data || { ok: true };
}

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  const btnBack = document.getElementById("btnBack");
  const btnValidate = document.getElementById("btnValidate");
  const btnImport = document.getElementById("btnImport");
  const chkDry = document.getElementById("dryRun");

  // Back to organizer area
  if (btnBack) {
    btnBack.addEventListener("click", () => {
      window.location.href = "../organizzatore.html";
    });
  }

  // Valida (dry-run)
  if (btnValidate) {
    btnValidate.addEventListener("click", async () => {
      const result = await postCsv({ dryRun: true });
      if (!result) return;

      if (result.ok && result.dryRun) {
        setPreviewRows(result.rows || []);
        const invalid = result?.stats?.invalid ?? 0;
        const valid = result?.stats?.valid ?? 0;
        showAlert(`Dry-run completato: ${valid} righe valide, ${invalid} con errori`, invalid === 0 ? "success" : "info");
        // Abilita Import solo se non ci sono errori
        if (btnImport) btnImport.disabled = invalid > 0;
      } else {
        // Se ok ma senza flag, prova comunque a visualizzare eventuali righe
        if (Array.isArray(result?.rows)) setPreviewRows(result.rows);
        if (btnImport) btnImport.disabled = true;
      }
    });
  }

  // Import effettivo (solo dopo dry-run OK)
  if (btnImport) {
    btnImport.addEventListener("click", async () => {
      // Non fidarti solo del bottone: il BE è l'autorità
      btnImport.disabled = true;
      const result = await postCsv({ dryRun: false });
      if (!result) {
        btnImport.disabled = false;
        return;
      }

      if (result.ok && result.dryRun === false) {
        const created = result.created ?? 0;
        const skipped = result.skipped ?? 0;
        showAlert(`Import completato: creati ${created}, scartati ${skipped}`, "success");
        // Redirect all'area Organizzatore
        setTimeout(() => {
          window.location.href = "../organizzatore.html";
        }, 1200);
      } else {
        // Errori gestiti da postCsv; riabilita per un nuovo tentativo
        btnImport.disabled = false;
      }
    });
  }

  // Cambiare lo stato del checkbox non abilita/disabilita Import: lo fa la validazione
  if (chkDry) {
    chkDry.addEventListener("change", () => {
      // UI hint: se togli il dry-run, consigliamo di validare prima
      if (chkDry.checked) {
        showAlert("Dry-run attivo: verrà eseguita solo la validazione.", "info", { autoHideMs: 2500 });
      } else {
        showAlert("Consigliato: esegui prima la validazione (dry-run).", "info", { autoHideMs: 3000 });
      }
    });
  }
});
