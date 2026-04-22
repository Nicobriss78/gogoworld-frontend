export function isBlinkMobile() {
  const ua = navigator.userAgent || "";

  const isAndroid = /Android/i.test(ua);
  const isFirefox = /Firefox|FxiOS/i.test(ua);
  const isBlinkFamily = /Chrome|CriOS|EdgA|OPR|Opera|Brave/i.test(ua);

  return isAndroid && isBlinkFamily && !isFirefox;
}

export function refreshLeafletLayout(map, clusterGroup = null) {
  if (!map) return;

  if (!isBlinkMobile()) {
    map.invalidateSize();
    return;
  }

  map.invalidateSize(false);

  window.requestAnimationFrame(() => {
    if (!map) return;

    map.invalidateSize(false);

    window.setTimeout(() => {
      if (!map) return;

      map.invalidateSize(false);

      if (clusterGroup && typeof clusterGroup.refreshClusters === "function") {
        clusterGroup.refreshClusters();
      }
    }, 120);
  });
}
