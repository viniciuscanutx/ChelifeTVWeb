export type TmdbImageSize = 'w500' | 'w780' | 'w1280';

const TMDB_IMAGE_PATH = /^\/t\/p\/[^/]+\/(.+)$/;

// Troca o tamanho de imagens do TMDB; outras URLs voltam iguais
export function tmdbImage(url: string | null | undefined, size: TmdbImageSize): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'image.tmdb.org') return url;
    const match = TMDB_IMAGE_PATH.exec(parsed.pathname);
    if (!match) return url;
    parsed.pathname = `/t/p/${size}/${match[1]}`;
    return parsed.toString();
  } catch {
    return url;
  }
}
