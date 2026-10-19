import { Injectable } from '@angular/core';
import { LoginResponse, Preferences, readPreferences } from '../models/auth';
import { PublicError } from '../utils/http-error';

const STORAGE_KEYS = {
  token: 'workshop_token',
  user: 'workshop_user',
  preferences: 'workshop_preferences'
};

@Injectable({ providedIn: 'root' })
export class SessionService {
  private current: LoginResponse | null = null;
  private initialized = false;

  private initialize(): void {
    // Defer cleanup to callers' error boundaries, rather than throwing during DI.
    if (!this.initialized) this.clear();
  }

  read(): LoginResponse | null {
    try {
      this.initialize();
      return this.current ? { ...this.current, user: { ...this.current.user } } : null;
    } catch (error: unknown) {
      throw new PublicError('No se pudo leer la sesión guardada.', { cause: error });
    }
  }

  save(session: LoginResponse, preferences: Preferences): void {
    this.initialize();
    this.current = null;
    try {
      localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(preferences));
    } catch (error: unknown) {
      throw new PublicError('No se pudo guardar la sesión.', { cause: error });
    }
    this.current = { ...session, user: { ...session.user } };
  }

  readPreferences(): Preferences {
    this.initialize();
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEYS.preferences) ?? '{}');
      return readPreferences(saved);
    } catch (error: unknown) {
      throw new PublicError('No se pudieron cargar las preferencias guardadas.', { cause: error });
    }
  }

  clear(): void {
    this.current = null;
    this.initialized = false;
    const failures: unknown[] = [];
    for (const key of [STORAGE_KEYS.token, STORAGE_KEYS.user]) {
      try {
        localStorage.removeItem(key);
      } catch (error: unknown) {
        failures.push(error);
      }
    }
    if (failures.length) {
      throw new PublicError('No se pudo cerrar la sesión local.', { cause: failures });
    }
    this.initialized = true;
  }
}
