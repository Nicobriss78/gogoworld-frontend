// frontend/js/partecipante.js
// GoGo.World — Area Partecipante (coerente con HTML attuale + retry/backoff)

const API_BASE = 'https://gogoworld-api.onrender.com';

const getToken = () => localStorage.getItem('token');
const getUserId = () => localStorage.getItem('userId');

document.addEventListener('DOMContentLoaded', () => {
  initPartecipante().catch(err => console.error('[Partecipante] init error:', err));
});

/* ===================== Init ===================== */
async function initPartecipante() {
  // fine ciclo di switch "soft" da organizer
  localStorage.removeItem('switchingRole');

  const tok = getToken();
  const uid = getUserId();
  if (!tok || !uid) {
    location.href = '/login.html';
    return;
  }

  // Bind UI
  document.getElementById('logout-btn')?.addEventListener('click', onLogout);
  document.getElementById('cambia-ruolo-btn')?.addEventListener('click', onSwitchRole);

  // Deleghe click per i bottoni nelle liste
  document.body.addEventListener('click', async (e) => {
    const el = e.target;
    if (el.matches('[data-partecipa]')) {
      e.preventDefault();
      await joinEvent(el.getAttribute('data-partecipa'));
    } else if (el.matches('[data-annulla]')) {
      e.preventDefault();
      await leaveEvent(el.getAttribute('data-annulla'));
    }
  });

  // Carica liste
  await reloadLists();
}

/* ===================== API helper con retry/backoff ===================== */
async function apiFetch(url, opts = {}, retries = 2, delayMs = 400) {
  try {
    const res = await fetch(url, opts);
    // retry su errori transitori del backend / cold start
    if ([502, 503, 504].includes(res.status) && retries > 0) {
      await wait(delayMs);
      return apiFetch(url, opts, retries - 1, delayMs * 2);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await wait(delayMs);
      return apiFetch(url, opts, retries - 1, delayMs * 2);
    }
    throw err;
  }
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ===================== Load & Render ===================== */
async function reloadLists() {
  const allEl = document.getElementById('eventi-disponibili');
  const myEl = document.getElementById('miei-eventi');

  if (allEl) allEl.innerHTML = 'Caricamento…';
  if (myEl) myEl.innerHTML = 'Caricamento…';

  try {
    const r = await fetch(`${API_BASE}/api/events`);
    const data = await r.json();
    const events = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : []);

    const uid = String(getUserId());
    const mine = [];
    const others = [];

    events.forEach(ev => {
      const partecipanti = Array.isArray(ev.participants) ? ev.participants.map(String) : [];
      if (partecipanti.includes(uid)) mine.push(ev);
      else others.push(ev);
    });

    if (allEl) allEl.innerHTML = renderEventsList(others, false);
    if (myEl) myEl.innerHTML = renderEventsList(mine, true);
  } catch (err) {
    console.error('reloadLists error:', err);
    if (allEl) allEl.innerHTML = '<em>Errore nel caricamento eventi</em>';
    if (myEl) myEl.innerHTML = '<em>Errore nel caricamento eventi</em>';
  }
}

function renderEventsList(list, isMine) {
  if (!Array.isArray(list) || list.length === 0) {
    return '<p><em>Nessun evento.</em></p>';
  }
  return `
    <ul class="event-list">
      ${list.map(ev => `
        <li class="event-item">
          <div><strong>${escapeHtml(safe(ev.title))}</strong></div>
          <div>${escapeHtml(fmtDate(ev.date || ev.dateStart))}, ${escapeHtml(safe(ev.location))}</div>
          <div class="desc" style="margin:4px 0;">${escapeHtml(safe(ev.description, ""))}</div>
          <div class="actions">
            ${ isMine
                ? `<button data-annulla="${ev._id}">Annulla partecipazione</button>`
                : `<button data-partecipa="${ev._id}">Partecipa</button>` }
          </div>
          <hr/>
        </li>
      `).join('')}
    </ul>
  `;
}

/* ===================== Azioni: partecipa / annulla ===================== */
async function joinEvent(eventId) {
  if (!eventId) return;
  const url = `${API_BASE}/api/users/${encodeURIComponent(getUserId())}/partecipa`;
  try {
    const r = await apiFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ eventId })
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      alert(e.error || 'Errore nella partecipazione');
      return;
    }
    await reloadLists();
  } catch (err) {
    console.error('joinEvent error:', err);
    alert('Errore di rete');
  }
}

async function leaveEvent(eventId) {
  if (!eventId) return;
  const url = `${API_BASE}/api/users/${encodeURIComponent(getUserId())}/annulla`;
  try {
    const r = await apiFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ eventId })
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      alert(e.error || 'Errore nell’annullamento partecipazione');
      return;
    }
    await reloadLists();
  } catch (err) {
    console.error('leaveEvent error:', err);
    alert('Errore di rete');
  }
}

/* ===================== Ruolo & Logout ===================== */
function onSwitchRole() {
  try {
    localStorage.setItem('switchingRole', '1');
    localStorage.setItem('role', 'organizer'); // switch soft
    location.href = '/organizzatore.html';
  } finally {
    setTimeout(() => localStorage.removeItem('switchingRole'), 1000);
  }
}

function onLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('role');
  localStorage.removeItem('desiredRole');
  localStorage.removeItem('userRole');
  sessionStorage.removeItem('partecipanteLoggato');
  location.href = '/';
}

/* ===================== Utils ===================== */
function safe(v, d='—'){ return (v===undefined||v===null||v==='') ? d : String(v); }
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtDate(v){
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return safe(v);
    return d.toLocaleString('it-IT', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
  } catch { return safe(v); }
}





