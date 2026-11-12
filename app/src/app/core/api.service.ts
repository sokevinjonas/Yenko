import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

type Params = Record<string, string | number | boolean | null | undefined>;

/** Thin promise-based wrapper around the Yenko API. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  readonly baseUrl = environment.apiUrl;

  get<T>(path: string, params: Params = {}): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.url(path), { params: this.params(params) }));
  }

  post<T>(path: string, body: unknown = {}): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.url(path), body));
  }

  put<T>(path: string, body: unknown = {}): Promise<T> {
    return firstValueFrom(this.http.put<T>(this.url(path), body));
  }

  delete<T>(path: string, body: unknown = {}): Promise<T> {
    return firstValueFrom(this.http.delete<T>(this.url(path), { body }));
  }

  upload<T>(path: string, field: string, file: Blob, filename = 'photo.jpg'): Promise<T> {
    const form = new FormData();
    form.append(field, file, filename);
    return firstValueFrom(this.http.post<T>(this.url(path), form));
  }

  private url(path: string): string {
    return `${this.baseUrl}/${path.replace(/^\//, '')}`;
  }

  private params(params: Params): HttpParams {
    let p = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        p = p.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
      }
    }
    return p;
  }
}
