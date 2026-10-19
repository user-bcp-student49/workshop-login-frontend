export class PublicError extends Error {}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function httpFailure(error: unknown, publicMessage: string): PublicError {
  if (error instanceof PublicError) return error;
  const response = isRecord(error) ? error['response'] : undefined;
  const body = isRecord(response) ? response['data'] : undefined;
  const detail = [
    isRecord(body) ? body['message'] : undefined,
    isRecord(body) ? body['detail'] : undefined,
    isRecord(error) ? error['message'] : undefined
  ].find((value): value is string => typeof value === 'string' && value.length > 0);
  return new PublicError(publicMessage, { cause: detail });
}

export function notifyError(error: unknown, fallback: string): string {
  console.error(fallback, { category: error instanceof PublicError ? 'application' : 'unexpected' });
  return error instanceof PublicError ? error.message : fallback;
}
