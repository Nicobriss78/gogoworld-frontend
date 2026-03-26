export function createMappaPrivatiDrawer({
  overlayEl,
  drawerEl,
  closeBtnEl,
  onClose
}) {
  let mounted = false;
  let openState = false;

  function handleCloseClick(event) {
    event?.preventDefault?.();
    close();
  }

  /* ===============================
     MOUNT
     =============================== */

  function mount() {
    if (mounted) return;

    overlayEl?.addEventListener("click", handleCloseClick);
    closeBtnEl?.addEventListener("click", handleCloseClick);

    mounted = true;
  }

  /* ===============================
     OPEN
     =============================== */

  function open() {
    if (!overlayEl || !drawerEl) return;

    overlayEl.hidden = false;
    drawerEl.hidden = false;

    requestAnimationFrame(() => {
      overlayEl.classList.add("active");
      drawerEl.classList.add("active");
      document.body.classList.add("mappa-detail-open");
    });

    openState = true;
  }

  /* ===============================
     CLOSE
     =============================== */

  function close() {
    if (!overlayEl || !drawerEl) return;

    overlayEl.classList.remove("active");
    drawerEl.classList.remove("active");
    document.body.classList.remove("mappa-detail-open");

    // attesa fine animazione
    setTimeout(() => {
      overlayEl.hidden = true;
      drawerEl.hidden = true;
    }, 250);

    openState = false;

    if (typeof onClose === "function") {
      onClose();
    }
  }

  /* ===============================
     STATE
     =============================== */

  function isOpen() {
    return openState;
  }

  /* ===============================
     DESTROY
     =============================== */

  function destroy() {
    if (!mounted) return;

    overlayEl?.removeEventListener("click", handleCloseClick);
    closeBtnEl?.removeEventListener("click", handleCloseClick);

    overlayEl?.classList.remove("active");
    drawerEl?.classList.remove("active");
    document.body.classList.remove("mappa-detail-open");

    overlayEl.hidden = true;
    drawerEl.hidden = true;

    mounted = false;
    openState = false;
  }

  return {
    mount,
    open,
    close,
    isOpen,
    destroy
  };
}
