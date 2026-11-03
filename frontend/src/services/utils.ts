import type { AxiosResponse } from 'axios';

export function unwrap<T>(response: AxiosResponse): T {
  const body = response.data;
  if (body && typeof body === 'object' && body.success === true && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}
