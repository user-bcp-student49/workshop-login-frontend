import '@angular/compiler';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TasksService } from './tasks.service';
import { contractClient } from '../../testing/axios-contract';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));

describe('TasksService', () => {
  beforeEach(() => vi.resetAllMocks());

  it.each(['student', ''])('sends owner %s and Bearer with real Axios defaults', async owner => {
    const realAxios = (await vi.importActual<typeof import('axios')>('axios')).default;
    const { client, adapter } = contractClient(realAxios, []);
    vi.mocked(axios.get).mockImplementation(client.get);

    await expect(new TasksService().list(owner, 'test-token')).resolves.toEqual([]);
    const request = adapter.mock.calls[0][0];
    expect(request.method).toBe('get');
    expect(request.url).toBe('http://localhost:8000/api/tasks?owner=' + owner);
    expect(request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(request.headers.get('Accept')).toBe('application/json, text/plain, */*');
    expect(request.headers.has('Content-Type')).toBe(false);
    expect(request.data).toBeUndefined();
    expect(request.timeout).toBe(0);
    expect([200, 299].every(status => request.validateStatus?.(status))).toBe(true);
  });

  it.each([199, 300, 401, 403, 500])('rejects HTTP %i through real Axios', async status => {
    const realAxios = (await vi.importActual<typeof import('axios')>('axios')).default;
    const { client, adapter } = contractClient(realAxios, [], status);
    vi.mocked(axios.get).mockImplementation(client.get);

    await expect(new TasksService().list('student', 'test-token'))
      .rejects.toThrow('No se pudo cargar el dashboard.');
    expect(adapter.mock.calls[0][0].validateStatus?.(status)).toBe(false);
  });

  it.each(['student', ''])('preserves GET and Bearer for owner %s', async owner => {
    const tasks = [{ status: 'UNKNOWN', priority: 2, owner: 'student' }, {}];
    vi.mocked(axios.get).mockResolvedValue({ data: tasks });
    await expect(new TasksService().list(owner, 'test-token')).resolves.toEqual(tasks);
    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=' + owner,
      { headers: { Authorization: 'Bearer test-token' } });
  });

  it.each([null, {}, [null], [{ status: 3 }], [{ priority: {} }], [{ owner: [] }],
    [{ title: 4 }], [{ description: false }]])
  ('rejects malformed tasks %j instead of returning an empty list', async response => {
    vi.mocked(axios.get).mockResolvedValue({ data: response });
    await expect(new TasksService().list('', 'test-token')).rejects.toThrow();
  });

  it('keeps an empty list successful', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    await expect(new TasksService().list('', 'test-token')).resolves.toEqual([]);
  });

  it('does not expose backend detail in public errors', async () => {
    vi.mocked(axios.get).mockRejectedValue({ response: { data: { detail: 'internal' } } });
    await expect(new TasksService().list('', 'test-token')).rejects.toThrow('No se pudo cargar el dashboard.');
  });
});
