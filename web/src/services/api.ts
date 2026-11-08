/**
 * Client API Integration Service for SitePulse AI — Phase 4
 * Performs REST communication with backend endpoints with role header enforcement,
 * latency calculation, and error logging.
 */

export interface ApiClientConfig {
  baseUrl: string;
  userRole: 'OWNER' | 'MANAGER';
  activeOrgId?: string;
  token?: string;
}

class ApiService {
  private config: ApiClientConfig = {
    baseUrl: '',
    userRole: 'OWNER',
    activeOrgId: 'org_acme_corp'
  };

  setUserRole(role: 'OWNER' | 'MANAGER') {
    this.config.userRole = role;
  }

  getUserRole(): 'OWNER' | 'MANAGER' {
    return this.config.userRole;
  }

  setOrgId(orgId: string) {
    this.config.activeOrgId = orgId;
  }

  getOrgId(): string {
    return this.config.activeOrgId || 'org_acme_corp';
  }

  setToken(token: string) {
    this.config.token = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Role': this.config.userRole,
      'X-Tenant-Id': this.config.activeOrgId || 'org_acme_corp'
    };
    if (this.config.token) {
      headers['Authorization'] = `Bearer ${this.config.token}`;
    }
    return headers;
  }

  async get<T>(path: string): Promise<{ data: T; latencyMs: number; status: number }> {
    const start = Date.now();
    try {
      const res = await fetch(path, {
        method: 'GET',
        headers: this.getHeaders()
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return { data, latencyMs, status: res.status };
    } catch (e: any) {
      const latencyMs = Date.now() - start;
      throw { message: e.message || 'Network request failed', latencyMs, status: 500 };
    }
  }

  async post<T>(path: string, body: any): Promise<{ data: T; latencyMs: number; status: number }> {
    const start = Date.now();
    try {
      const res = await fetch(path, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return { data, latencyMs, status: res.status };
    } catch (e: any) {
      const latencyMs = Date.now() - start;
      throw { message: e.message || 'Network request failed', latencyMs, status: 500 };
    }
  }

  async patch<T>(path: string, body: any): Promise<{ data: T; latencyMs: number; status: number }> {
    const start = Date.now();
    try {
      const res = await fetch(path, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return { data, latencyMs, status: res.status };
    } catch (e: any) {
      const latencyMs = Date.now() - start;
      throw { message: e.message || 'Network request failed', latencyMs, status: 500 };
    }
  }

  async delete<T>(path: string): Promise<{ data: T; latencyMs: number; status: number }> {
    const start = Date.now();
    try {
      const res = await fetch(path, {
        method: 'DELETE',
        headers: this.getHeaders()
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return { data, latencyMs, status: res.status };
    } catch (e: any) {
      const latencyMs = Date.now() - start;
      throw { message: e.message || 'Network request failed', latencyMs, status: 500 };
    }
  }

  async getNotifications(): Promise<{ notifications: any[]; unreadCount: number }> {
    const res = await this.get<{ notifications: any[]; unreadCount: number }>('/api/v1/notifications');
    return res.data;
  }

  async markNotificationRead(id: string): Promise<any> {
    const res = await this.post<any>(`/api/v1/notifications/${id}/read`, {});
    return res.data;
  }

  async uploadFile(fileName: string, fileType: string, dataUrl: string): Promise<any> {
    const res = await this.post<any>('/api/v1/uploads', { fileName, fileType, dataUrl });
    return res.data;
  }
}

export const api = new ApiService();
