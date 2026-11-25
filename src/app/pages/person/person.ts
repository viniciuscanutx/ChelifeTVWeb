import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { PersonCreditList } from '../../shared/components/person-credit-list/person-credit-list';
import { PosterRowsSkeleton } from '../../shared/components/poster-rows-skeleton/poster-rows-skeleton';
import { ContentApiService } from '../../shared/data/content-api.service';
import { PersonResponse } from '../../shared/data/content-api.types';

const DEPARTMENT_LABELS: Record<string, string> = {
  Acting: 'Atuação',
  Directing: 'Direção',
  Writing: 'Roteiro',
  Production: 'Produção',
  Sound: 'Trilha sonora',
  Camera: 'Fotografia',
  Editing: 'Montagem',
  Art: 'Direção de arte',
  'Costume & Make-Up': 'Figurino e maquiagem',
  'Visual Effects': 'Efeitos visuais',
  Crew: 'Equipe técnica',
  Lighting: 'Iluminação',
};

const LONG_BIOGRAPHY_CHARS = 600;

// "1970-03-12" -> "12 de março de 1970", sem deslocar o dia pelo fuso
function formatDate(value?: string | null): string | null {
  const [year, month, day] = (value ?? '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

@Component({
  selector: 'app-person',
  imports: [RouterLink, PersonCreditList, PosterRowsSkeleton],
  templateUrl: './person.html',
  styleUrl: './person.css',
})
export class PersonPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ContentApiService);

  readonly person = signal<PersonResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly biographyExpanded = signal(false);
  readonly photoFailed = signal(false);

  readonly departmentLabel = computed(() => {
    const department = this.person()?.knownForDepartment;
    return department ? (DEPARTMENT_LABELS[department] ?? department) : null;
  });

  readonly birthLabel = computed(() => {
    const person = this.person();
    const date = formatDate(person?.birthday);
    if (!date) return null;
    return person?.placeOfBirth ? `${date} em ${person.placeOfBirth}` : date;
  });

  readonly deathLabel = computed(() => formatDate(this.person()?.deathday));

  readonly isLongBiography = computed(() => (this.person()?.biography?.length ?? 0) > LONG_BIOGRAPHY_CHARS);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        tap(() => {
          this.loading.set(true);
          this.error.set(false);
          this.biographyExpanded.set(false);
          this.photoFailed.set(false);
        }),
        switchMap((id) =>
          Number.isInteger(id) && id > 0
            ? this.api.getPerson(id).pipe(catchError(() => of(null)))
            : of(null),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((person) => {
        // Lista ausente na resposta não pode quebrar o template
        this.person.set(person && { ...person, knownFor: person.knownFor ?? [], inCatalog: person.inCatalog ?? [] });
        this.error.set(person === null);
        this.loading.set(false);
      });
  }

  toggleBiography(): void {
    this.biographyExpanded.update((expanded) => !expanded);
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
