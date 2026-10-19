import '@angular/compiler';
import { NgZone } from '@angular/core';
import { Router } from '@angular/router';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AuthService } from './services/auth.service';
import { TasksService } from './services/tasks.service';
import { SessionService } from './services/session.service';

vi.mock('axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
vi.mock('@angular/router', () => ({
  Router: class { navigate = vi.fn().mockResolvedValue(true); }
}));

describe('Login -> tasks -> logout with real application services', () => {
  const createFlow = () => {
    const router = new Router();
    vi.mocked(router.navigate).mockResolvedValue(true);
    const session = new SessionService();
    const detector = {
      markForCheck: vi.fn(), detectChanges: vi.fn(), detach: vi.fn(),
      reattach: vi.fn(), checkNoChanges: vi.fn()
    };
    const zone = { run: (action: () => void) => action() } as NgZone;
    return {
      router,
      session,
      login: new LoginComponent(router, new AuthService(), session, detector, zone),
      dashboard: new DashboardComponent(router, detector, zone, new TasksService(), session),
      nextDashboard: () => new DashboardComponent(router, detector, zone, new TasksService(), session)
    };
  };

  beforeEach(() => {
    vi.resetAllMocks();
    const stored = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key)
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads tasks after valid login and prevents another GET after logout', async () => {
    const { router, session, login, dashboard, nextDashboard } = createFlow();
    const navigate = vi.mocked(router.navigate);
    vi.mocked(axios.post).mockResolvedValue({
      data: { token: 'flow-test-token', user: { username: 'student', displayName: 'Student' } }
    });
    vi.mocked(axios.get).mockResolvedValue({ data: [
      { title: 'Visible task', description: 'Test description', status: 'TODO', priority: 'high', owner: 'student' },
      { title: 'Hidden task', status: 'ARCHIVED' }
    ] });

    login.username = 'student';
    login.password = 'test-password';
    await login.login();
    expect(login.message).toBe('');
    expect(login.busy).toBe(false);
    expect(navigate).toHaveBeenLastCalledWith(['/dashboard']);

    await dashboard.ngOnInit();
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=student',
      { headers: { Authorization: 'Bearer flow-test-token' } });
    expect(dashboard.loading).toBe(false);
    expect(dashboard.error).toBe('');
    expect(dashboard.visibleTasks.map(task => task.title)).toEqual(['Visible task']);
    expect(dashboard.visibleTasks[0].label).toBe('HIGH · STUDENT');
    expect(dashboard.user.displayName).toBe('Student');

    await dashboard.logout();
    expect(navigate).toHaveBeenLastCalledWith(['/login']);
    expect(session.read()).toBeNull();
    expect(localStorage.getItem('workshop_preferences')).not.toBeNull();
    await nextDashboard().ngOnInit();
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])('reports a login-issued token rejected by tasks with HTTP %i', async status => {
    const { router, session, login, dashboard } = createFlow();
    vi.mocked(axios.post).mockResolvedValue({
      data: { token: 'rejected-test-token', user: { username: 'student' } }
    });
    vi.mocked(axios.get).mockRejectedValue({ response: { status, data: { detail: 'expired token' } } });
    login.username = 'student';
    login.password = 'test-password';
    await login.login();
    await dashboard.ngOnInit();
    expect(dashboard.error).toBe('No se pudo cargar el dashboard.');
    expect(dashboard.loading).toBe(false);
    expect(dashboard.visibleTasks).toEqual([]);
    expect(vi.mocked(router.navigate)).toHaveBeenCalledTimes(1);
    expect(session.read()?.token).toBe('rejected-test-token');
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('requires login on a new page instance without losing the original page session', async () => {
    const original = createFlow();
    vi.mocked(axios.post).mockResolvedValue({
      data: { token: 'page-token', user: { username: 'student' } }
    });
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    original.login.username = 'student';
    original.login.password = 'test-password';
    await original.login.login();
    await original.dashboard.ngOnInit();

    const reloaded = createFlow();
    await reloaded.dashboard.ngOnInit();
    expect(vi.mocked(reloaded.router.navigate)).toHaveBeenLastCalledWith(['/login']);
    expect(reloaded.session.read()).toBeNull();
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(original.session.read()?.token).toBe('page-token');
    expect(localStorage.getItem('workshop_token')).toBeNull();
    expect(localStorage.getItem('workshop_user')).toBeNull();
    expect(localStorage.getItem('workshop_preferences')).not.toBeNull();
  });

  it('shows migration cleanup failures before tasks and on the login screen', async () => {
    vi.stubGlobal('localStorage', {
      removeItem: () => { throw new Error('denied'); }
    });
    const flow = createFlow();
    expect(flow.login.message).toBe('No se pudo cerrar la sesión local.');
    await flow.dashboard.ngOnInit();
    expect(flow.dashboard.error).toBe('No se pudo leer la sesión guardada.');
    expect(flow.dashboard.loading).toBe(false);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('does not log out a separate page memory session', async () => {
    const first = createFlow();
    const second = createFlow();
    vi.mocked(axios.post).mockResolvedValue({
      data: { token: 'page-token', user: { username: 'student' } }
    });
    for (const flow of [first, second]) {
      flow.login.username = 'student';
      flow.login.password = 'test-password';
      await flow.login.login();
    }
    await first.dashboard.logout();
    expect(first.session.read()).toBeNull();
    expect(second.session.read()?.token).toBe('page-token');
  });
});
