import '@angular/compiler';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { contractClient } from '../../testing/axios-contract';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));

describe('AuthService', () => {
  beforeEach(() => vi.resetAllMocks());

  it('serializes the login with real Axios defaults before transport', async () => {
    const realAxios = (await vi.importActual<typeof import('axios')>('axios')).default;
    const { client, adapter } = contractClient(realAxios, { token: 'test-token', user: {} });
    vi.mocked(axios.post).mockImplementation(client.post);

    await expect(new AuthService().login({ username: ' student ', password: ' password ' }))
      .resolves.toEqual({ token: 'test-token', user: {} });

    const request = adapter.mock.calls[0][0];
    expect(request.method).toBe('post');
    expect(request.url).toBe('http://localhost:8080/auth/login');
    expect(request.data).toBe(JSON.stringify({
      username: ' student ', password: ' password ', client: 'angular-workshop'
    }));
    expect(request.timeout).toBe(5000);
    expect(request.headers.get('Content-Type')).toBe('application/json');
    expect(request.headers.get('Accept')).toBe('application/json, text/plain, */*');
    expect(request.headers.has('Authorization')).toBe(false);
    expect([200, 299].every(status => request.validateStatus?.(status))).toBe(true);
  });

  it.each([199, 300, 401, 403, 500])('rejects HTTP %i through real Axios', async status => {
    const realAxios = (await vi.importActual<typeof import('axios')>('axios')).default;
    const { client, adapter } = contractClient(realAxios, { token: 'test-token', user: {} }, status);
    vi.mocked(axios.post).mockImplementation(client.post);

    await expect(new AuthService().login({ username: 'student', password: 'test' }))
      .rejects.toThrow('No se pudo autenticar. Intente nuevamente.');
    expect(adapter.mock.calls[0][0].validateStatus?.(status)).toBe(false);
  });

  it('preserves the POST contract and accepts minimal user fields', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: { token: 'test-token', user: {} } });
    await expect(new AuthService().login({ username: ' student ', password: ' password ' }))
      .resolves.toEqual({ token: 'test-token', user: {} });
    expect(axios.post).toHaveBeenCalledWith('http://localhost:8080/auth/login',
      { username: ' student ', password: ' password ', client: 'angular-workshop' }, { timeout: 5000 });
  });

  it.each([null, [], {}, { token: '' }, { token: 1 }, { token: 'token', user: null },
    { token: 'token', user: { username: 1 } }, { token: 'token', user: { displayName: [] } }])
  ('rejects malformed response %j explicitly', async response => {
    vi.mocked(axios.post).mockResolvedValue({ data: response });
    await expect(new AuthService().login({ username: 'student', password: 'test' })).rejects.toThrow();
  });

  it.each([{ response: { data: { message: 'internal' } } }, new Error('network'), null])
  ('returns a safe error without credentials', async error => {
    vi.mocked(axios.post).mockRejectedValue(error);
    await expect(new AuthService().login({ username: 'student', password: 'test' }))
      .rejects.toThrow('No se pudo autenticar. Intente nuevamente.');
  });
});
