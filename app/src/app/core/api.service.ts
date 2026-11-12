import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

type Params = Record<string, string | number | boolean | null | undefined>;

/** GET endpoints whose last answer is kept so the app still shows something offline. */
const CACHEABLE = /^(plans|me|me\/plans|notifications|halls|destinations)$|^plans\/\d+$/;
const CACHE_PREFIX = 'yk.cache.';

/** Thin promise-based wrapper around the Yenko API. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  readonly baseUrl = environment.apiUrl;

  async get<T>(path: string, params: Params = {}): Promise<T> {
    const httpParams = this.params(params);
    const cacheKey = CACHEABLE.test(path) ? `${CACHE_PREFIX}${path}?${httpParams.toString()}` : null;
    try {
      const data = await firstValueFrom(this.http.get<T>(this.url(path), { params: httpParams }));
      if (cacheKey) this.store(cacheKey, data);
      return data;
    } catch (e) {
      // No network: fall back to the last copy we have.
      if (cacheKey && e instanceof HttpErrorResponse && e.status === 0) {
        const cached = this.read<T>(cacheKey);
        if (cached !== null) return cached;
      }
      throw e;
    }
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

  /** Forget cached answers (on logout, so the next user never sees them). */
  clearCache(): void {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(CACHE_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // storage unavailable
    }
  }

  private store(key: string, data: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // quota or private mode — caching is best effort
    }
  }

  private read<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
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
