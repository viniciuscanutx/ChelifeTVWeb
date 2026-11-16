import type { MediaItem } from '../components/media-card/media-card';

export interface CategoryGroup {
  category: string;
  items: MediaItem[];
}

const UNCATEGORIZED = 'Outros';

function primaryCategory(item: MediaItem): string {
  return item.genres.map((genre) => genre.trim()).find(Boolean) ?? UNCATEGORIZED;
}

// Cada título entra só na primeira categoria dele; maiores primeiro, "Outros" por último
export function groupByPrimaryCategory(items: MediaItem[]): CategoryGroup[] {
  const groups = items.reduce((acc, item) => {
    const category = primaryCategory(item);
    const key = category.toLowerCase();
    const current = acc.get(key);
    return new Map(acc).set(key, {
      category: current?.category ?? category,
      items: [...(current?.items ?? []), item],
    });
  }, new Map<string, CategoryGroup>());

  return [...groups.values()].sort((a, b) => {
    if (a.category === UNCATEGORIZED) return 1;
    if (b.category === UNCATEGORIZED) return -1;
    return b.items.length - a.items.length;
  });
}
