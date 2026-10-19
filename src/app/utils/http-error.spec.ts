import { describe, expect, it, vi } from 'vitest';
import { httpFailure, notifyError, PublicError } from './http-error';

describe('safe error handling', () => {
  it.each([
    [{ response: { data: { message: 'message' } } }, 'message'],
    [{ response: { data: { detail: 'detail' } } }, 'detail'],
    [new Error('network'), 'network'],
    [null, undefined], [{ response: null }, undefined],
    [{ response: { data: { message: 42 } } }, undefined]
  ])('extracts backend context only as private cause', (error, detail) => {
    const failure = httpFailure(error, 'Public message');
    expect(failure.message).toBe('Public message');
    expect(failure.cause).toBe(detail);
  });

  it('preserves explicit application errors', () => {
    const failure = new PublicError('Invalid response');
    expect(httpFailure(failure, 'fallback')).toBe(failure);
  });

  it('notifies without logging sensitive error objects', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(notifyError(new PublicError('Safe message', { cause: 'secret' }), 'fallback')).toBe('Safe message');
    expect(notifyError({ password: 'secret' }, 'fallback')).toBe('fallback');
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
    log.mockRestore();
  });
});
