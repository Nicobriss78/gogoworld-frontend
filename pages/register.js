// pages/register.js
const API_BASE = 'https://gogoworld-api.onrender.com';

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("regForm");
  if (form) form.addEventListener("submit", onSubmit);
});

function validPassword(pw) {
  return typeof pw === "string" &&
         pw.length >= 6 &&
         /[A-Za-z]/.test(pw) &&
         /\d/.test(pw);
}

function mapRoleToEn(v) {
  if (!v) return "participant";
  const s = String(v).toLowerCase();
  if (s.startsWith("org")) return "organizer";
  if (s.startsWith("par")) return "participant";
  if (s === "organizzatore") return "organizer";
  if (s === "partecipante") return "participant";
  if (s === "organizer" || s === "participant") return s;
  return "participant";
}

async function onSubmit(e) {
  e.preventDefault();
  const f = e.target;

  const name = (f.name?.value || "").trim();
  const email = (f.email?.value || "").trim();
  const password = f.password?.value || "";
  const roleIt = f.role?.value || "Partecipante";
  const role = mapRoleToEn(roleIt);
  const acceptTerms = !!f.acceptTerms?.checked;

  if (!name || !email || !password || !role || !acceptTerms) {
    alert("Compila tutti i campi e accetta i termini.");
    return;
  }
  if (!validPassword(password)) {
    alert("Password non valida (min 6, lettere e numeri).");
    return;
  }

  try {
    // 1) Prova registrazione
    const r1 = await fetch(`${API_BASE}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ name, email, password, role })
    });

    if (r1.status === 201) {
      // Registrazione OK → auto-login
      await doAutoLogin(email, password, role);
      return;
    }

    // Email già registrata → tenta login automatico
    if (r1.status === 409) {
      const ok = await tryLogin(email, password);
      if (ok) return; // già dentro
      alert("Email già registrata ma la password non corrisponde. Prova il login dalla pagina dedicata.");
      return;
    }

    const d1 = await r1.json().catch(() => ({}));
    throw new Error(d1?.error || `Registrazione fallita (${r1.status})`);
  } catch (err) {
    console.error("[register] error:", err);
    alert("Errore registrazione: " + (err?.message || "sconosciuto"));
  }
}

async function tryLogin(email, password) {
  try {
    const r2 = await fetch(`${API_BASE}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ email, password })
    });
    const d2 = await r2.json().catch(() => ({}));
    if (!r2.ok) return false;
    saveSession(d2);
    redirectByRole(d2.role || "participant");
    return true;
  } catch {
    return false;
  }
}

async function doAutoLogin(email, password, fallbackRole) {
  const r2 = await fetch(`${API_BASE}/api/users/login`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ email, password })
  });
  const d2 = await r2.json();
  if (!r2.ok) throw new Error(d2?.error || `Auto-login fallito (${r2.status})`);
  saveSession(d2);
  redirectByRole(d2.role || fallbackRole || "participant");
}

function saveSession(d) {
  localStorage.setItem("token", d.token);
  localStorage.setItem("userId", String(d.id));
  localStorage.setItem("name", d.name || "");
  localStorage.setItem("role", d.role || "participant");
  localStorage.setItem("currentRole", d.role || "participant");
}

function redirectByRole(role) {
  if (role === "organizer") location.href = "/organizzatore.html";
  else location.href = "/partecipante.html";
}


