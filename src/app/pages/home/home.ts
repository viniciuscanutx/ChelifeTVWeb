import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MediaItem } from '../../shared/components/media-card/media-card';
import { MediaCarousel } from '../../shared/components/media-carousel/media-carousel';
import { PosterRowsSkeleton } from '../../shared/components/poster-rows-skeleton/poster-rows-skeleton';
import { ContentApiService } from '../../shared/data/content-api.service';
import { mapHomeResponse, toMediaItem, seriesToMediaItem, type HomeMappedData } from '../../shared/data/content-api.mapper';
import { tmdbImage } from '../../shared/data/tmdb-image';
import { capitalizeFirstLetter } from '../../utils/utils';
import { preloadImage } from '../../utils/preload-image';
import { Observable, catchError, forkJoin, from, map, of, switchMap } from 'rxjs';
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
  imports: [MediaCarousel, RouterLink, PosterRowsSkeleton],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  readonly capitalizeFirstLetter = capitalizeFirstLetter;
  protected readonly tmdbImage = tmdbImage;
  private readonly api = inject(ContentApiService);
  private readonly watchProgress = inject(WatchProgressService);

  readonly heroItem = signal<MediaItem | null>(null);
  readonly topRated = signal<MediaItem[]>([]);
  readonly trending = signal<MediaItem[]>([]);
  readonly categoryRails = signal<CategoryRail[]>([]);
  private readonly dataLoading = signal(true);
  // Skeleton fica até dados, fileiras, imagens do hero e "Continuar Assistindo" chegarem
  readonly loading = computed(() => this.dataLoading() || !this.watchProgress.loaded());
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
    }).pipe(
      switchMap(({ home, movies, series }) => {
        const mapped: HomeMappedData = mapHomeResponse(
          home ?? { featured: null, featuredType: 'movie', movieCategories: [], seriesCategories: [] },
          movies,
          series,
        );
        const isEmpty = !mapped.heroItem && movies.length === 0 && series.length === 0;

        return forkJoin({
          rails: this.loadCategoryRails(mapped.movieCategories, mapped.seriesCategories),
          heroImages: from(this.preloadHeroImages(mapped.heroItem)),
        }).pipe(map(({ rails }) => ({ mapped, rails, isEmpty })));
      }),
    ).subscribe({
      next: ({ mapped, rails, isEmpty }) => {
        this.heroItem.set(mapped.heroItem);
        this.topRated.set(mapped.topRated);
        this.trending.set(mapped.trending);
        this.categoryRails.set(rails);
        if (isEmpty) this.error.set('Não foi possível carregar o conteúdo.');
        this.dataLoading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar o conteúdo.');
        this.dataLoading.set(false);
      },
    });
  }

  private preloadHeroImages(hero: MediaItem | null): Promise<unknown> {
    if (!hero) return Promise.resolve();
    const logoUrl = this.api.resolveMediaUrl(hero.logoUrl);
    return Promise.all([
      preloadImage(tmdbImage(hero.backdrop || hero.poster, 'w1280')),
      preloadImage(logoUrl ? tmdbImage(logoUrl, 'w500') : null),
    ]);
  }

  private loadCategoryRails(movieCategories: string[], seriesCategories: string[]): Observable<CategoryRail[]> {
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
    if (calls.length === 0) return of([]);

    return forkJoin(calls).pipe(
      map((rails) => {
        const loadedRails = rails.filter((r): r is CategoryRail => !!r);
        return keepFirstAppearance(loadedRails).filter((r) => r.items.length > 0);
      }),
    );
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
