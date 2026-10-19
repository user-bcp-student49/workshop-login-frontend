import '@angular/compiler';
import { NgZone } from '@angular/core';
import { Router } from '@angular/router';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';
import { DEFAULT_PREFERENCES, User } from '../models/auth';

vi.mock('axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
vi.mock('@angular/router', () => ({
  Router: class { navigate = vi.fn().mockResolvedValue(true); }
}));

describe('DashboardComponent characterization', () => {
  const stored = new Map<string, string>();
  const router = new Router();
  const navigate = vi.mocked(router.navigate);
  const detectChanges = vi.fn();
  let session: SessionService;
  const authenticate = (token = 'test-token', user: User = {}) =>
    session.save({ token, user }, DEFAULT_PREFERENCES);
  const create = () => new DashboardComponent(
    router,
    { detectChanges, markForCheck: vi.fn(), detach: vi.fn(), reattach: vi.fn(), checkNoChanges: vi.fn() },
    { run: (action: () => void) => action() } as NgZone,
    new TasksService(), session
  );

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    navigate.mockResolvedValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stored.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key)
    });
    session = new SessionService();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([400, 401, 403, 404, 429, 500, 503])('reports task HTTP %i without silently clearing session', async status => {
    authenticate('rejected-token', { username: 'student' });
    vi.mocked(axios.get).mockRejectedValue({ response: { status, data: { detail: 'private detail' } } });
    const component = create();
    await component.ngOnInit();
    expect(component.error).toBe('No se pudo cargar el dashboard.');
    expect(component.loading).toBe(false);
    expect(component.user.username).toBe('student');
    expect(session.read()?.token).toBe('rejected-token');
    expect(navigate).not.toHaveBeenCalled();
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(detectChanges).toHaveBeenCalled();
  });

  it.each(['ERR_NETWORK', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNABORTED'])
  ('ends loading on task transport error %s', async code => {
    authenticate();
    vi.mocked(axios.get).mockRejectedValue({ code, message: 'private network error' });
    const component = create();
    await component.ngOnInit();
    expect(component.error).toBe('No se pudo cargar el dashboard.');
    expect(component.loading).toBe(false);
    expect(session.read()?.token).toBe('test-token');
  });

  it('has no application deadline for tasks and settles when the request resolves', async () => {
    vi.useFakeTimers();
    authenticate();
    let complete: (response: { data: never[] }) => void = () => { throw new Error('Request was not started'); };
    vi.mocked(axios.get).mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const component = create();
    const pending = component.ngOnInit();
    await vi.advanceTimersByTimeAsync(60000);
    expect(component.loading).toBe(true);
    expect(component.error).toBe('');
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=',
      { headers: { Authorization: 'Bearer test-token' } });
    complete({ data: [] });
    await pending;
    expect(component.loading).toBe(false);
  });

  it.each([undefined, 'not-json', {}, { tasks: [] }, [null], [{ title: null }],
    [{ status: false }], [{ title: 'valid' }, { owner: [] }]])
  ('rejects unexpected task body %j without displaying partial success', async body => {
    authenticate();
    vi.mocked(axios.get).mockResolvedValue({ status: 204, data: body });
    const component = create();
    await component.ngOnInit();
    expect(component.error).toBe('El backend respondió con tareas inválidas.');
    expect(component.loading).toBe(false);
    expect(component.tasks).toEqual([]);
    expect(component.visibleTasks).toEqual([]);
  });

  it('reports task parsing rejection safely', async () => {
    authenticate();
    vi.mocked(axios.get).mockRejectedValue(new SyntaxError('private malformed JSON'));
    const component = create();
    await component.ngOnInit();
    expect(component.error).toBe('No se pudo cargar el dashboard.');
    expect(component.loading).toBe(false);
  });

  it.each(['null', '{"username":42}'])('discards legacy user %s and redirects before GET', async user => {
    stored.set('workshop_token', 'test-token');
    stored.set('workshop_user', user);
    const component = create();
    await component.ngOnInit();
    expect(component.error).toBe('');
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(stored.has('workshop_user')).toBe(false);
    expect(component.loading).toBe(false);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('reports unavailable storage before GET', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); } });
    const component = create();
    await component.ngOnInit();
    expect(component.error).toBe('No se pudo leer la sesión guardada.');
    expect(component.loading).toBe(false);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('reports rejected login redirect without making a task request', async () => {
    navigate.mockRejectedValueOnce(new Error('navigation'));
    const component = create();
    await component.ngOnInit();
    expect(component.error).toBe('No se pudo cargar el dashboard.');
    expect(component.loading).toBe(false);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('reports processing failure and still completes loading', async () => {
    authenticate();
    vi.spyOn(TasksService.prototype, 'list').mockRejectedValueOnce(new Error('processing'));
    const component = create();
    await component.ngOnInit();
    expect(component.error).toBe('No se pudo cargar el dashboard.');
    expect(component.loading).toBe(false);
  });

  it('reports rejected logout navigation after clearing the session', async () => {
    stored.set('workshop_token', 'test-token');
    stored.set('workshop_user', '{}');
    navigate.mockRejectedValueOnce(new Error('navigation'));
    const component = create();
    await component.logout();
    expect(component.error).toBe('No se pudo cerrar la sesión.');
    expect(stored.has('workshop_token')).toBe(false);
    expect(stored.has('workshop_user')).toBe(false);
  });

  it('redirects without HTTP when token is absent', async () => {
    await create().ngOnInit();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('discards corrupt legacy user without importing it or requesting tasks', async () => {
    stored.set('workshop_token', 'test-token');
    stored.set('workshop_user', '{');
    const component = create();
    await component.ngOnInit();
    expect(component.error).toBe('');
    expect(component.loading).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(stored.has('workshop_user')).toBe(false);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it.each(['student', ''])('preserves task request, filtering, ordering and labels for %s', async username => {
    authenticate('test-token', { username });
    vi.mocked(axios.get).mockResolvedValue({ data: [
      { title: 'first', status: 'TODO', priority: 'low', owner: 'student' },
      { title: 'archived', status: 'ARCHIVED', priority: 'high' },
      { title: 'second', status: 'DONE', priority: 'low' },
      { title: 'lowercase', status: 'archived', priority: 'high' }
    ] });
    const component = create();
    await component.ngOnInit();
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=' + username,
      { headers: { Authorization: 'Bearer test-token' } });
    expect(component.visibleTasks.map(task => task.title)).toEqual(['first', 'second', 'lowercase']);
    expect(component.visibleTasks[0].label).toBe('LOW · STUDENT');
    expect(component.tasks).toHaveLength(4);
    expect(component.loading).toBe(false);
    expect(detectChanges).toHaveBeenCalled();
  });

  it('renders an empty list', async () => {
    authenticate();
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    const component = create();
    await component.ngOnInit();
    expect(component.visibleTasks).toEqual([]);
    expect(component.loading).toBe(false);
  });

  it('keeps the legacy comparison for differing or absent priorities', async () => {
    authenticate();
    vi.mocked(axios.get).mockResolvedValue({ data: [
      { title: 'low', priority: 'high' },
      { title: 'high', priority: 'low' },
      { title: 'missing' }
    ] });
    const component = create();
    await component.ngOnInit();
    expect(component.visibleTasks.map(task => task.title)).toEqual(['high', 'low', 'missing']);
    expect(component.statusLabel(undefined)).toBe('');
  });

  it('reports a cancelled login redirect', async () => {
    navigate.mockResolvedValue(false);
    const component = create();
    await component.ngOnInit();
    expect(component.error).toBeTruthy();
    expect(component.loading).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it('reports cancelled logout navigation', async () => {
    navigate.mockResolvedValue(false);
    const component = create();
    await component.logout();
    expect(component.error).toBe('No se pudo cerrar la sesión.');
    expect(console.error).toHaveBeenCalled();
  });

  it('does not pretend to log out when clearing storage fails', async () => {
    vi.stubGlobal('localStorage', {
      removeItem: () => { throw new Error('denied'); }
    });
    const component = create();
    await component.logout();
    expect(component.error).toContain('sesión local');
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([{ response: { data: { detail: 'backend' } } }, new Error('network'), {}])('finishes loading on error', async error => {
    authenticate();
    vi.mocked(axios.get).mockRejectedValue(error);
    const component = create();
    await component.ngOnInit();
    expect(component.error).toBeTruthy();
    expect(component.loading).toBe(false);
  });

  it.each(['TODO', 'IN_PROGRESS', 'DONE', 'RESUELTO', 'COMPLETED', 'unknown', ''])('labels status %s', status => {
    const labels: Record<string, string> = {
      TODO: 'Por hacer', IN_PROGRESS: 'En progreso', DONE: 'Completado',
      RESUELTO: 'Resuelto', COMPLETED: 'Completado'
    };
    expect(create().statusLabel(status)).toBe(labels[status] ?? status);
  });

  it('clears only session keys and navigates without HTTP', async () => {
    stored.set('workshop_token', 'test-token');
    stored.set('workshop_user', '{}');
    stored.set('workshop_preferences', '{}');
    await create().logout();
    expect(stored.has('workshop_token')).toBe(false);
    expect(stored.has('workshop_user')).toBe(false);
    expect(stored.has('workshop_preferences')).toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(axios.post).not.toHaveBeenCalled();
  });
});
