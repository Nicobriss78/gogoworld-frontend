import { apiPostOnce } from "./api.js";

const VERIFY_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

function $(id) {
  return document.getElementById(id);
}

// FE-PKT-02: acquisisci il token dal fragment CP002 o dalla query legacy.
// Ripulisci entrambi dall'URL PRIMA di inviare qualsiasi richiesta al backend.
function takeTokenAndClearUrl() {
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const candidates = [...fragment.getAll("token"), ...query.getAll("token")];

  try {
    const cleaned = new URL(window.location.href);
    cleaned.searchParams.delete("token");
    cleaned.hash = "";
    window.history.replaceState(window.history.state, "", cleaned.pathname + cleaned.search);
  } catch (_) {
    // Fail closed: se non possiamo cancellare il token dall'URL, non consumarlo.
    return { status: "cleanup_failed" };
  }

  if (candidates.length !== 1) {
    return { status: candidates.length === 0 ? "missing" : "ambiguous" };
  }
  const token = candidates[0].trim();
  return VERIFY_TOKEN_PATTERN.test(token)
    ? { status: "ready", token }
    : { status: "invalid" };
}

async function runVerify() {
  const msg = $("verifyMsg");
  const btn = $("btnGoLogin");
  if (!msg || !btn) return;

  btn.addEventListener("click", () => {
    window.location.href = "../login.html";
  });

  const extracted = takeTokenAndClearUrl();
  if (extracted.status === "cleanup_failed") {
    msg.textContent = "Impossibile preparare la verifica in sicurezza. Riapri il link in questa pagina.";
    return;
  }
  if (extracted.status !== "ready") {
    msg.textContent = "Link di verifica mancante o non valido. Richiedi un nuovo link se necessario.";
    return;
  }

  msg.textContent = "Sto verificando la tua email…";

  // '' impedisce a apiPostOnce di aggiungere un Bearer token di sessione:
  // /users/verify è una rotta pubblica, il token di verifica è SOLO nel body.
  let res;
  try {
    res = await apiPostOnce("/users/verify", { token: extracted.token }, "");
  } catch (_) {
    msg.textContent = "Impossibile confermare la verifica. Controlla lo stato dell'account prima di richiedere un nuovo link.";
    return;
  }

  if (res?.ok === true && res.status >= 200 && res.status < 300 && res.verified === true) {
    msg.textContent = "✅ Email verificata con successo! Ora puoi fare login.";
    return;
  }

  if (res?.status === 0) {
    msg.textContent = "Risposta non ricevuta: la verifica potrebbe essere avvenuta. Controlla lo stato dell'account prima di richiedere un nuovo link.";
  } else if (res?.status === 503) {
    msg.textContent = "Verifica temporaneamente non disponibile. Richiedi un nuovo link più tardi se necessario.";
  } else if (res?.status === 400) {
    msg.textContent = "Link non valido, scaduto o già utilizzato. Richiedi un nuovo link se necessario.";
  } else {
    msg.textContent = "Non è stato possibile completare la verifica. Riprova più tardi.";
  }
}

document.addEventListener("DOMContentLoaded", runVerify);
