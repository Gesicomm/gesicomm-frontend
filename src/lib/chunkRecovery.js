const RECOVERY_KEY = 'gesicomm:chunk-recovery';
const LOAD_ERROR = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i;

// Una pestaña abierta puede seguir pidiendo chunks eliminados por un deploy.
// La URL del bundle identifica la versión y el marcador sobrevive a la recarga.
export function registerChunkRecovery(target, buildUrl) {
  const onPreloadError = (event) => {
    if (target.navigator.onLine === false || !LOAD_ERROR.test(event.payload?.message || '')) return;

    try {
      if (target.sessionStorage.getItem(RECOVERY_KEY) === buildUrl) return;
      target.sessionStorage.setItem(RECOVERY_KEY, buildUrl);
    } catch {
      // Sin almacenamiento no podemos garantizar que no haya un bucle.
      return;
    }

    // Conservamos el error original si la navegación no llega a completarse.
    target.location.reload();
  };

  target.addEventListener('vite:preloadError', onPreloadError);
  return () => target.removeEventListener('vite:preloadError', onPreloadError);
}
