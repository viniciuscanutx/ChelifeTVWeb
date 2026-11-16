import { NgTemplateOutlet } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { ContentApiService } from '../../data/content-api.service';
import { CreditsResponse } from '../../data/content-api.types';
import { formatCrewJobs } from '../../data/crew-jobs';

const EMPTY_CREDITS: CreditsResponse = { cast: [], crew: [] };
const SKELETON_ITEMS = [1, 2, 3, 4, 5, 6, 7, 8];

@Component({
  selector: 'app-credits-list',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './credits-list.html',
  styleUrl: './credits-list.css',
})
export class CreditsList {
  readonly contentId = input.required<string>();
  readonly contentType = input.required<'movie' | 'series'>();
  private readonly api = inject(ContentApiService);

  readonly credits = signal<CreditsResponse>(EMPTY_CREDITS);
  readonly loading = signal(true);
  readonly skeletonItems = SKELETON_ITEMS;
  readonly formatCrewJobs = formatCrewJobs;

  constructor() {
    effect((onCleanup) => {
      const id = this.contentId();
      const type = this.contentType();
      this.loading.set(true);
      this.credits.set(EMPTY_CREDITS);
      // Falha nos créditos cai no estado vazio
      const subscription = this.api
        .getCredits(type, id)
        .pipe(catchError(() => of(EMPTY_CREDITS)))
        .subscribe((data) => {
          this.credits.set({ cast: data?.cast ?? [], crew: data?.crew ?? [] });
          this.loading.set(false);
        });
      onCleanup(() => subscription.unsubscribe());
    });
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }
}
