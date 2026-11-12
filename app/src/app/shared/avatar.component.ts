import { Component, computed, input } from '@angular/core';

import { initials } from '../core/format';

const COLORS = [
  ['#0B6E4F', '#FFF9F0'],
  ['#F5A623', '#1F1A17'],
  ['#1D4ED8', '#FFFFFF'],
  ['#C21F1F', '#FFFFFF'],
  ['#15803D', '#FFFFFF'],
];

@Component({
  selector: 'yk-avatar',
  template: `
    <span
      class="yk-avatar"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.fontSize.px]="size() * 0.4"
      [style.background]="colors()[0]"
      [style.color]="colors()[1]"
    >
      @if (url()) {
        <img [src]="url()" [alt]="''" />
      } @else {
        {{ letters() }}
      }
    </span>
  `,
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly url = input<string | null>(null);
  readonly size = input(32);

  readonly letters = computed(() => initials(this.name()));
  readonly colors = computed(() => {
    const sum = [...this.name()].reduce((a, c) => a + c.charCodeAt(0), 0);
    return COLORS[sum % COLORS.length];
  });
}
