import { Component, input, output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';

@Component({
  selector: 'yk-empty-state',
  imports: [IonIcon, IonButton],
  template: `
    <div class="yk-empty">
      <ion-icon [name]="icon()" aria-hidden="true"></ion-icon>
      <h3>{{ title() }}</h3>
      <p>{{ text() }}</p>
      @if (actionText()) {
        <ion-button (click)="action.emit()">{{ actionText() }}</ion-button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input('sparkles-outline');
  readonly title = input.required<string>();
  readonly text = input('');
  readonly actionText = input<string | null>(null);
  readonly action = output<void>();
}
