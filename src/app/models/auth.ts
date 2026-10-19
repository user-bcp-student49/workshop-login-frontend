import { isRecord, PublicError } from '../utils/http-error';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface User {
  username?: string;
  displayName?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Preferences {
  theme: string;
  showTips: boolean;
  compact: boolean;
}

export const DEFAULT_PREFERENCES: Readonly<Preferences> = {
  theme: 'light',
  showTips: true,
  compact: false
};

export function readUser(value: unknown): User {
  if (!isRecord(value) ||
      (value['username'] !== undefined && typeof value['username'] !== 'string') ||
      (value['displayName'] !== undefined && typeof value['displayName'] !== 'string')) {
    throw new PublicError('El backend respondió con un usuario inválido.');
  }
  return { username: value['username'], displayName: value['displayName'] };
}

export function readLoginResponse(value: unknown): LoginResponse {
  if (!isRecord(value) || typeof value['token'] !== 'string' || !value['token']) {
    throw new PublicError('El backend respondió sin token.');
  }
  return { token: value['token'], user: readUser(value['user']) };
}

export function readPreferences(value: unknown): Preferences {
  if (!isRecord(value) ||
      (value['theme'] !== undefined && typeof value['theme'] !== 'string') ||
      (value['showTips'] !== undefined && typeof value['showTips'] !== 'boolean') ||
      (value['compact'] !== undefined && typeof value['compact'] !== 'boolean')) {
    throw new PublicError('No se pudieron cargar las preferencias guardadas.');
  }
  return {
    theme: value['theme'] ?? DEFAULT_PREFERENCES.theme,
    showTips: value['showTips'] ?? DEFAULT_PREFERENCES.showTips,
    compact: value['compact'] ?? DEFAULT_PREFERENCES.compact
  };
}
