import { Injectable, inject, signal } from '@angular/core';

import { ApiService } from './api.service';
import type { Destination, Hall } from './models';

/** Halls and destinations, loaded once and cached. */
@Injectable({ providedIn: 'root' })
export class ReferenceService {
  private api = inject(ApiService);
  readonly halls = signal<Hall[]>([]);
  readonly destinations = signal<Destination[]>([]);
  private loaded: Promise<void> | null = null;

  load(): Promise<void> {
    this.loaded ??= Promise.all([
      this.api.get<{ data: Hall[] }>('halls').then((r) => this.halls.set(r.data)),
      this.api.get<{ data: Destination[] }>('destinations').then((r) => this.destinations.set(r.data)),
    ])
      .then(() => undefined)
      .catch((e) => {
        this.loaded = null;
        throw e;
      });
    return this.loaded;
  }
}
