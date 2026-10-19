import '@angular/compiler';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionService } from './session.service';

describe('SessionService (memory policy explicitly approved in PLAN revision 2)', () => {
  const stored = new Map<string, string>();
  const session = { token: 'test-token', user: { username: 'student', displayName: 'Student' } };
  const preferences = { theme: 'light', showTips: false, compact: true };
  const storage = {
    getItem: vi.fn((key: string) => stored.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { stored.set(key, value); }),
    removeItem: vi.fn((key: string) => { stored.delete(key); })
  };

  beforeEach(() => {
    stored.clear();
    storage.getItem.mockReset().mockImplementation(key => stored.get(key) ?? null);
    storage.setItem.mockReset().mockImplementation((key, value) => { stored.set(key, value); });
    storage.removeItem.mockReset().mockImplementation(key => { stored.delete(key); });
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps the session in one instance and persists only preferences', () => {
    const service = new SessionService();
    service.save(session, preferences);
    expect(service.read()).toEqual(session);
    expect(service.read()).toEqual(session);
    expect(storage.setItem.mock.calls).toEqual([['workshop_preferences', JSON.stringify(preferences)]]);
    expect(new SessionService().read()).toBeNull();
    expect(service.read()).toEqual(session);
    service.clear();
    expect(service.read()).toBeNull();
    expect(stored.get('workshop_preferences')).toBe(JSON.stringify(preferences));
  });

  it('does not share mutable user references with callers', () => {
    const service = new SessionService();
    const input = { token: 'test-token', user: { username: 'student' } };
    service.save(input, preferences);
    input.user.username = 'changed-input';
    const snapshot = service.read();
    if (!snapshot) throw new Error('Expected authenticated session');
    snapshot.user.username = 'changed-output';
    expect(service.read()?.user.username).toBe('student');
  });

  it.each(['{"username":"legacy-student"}', '{', 'null', '{"username":1}'])
  ('removes legacy keys without importing or parsing user %s', user => {
    stored.set('workshop_token', 'legacy-token');
    stored.set('workshop_user', user);
    stored.set('workshop_preferences', '{"theme":"dark"}');
    const service = new SessionService();
    expect(service.read()).toBeNull();
    expect(stored.has('workshop_token')).toBe(false);
    expect(stored.has('workshop_user')).toBe(false);
    expect(service.readPreferences().theme).toBe('dark');
    expect(storage.getItem.mock.calls).toEqual([['workshop_preferences']]);
    expect(storage.removeItem.mock.calls.map(([key]) => key)).toEqual(['workshop_token', 'workshop_user']);
  });

  it('cleans legacy keys when login first reads preferences', () => {
    stored.set('workshop_token', 'legacy-token');
    stored.set('workshop_user', '{}');
    expect(new SessionService().readPreferences()).toEqual({ theme: 'light', showTips: true, compact: false });
    expect(stored.has('workshop_token')).toBe(false);
    expect(stored.has('workshop_user')).toBe(false);
  });

  it('cleans an orphan user and returns no session', () => {
    stored.set('workshop_user', '{');
    expect(new SessionService().read()).toBeNull();
    expect(stored.has('workshop_user')).toBe(false);
  });

  it('reports migration failure before reading session and allows retry', () => {
    const service = new SessionService();
    storage.removeItem.mockImplementationOnce(() => { throw new Error('denied'); });
    expect(() => service.read()).toThrow('No se pudo leer la sesión guardada.');
    expect(storage.removeItem.mock.calls.map(([key]) => key)).toEqual(['workshop_token', 'workshop_user']);
    expect(service.read()).toBeNull();
  });

  it('reports migration failure before loading preferences', () => {
    storage.removeItem.mockImplementation(() => { throw new Error('denied'); });
    expect(() => new SessionService().readPreferences()).toThrow('No se pudo cerrar la sesión local.');
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('does not publish a session if migration fails before save', () => {
    const service = new SessionService();
    storage.removeItem.mockImplementationOnce(() => { throw new Error('denied'); });
    expect(() => service.save(session, preferences)).toThrow('No se pudo cerrar la sesión local.');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(service.read()).toBeNull();
  });

  it('does not publish a new or stale session if preferences cannot be saved', () => {
    const service = new SessionService();
    service.save(session, preferences);
    storage.setItem.mockImplementation(() => { throw new Error('denied'); });
    expect(() => service.save({ token: 'new-token', user: {} }, preferences))
      .toThrow('No se pudo guardar la sesión.');
    expect(service.read()).toBeNull();
    expect(stored.has('workshop_token')).toBe(false);
    expect(stored.has('workshop_user')).toBe(false);
  });

  it('clears memory even if legacy cleanup fails, attempts both keys and permits retry', () => {
    const service = new SessionService();
    service.save(session, preferences);
    storage.removeItem.mockClear().mockImplementationOnce(() => { throw new Error('denied'); });
    expect(() => service.clear()).toThrow('No se pudo cerrar la sesión local.');
    expect(storage.removeItem.mock.calls.map(([key]) => key)).toEqual(['workshop_token', 'workshop_user']);
    expect(service.read()).toBeNull();
    expect(stored.has('workshop_preferences')).toBe(true);
  });

  it.each([
    [null, { theme: 'light', showTips: true, compact: false }],
    ['{}', { theme: 'light', showTips: true, compact: false }],
    ['{"theme":"dark","showTips":false,"compact":true,"extra":1}',
      { theme: 'dark', showTips: false, compact: true }]
  ])('reads known preferences with defaults and discards unknown keys', (json, expected) => {
    if (json !== null) stored.set('workshop_preferences', json);
    expect(new SessionService().readPreferences()).toEqual(expected);
  });

  it.each(['{', 'null', '[]', '{"theme":{}}', '{"showTips":"false"}', '{"compact":1}'])
  ('reports invalid preferences %s explicitly', json => {
    stored.set('workshop_preferences', json);
    expect(() => new SessionService().readPreferences()).toThrow('No se pudieron cargar las preferencias guardadas.');
  });

  it('reports inaccessible preferences', () => {
    storage.getItem.mockImplementation(() => { throw new Error('denied'); });
    expect(() => new SessionService().readPreferences()).toThrow('No se pudieron cargar las preferencias guardadas.');
  });
});
