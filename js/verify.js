import { apiGet } from "./api.js";

function $(id) {
  return document.getElementById(id);
}

function getTokenFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const t = params.get("token");
  return t ? String(t).trim() : "";
}

async function runVerify() {
  const msg = $("verifyMsg");
  const btn = $("btnGoLogin");

  btn.addEventListener("click", () => {
    window.location.href = "../login.html";
  });

  const token = getTokenFromQuery();
  if (!token) {
    msg.textContent = "Token mancante o non valido. Apri di nuovo il link ricevuto via email.";
    return;
  }

  msg.textContent = "Sto verificando la tua email…";

  const res = await apiGet(`/users/verify?token=${encodeURIComponent(token)}`, null);

  if (res.ok && (res.verified === true || res.data?.verified === true || res.ok === true)) {
    msg.textContent = "✅ Email verificata con successo! Ora puoi fare login.";
    return;
  }

  // Messaggio neutro e chiaro
  const m = res.message || "Verifica fallita o link scaduto. Richiedi un nuovo link di verifica.";
  msg.textContent = `❌ ${m}`;
}

document.addEventListener("DOMContentLoaded", runVerify);
