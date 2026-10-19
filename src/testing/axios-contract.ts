import type { AxiosAdapter, AxiosResponse, AxiosStatic } from 'axios';
import { vi } from 'vitest';

export function contractClient(axios: AxiosStatic, body: unknown, status = 200) {
  const adapter = vi.fn<AxiosAdapter>(async config => {
    const response: AxiosResponse<unknown> = {
      data: body,
      status,
      statusText: String(status),
      headers: {},
      config
    };
    if (config.validateStatus && !config.validateStatus(status)) {
      throw new axios.AxiosError(
        'HTTP contract rejection',
        status >= 500 ? axios.AxiosError.ERR_BAD_RESPONSE : axios.AxiosError.ERR_BAD_REQUEST,
        config,
        undefined,
        response
      );
    }
    return response;
  });
  return { client: axios.create({ adapter }), adapter };
}
