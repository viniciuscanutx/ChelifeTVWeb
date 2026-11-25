import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const POSTERS_PER_ROW = 10;

@Component({
  selector: 'app-poster-rows-skeleton',
  templateUrl: './poster-rows-skeleton.html',
  styleUrl: './poster-rows-skeleton.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PosterRowsSkeleton {
  readonly rows = input(3);
  readonly label = input('Carregando');

  protected readonly rowItems = computed(() => Array.from({ length: this.rows() }, (_, index) => index));
  protected readonly posterItems = Array.from({ length: POSTERS_PER_ROW }, (_, index) => index);
}
