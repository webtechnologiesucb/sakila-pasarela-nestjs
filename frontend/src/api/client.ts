import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  updateSessionTokens,
} from '../store/session';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

const refreshClient = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string> | null = null;

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function redirectToLogin() {
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  const { data } = await refreshClient.post('/auth/refresh', {
    refresh_token: refreshToken,
  });

  const payload = data?.data ?? data;
  updateSessionTokens({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
  return payload.access_token as string;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const url = original?.url || '';
    const status = error.response?.status;

    const isAuthEndpoint =
      url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      try {
        refreshPromise = refreshPromise || refreshAccessToken();
        const token = await refreshPromise;
        refreshPromise = null;

        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        refreshPromise = null;
        clearSession();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[]; errors?: string[] }
      | undefined;

    if (data?.errors?.length) return data.errors.join(', ');
    if (Array.isArray(data?.message)) return data.message.join(', ');
    if (data?.message) return data.message;
    if (error.code === 'ECONNABORTED') return 'La solicitud tardó demasiado. Intente de nuevo.';
    if (!error.response) return 'No se pudo conectar con el servidor.';
  }

  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}
