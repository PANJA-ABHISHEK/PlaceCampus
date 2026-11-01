// ============================================
// PlaceCampus — API Client Configuration
// ============================================

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface RequestConfig extends RequestInit {
  params?: Record<string, string>;
  _retry?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private async request<T>(
    path: string,
    config: RequestConfig = {},
  ): Promise<T> {
    const { params, ...fetchConfig } = config;
    const url = this.buildUrl(path, params);

    const headers = new Headers(fetchConfig.headers || {});
    if (!headers.has("Content-Type") && !(config.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (this.accessToken) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    const response = await fetch(url, {
      ...fetchConfig,
      headers,
      credentials: "include", // Important for cookies
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // Handle 401 and Token Refresh
      if (
        response.status === 401 &&
        !config._retry &&
        path !== "/auth/login" &&
        path !== "/auth/refresh"
      ) {
        if (this.isRefreshing) {
          // Wait for refresh to complete, then retry
          return new Promise<T>((resolve) => {
            this.addRefreshSubscriber((token) => {
              resolve(this.request<T>(path, { ...config, _retry: true }));
            });
          });
        }

        this.isRefreshing = true;
        config._retry = true;

        try {
          const refreshRes = await fetch(this.buildUrl("/auth/refresh"), {
            method: "POST",
            credentials: "include",
          });

          if (!refreshRes.ok) {
            throw new Error("Refresh failed");
          }

          const refreshData = await refreshRes.json();
          this.setAccessToken(refreshData.accessToken);
          this.onRefreshed(refreshData.accessToken);
          this.isRefreshing = false;

          // Retry original request
          return this.request<T>(path, config);
        } catch (error) {
          this.isRefreshing = false;
          this.setAccessToken(null);
          // Optional: Dispatch a global logout event here
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("auth:unauthorized"));
          }
          throw new ApiError(401, "Session expired");
        }
      }

      throw new ApiError(
        response.status,
        errorData.message || "Request failed",
        errorData.errors,
      );
    }

    return response.json();
  }

  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: "GET" });
  }

  async post<T>(
    path: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: "POST",
      body:
        data instanceof FormData
          ? data
          : data
            ? JSON.stringify(data)
            : undefined,
    });
  }

  async put<T>(
    path: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: "PUT",
      body:
        data instanceof FormData
          ? data
          : data
            ? JSON.stringify(data)
            : undefined,
    });
  }

  async patch<T>(
    path: string,
    data?: unknown,
    config?: RequestConfig,
  ): Promise<T> {
    return this.request<T>(path, {
      ...config,
      method: "PATCH",
      body:
        data instanceof FormData
          ? data
          : data
            ? JSON.stringify(data)
            : undefined,
    });
  }

  async delete<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(path, { ...config, method: "DELETE" });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
