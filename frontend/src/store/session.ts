import type { AuthSession } from '../types';

const STORAGE_KEY = 'sakila.gateway.session.v1';

let memorySession: AuthSession | null = null;

export function getSession(): AuthSession | null {
  if (memorySession) return memorySession;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    memorySession = JSON.parse(raw) as AuthSession;
    return memorySession;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  memorySession = session;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Storage can be unavailable (private mode). Memory fallback still works.
  }
}

export function clearSession(): void {
  memorySession = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function getAccessToken(): string | null {
  return getSession()?.access_token || null;
}

export function getRefreshToken(): string | null {
  return getSession()?.refresh_token || null;
}

export function updateSessionTokens(tokens: {
  access_token: string;
  refresh_token?: string;
}): AuthSession | null {
  const session = getSession();
  if (!session) return null;

  const updated: AuthSession = {
    ...session,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || session.refresh_token,
  };
  saveSession(updated);
  return updated;
}
