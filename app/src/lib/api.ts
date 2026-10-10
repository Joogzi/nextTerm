import { getStoredToken } from "./auth";
import { isDemo } from './demo-mode';

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (isDemo) {
    const { demoApi } = await import('./demo-api');
    return demoApi(path, init) as Promise<T>;
  }
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    headers,
    ...init,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
