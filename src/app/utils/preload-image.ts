const PRELOAD_TIMEOUT_MS = 5000;

// Resolve quando a imagem carrega, falha ou passa do tempo limite
export function preloadImage(url?: string | null): Promise<void> {
  if (!url) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(resolve, PRELOAD_TIMEOUT_MS);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    img.onload = done;
    img.onerror = done;
    img.src = url;
    if (img.complete) done();
  });
}
