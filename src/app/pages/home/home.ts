import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MediaItem } from '../../shared/components/media-card/media-card';
import { MediaCarousel } from '../../shared/components/media-carousel/media-carousel';
import { ContentApiService } from '../../shared/data/content-api.service';
import { mapHomeResponse, toMediaItem, seriesToMediaItem, type HomeMappedData } from '../../shared/data/content-api.mapper';
import { capitalizeFirstLetter } from '../../utils/utils';
import { catchError, forkJoin, map, of } from 'rxjs';
import { WatchProgressService, WatchProgress } from '../../shared/services/watch-progress.service';

interface CategoryRail {
  title: string;
  icon: string;
  items: MediaItem[];
}

const RAIL_FETCH_SIZE = 40;
const RAIL_DISPLAY_SIZE = 15;

// Cada título fica só na primeira fileira em que aparece (filmes e séries separados pelo type)
function keepFirstAppearance(rails: CategoryRail[]): CategoryRail[] {
  return rails.reduce<{ seen: Set<string>; result: CategoryRail[] }>(
    ({ seen, result }, rail) => {
      const items = rail.items
        .filter((item) => !seen.has(`${item.type}:${item.id}`))
        .slice(0, RAIL_DISPLAY_SIZE);
      const nextSeen = new Set([...seen, ...items.map((item) => `${item.type}:${item.id}`)]);
      return { seen: nextSeen, result: [...result, { ...rail, items }] };
    },
    { seen: new Set<string>(), result: [] },
  ).result;
}

@Component({
  selector: 'app-home',
  imports: [MediaCarousel, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly capitalizeFirstLetter = capitalizeFirstLetter;
  private readonly api = inject(ContentApiService);
  private readonly watchProgress = inject(WatchProgressService);

  readonly heroItem = signal<MediaItem | null>(null);
  readonly topRated = signal<MediaItem[]>([]);
  readonly trending = signal<MediaItem[]>([]);
  readonly categoryRails = signal<CategoryRail[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly continueWatchingItems = computed(() => {
    return this.watchProgress.items().filter((i) => i.progressPercentage > 0 && i.progressPercentage < 95);
  });

  readonly hasData = computed(() => this.heroItem() !== null);

  // Logo que falhou ao carregar volta para o título em texto
  readonly heroLogoFailed = signal(false);
  readonly heroLogoUrl = computed(() =>
    this.heroLogoFailed() ? null : this.api.resolveMediaUrl(this.heroItem()?.logoUrl),
  );

  constructor() {
    forkJoin({
      home: this.api.getHome().pipe(catchError(() => of(null))),
      movies: this.api.getMovies().pipe(catchError(() => of([]))),
      series: this.api.getSeries().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ home, movies, series }) => {
        const mapped: HomeMappedData = mapHomeResponse(
          home ?? { featured: null, featuredType: 'movie', movieCategories: [], seriesCategories: [] },
          movies,
          series,
        );

        this.heroItem.set(mapped.heroItem);
        this.topRated.set(mapped.topRated);
        this.trending.set(mapped.trending);
        this.loading.set(false);

        if (!mapped.heroItem && movies.length === 0 && series.length === 0) {
          this.error.set('Não foi possível carregar o conteúdo.');
        }

        this.loadCategoryRails(mapped.movieCategories, mapped.seriesCategories);
      },
      error: () => {
        this.error.set('Não foi possível carregar o conteúdo.');
        this.loading.set(false);
      },
    });
  }

  private loadCategoryRails(movieCategories: string[], seriesCategories: string[]): void {
    const movieCalls = movieCategories.map((cat) =>
      this.api.getMoviesByCategory(cat, 1, RAIL_FETCH_SIZE).pipe(
        map((items): CategoryRail => ({
          title: capitalizeFirstLetter(cat),
          icon: 'bi-film',
          items: items.map(toMediaItem),
        })),
        catchError(() => of(null)),
      ),
    );

    const seriesCalls = seriesCategories.map((cat) =>
      this.api.getSeriesByCategory(cat, 1, RAIL_FETCH_SIZE).pipe(
        map((items): CategoryRail => ({
          title: capitalizeFirstLetter(cat),
          icon: 'bi-tv',
          items: items.map(seriesToMediaItem),
        })),
        catchError(() => of(null)),
      ),
    );

    const calls = [...movieCalls, ...seriesCalls];
    if (calls.length === 0) return;

    forkJoin(calls).subscribe((rails) => {
      const loadedRails = rails.filter((r): r is CategoryRail => !!r);
      this.categoryRails.set(keepFirstAppearance(loadedRails).filter((r) => r.items.length > 0));
    });
  }

  formatRemainingTime(item: WatchProgress): string {
    const remainingSeconds = Math.max(0, item.duration - item.currentTime);
    const minutes = Math.ceil(remainingSeconds / 60);
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}h ${m}m restantes`;
    }
    return `${minutes}m restantes`;
  }

  removeHistory(event: Event, contentId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.watchProgress.remove(contentId).subscribe();
  }
}
