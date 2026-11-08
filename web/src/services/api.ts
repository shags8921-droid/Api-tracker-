/**
 * Client API service for SitePulse AI.
 * Authentication is a signed bearer token issued by the server (POST /api/v1/auth/login|register).
 * Role and tenant are NEVER sent by the client: the server derives them from the verified token.
 * The token lives in sessionStorage (cleared when the tab closes); the in-memory copy is used if storage is unavailable.
 */

export type Role = 'OWNER' | 'MANAGER';

export interface SessionUser {
  id: string;
  orgId: string;
  name: string;
  email: string;
  role: Role;
  isPlatformAdmin?: boolean;
  mustChangePassword?: boolean;
}

export interface ApiResult<T> {
  data: T;
  latencyMs: number;
  status: number;
}

export const UNAUTHORIZED_EVENT = 'sitepulse:unauthorized';
const TOKEN_KEY = 'sitepulse.token';

class ApiService {
  private token: string | null = null;
  private user: SessionUser | null = null;

  constructor() {
    try {
      this.token = sessionStorage.getItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  }

  hasToken(): boolean {
    return !!this.token;
  }

  setToken(token: string | null) {
    this.token = token;
    try {
      if (token) sessionStorage.setItem(TOKEN_KEY, token);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  }

  setSession(user: SessionUser | null) {
    this.user = user;
  }

  /** Role/tenant as verified by the server for the current session (read-only mirror for UI/logic). */
  getUserRole(): Role {
    return this.user?.role ?? 'MANAGER';
  }

  getOrgId(): string {
    return this.user?.orgId ?? '';
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json', ...(extra || {}) };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  private async request<T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<ApiResult<T>> {
    const start = Date.now();
    let res: Response;
    try {
      res = await fetch(path, {
        method,
        headers: this.headers(extraHeaders),
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (e: any) {
      throw { message: e?.message || 'Network request failed', latencyMs: Date.now() - start, status: 0 };
    }
    const latencyMs = Date.now() - start;
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      if (res.status === 401 && this.token) {
        this.setToken(null);
        this.setSession(null);
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }
      throw {
        message: data?.message || data?.error || `HTTP ${res.status}`,
        latencyMs,
        status: res.status,
        data
      };
    }
    return { data: data as T, latencyMs, status: res.status };
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }
  post<T>(path: string, body: unknown = {}, headers?: Record<string, string>) {
    return this.request<T>('POST', path, body, headers);
  }
  patch<T>(path: string, body: unknown = {}) {
    return this.request<T>('PATCH', path, body);
  }
  delete<T>(path: string) {
    return this.request<T>('DELETE', path);
  }

  /** Generates a key so a retried/double-clicked mutation is applied once by the server. */
  newIdempotencyKey(): string {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  // ---- auth ----
  async login(email: string, password: string): Promise<SessionUser> {
    const { data } = await this.post<{ token: string; user: SessionUser }>('/api/v1/auth/login', { email, password });
    this.setToken(data.token);
    this.setSession(data.user);
    return data.user;
  }

  async register(input: { orgName: string; email: string; password: string; name?: string }): Promise<SessionUser> {
    const { data } = await this.post<{ token: string; user: SessionUser }>('/api/v1/auth/register', input);
    this.setToken(data.token);
    this.setSession(data.user);
    return data.user;
  }

  async restoreSession(): Promise<SessionUser | null> {
    if (!this.token) return null;
    try {
      const { data } = await this.get<{ user: SessionUser }>('/api/v1/auth/me');
      this.setSession(data.user);
      return data.user;
    } catch {
      this.setToken(null);
      this.setSession(null);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.post('/api/v1/auth/logout', {});
    } catch {
      /* token may already be invalid */
    }
    this.setToken(null);
    this.setSession(null);
  }
}

export const api = new ApiService();
