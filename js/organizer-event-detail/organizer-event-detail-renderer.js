export function renderEventDetail(root, state) {
  if (state.loading) {
    root.innerHTML = `<div class="org-loading">Caricamento evento...</div>`;
    return;
  }

  if (state.error) {
    root.innerHTML = `<div class="org-error">${state.error}</div>`;
    return;
  }

  const e = state.event;

  root.innerHTML = `
    <div class="org-event-card">

      <div class="org-title">${e.title}</div>

      <div class="org-meta">Stato: ${e.status}</div>
      <div class="org-meta">Visibilità: ${e.visibility}</div>
      <div class="org-meta">Luogo: ${e.city || "N/D"}</div>
      <div class="org-meta">Partecipanti: ${e.participantsCount || 0}</div>

      <div class="org-actions">
        <button class="org-btn" id="edit-btn">Modifica</button>
        <button class="org-btn org-btn-danger" id="delete-btn">Elimina</button>
      </div>

    </div>
  `;
}
