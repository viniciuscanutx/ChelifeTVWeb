import { NgTemplateOutlet } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PersonCreditResponse } from '../../data/content-api.types';
import { formatCrewJobs } from '../../data/crew-jobs';

@Component({
  selector: 'app-person-credit-list',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './person-credit-list.html',
  styleUrl: './person-credit-list.css',
})
export class PersonCreditList {
  readonly heading = input.required<string>();
  readonly headingId = input.required<string>();
  readonly credits = input.required<PersonCreditResponse[]>();
  readonly showCatalogBadge = input(true);

  creditRole(credit: PersonCreditResponse): string | null {
    if (credit.character) return credit.character;
    return credit.job ? formatCrewJobs([credit.job]) : null;
  }
}
