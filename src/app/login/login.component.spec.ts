import '@angular/compiler';
import { NgZone } from '@angular/core';
import { Router } from '@angular/router';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { DEFAULT_PREFERENCES } from '../models/auth';

vi.mock('axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
vi.mock('@angular/router', () => ({
  Router: class { navigate = vi.fn().mockResolvedValue(true); }
}));

describe('LoginComponent characterization', () => {
  const router = new Router();
  const navigate = vi.mocked(router.navigate);
  const stored = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => stored.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { stored.set(key, value); }),
    removeItem: vi.fn((key: string) => { stored.delete(key); })
  };
  const markForCheck = vi.fn();
  let session: SessionService;
  const create = () => new LoginComponent(
    router, new AuthService(), session,
    { markForCheck, detectChanges: vi.fn(), detach: vi.fn(), reattach: vi.fn(), checkNoChanges: vi.fn() },
    { run: (action: () => void) => action() } as NgZone
  );

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    navigate.mockResolvedValue(true);
    stored.clear();
    storage.setItem.mockReset().mockImplementation((key, value) => { stored.set(key, value); });
    storage.removeItem.mockReset().mockImplementation(key => { stored.delete(key); });
    vi.stubGlobal('localStorage', storage);
    session = new SessionService();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([400, 401, 403, 429, 500, 503])('reports HTTP %i without replacing a previous session', async status => {
    session.save({ token: 'previous-token', user: {} }, DEFAULT_PREFERENCES);
    storage.setItem.mockClear();
    vi.mocked(axios.post).mockRejectedValue({
      response: { status, data: { message: 'private backend detail' } }
    });
    const component = create();
    component.username = 'student';
    component.password = 'test-password';
    await component.login();
    expect(component.message).toBe('No se pudo autenticar. Intente nuevamente.');
    expect(component.busy).toBe(false);
    expect(session.read()?.token).toBe('previous-token');
    expect(stored.has('workshop_token')).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it.each(['ERR_NETWORK', 'ECONNREFUSED', 'ETIMEDOUT'])('reports transport error %s safely', async code => {
    vi.mocked(axios.post).mockRejectedValue({ code, message: 'private transport detail' });
    const component = create();
    component.username = 'student';
    component.password = 'test-password';
    await component.login();
    expect(component.message).toBe('No se pudo autenticar. Intente nuevamente.');
    expect(component.busy).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('handles the configured 5000 ms timeout without retrying', async () => {
    vi.useFakeTimers();
    vi.mocked(axios.post).mockImplementation((_url, _body, config) =>
      new Promise((_resolve, reject) => {
        setTimeout(() => reject({ code: 'ECONNABORTED', message: 'timeout' }), config?.timeout);
      }));
    const component = create();
    component.username = 'student';
    component.password = 'test-password';
    const pending = component.login();
    await vi.advanceTimersByTimeAsync(4999);
    expect(component.busy).toBe(true);
    expect(component.message).toBe('');
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(component.busy).toBe(false);
    expect(component.message).toBe('No se pudo autenticar. Intente nuevamente.');
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([undefined, 'not-json', [], null, { token: false }])
  ('reports unexpected login body %j in the component', async body => {
    vi.mocked(axios.post).mockResolvedValue({ status: 204, data: body });
    const component = create();
    component.username = 'student';
    component.password = 'test-password';
    await component.login();
    expect(component.message).toBe('El backend respondió sin token.');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(component.busy).toBe(false);
  });

  it.each([undefined, null, [], { username: null }, { displayName: 42 }])
  ('reports invalid response user %j without saving', async user => {
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user } });
    const component = create();
    component.username = 'student';
    component.password = 'test-password';
    await component.login();
    expect(component.message).toBe('El backend respondió con un usuario inválido.');
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(component.busy).toBe(false);
  });

  it('reports a parsing rejection without exposing its cause', async () => {
    vi.mocked(axios.post).mockRejectedValue(new SyntaxError('private malformed JSON'));
    const component = create();
    component.username = 'student';
    component.password = 'test-password';
    await component.login();
    expect(component.message).toBe('No se pudo autenticar. Intente nuevamente.');
    expect(component.busy).toBe(false);
  });

  it('reports legacy cleanup failure and never publishes a new session', async () => {
    storage.removeItem.mockImplementation(() => { throw new Error('denied'); });
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user: {} } });
    const component = create();
    expect(component.message).toBe('No se pudo cerrar la sesión local.');
    component.username = 'student';
    component.password = 'test-password';
    await component.login();
    expect(component.message).toBe('No se pudo cerrar la sesión local.');
    expect(component.busy).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports rejected navigation and preserves the already-saved session', async () => {
    navigate.mockRejectedValueOnce(new Error('navigation'));
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user: {} } });
    const component = create();
    component.username = 'student';
    component.password = 'test-password';
    await component.login();
    expect(component.message).toBe('No se pudo autenticar. Intente nuevamente.');
    expect(session.read()?.token).toBe('test-token');
    expect(stored.has('workshop_token')).toBe(false);
    expect(component.busy).toBe(false);
  });

  it.each([null, undefined, '', '   '])('rejects empty username %s before HTTP', async username => {
    const component = create();
    Reflect.set(component, 'username', username);
    await component.login();
    expect(component.message).toContain('Ingrese un usuario.');
    expect(axios.post).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([null, undefined, '', '   '])('rejects empty password %s before HTTP', async password => {
    const component = create();
    component.username = 'student';
    Reflect.set(component, 'password', password);
    await component.login();
    expect(component.message).toContain('Ingrese una contraseña.');
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('preserves payload, timeout and navigation, persisting only preferences', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user: { username: 'student' } } });
    const component = create();
    component.username = ' student ';
    component.password = ' password ';
    const pending = component.login();
    expect(component.busy).toBe(true);
    await pending;
    expect(axios.post).toHaveBeenCalledWith('http://localhost:8080/auth/login',
      { username: ' student ', password: ' password ', client: 'angular-workshop' }, { timeout: 5000 });
    expect(session.read()?.token).toBe('test-token');
    expect(stored.has('workshop_token')).toBe(false);
    expect(stored.has('workshop_user')).toBe(false);
    expect(session.read()?.user).toEqual({ username: 'student' });
    expect(stored.has('workshop_preferences')).toBe(true);
    expect(storage.setItem.mock.invocationCallOrder.at(-1)).toBeLessThan(navigate.mock.invocationCallOrder[0]);
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.busy).toBe(false);
    expect(markForCheck).toHaveBeenCalled();
  });

  it('reports a missing token without navigation', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: {} });
    const component = create();
    component.username = 'student';
    component.password = 'password';
    await component.login();
    expect(component.message).toContain('sin token');
    expect(component.busy).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports cancelled dashboard navigation and resets busy', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user: {} } });
    navigate.mockResolvedValue(false);
    const component = create();
    component.username = 'student';
    component.password = 'test';
    await component.login();
    expect(component.message).toContain('No se pudo autenticar');
    expect(component.busy).toBe(false);
  });

  it.each([
    { response: { data: { message: '<em>detalle</em>' } } },
    new Error('network'),
    {}
  ])('characterizes backend/network errors', async error => {
    vi.mocked(axios.post).mockRejectedValue(error);
    const component = create();
    component.username = 'student';
    component.password = 'password';
    await component.login();
    expect(component.message).toContain('No se pudo autenticar');
    expect(component.message).not.toContain('<');
    expect(component.message).not.toContain('detalle');
    expect(component.busy).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it.each([
    ['{}', { theme: 'light', showTips: true, compact: false }],
    ['{"showTips":false}', { theme: 'light', showTips: false, compact: false }],
    ['{"extra":1}', { theme: 'light', showTips: true, compact: false }]
  ])('characterizes preferences merge %s', (json, expected) => {
    stored.set('workshop_preferences', json);
    expect(create().preferences).toEqual(expected);
  });

  it('logs invalid preferences and retains defaults', () => {
    stored.set('workshop_preferences', '{');
    expect(create().preferences.theme).toBe('light');
    expect(console.error).toHaveBeenCalled();
    expect(create().message).toContain('preferencias');
  });

  it('does not navigate when writing preferences fails', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user: {} } });
    storage.setItem.mockImplementation((name, value) => {
      if (name === 'workshop_preferences') throw new Error('storage');
      stored.set(name, value);
    });
    const component = create();
    component.username = 'student';
    component.password = 'password';
    await component.login();
    expect(navigate).not.toHaveBeenCalled();
    expect(component.busy).toBe(false);
    expect(component.message).toBe('No se pudo guardar la sesión.');
    expect(session.read()).toBeNull();
  });
});
