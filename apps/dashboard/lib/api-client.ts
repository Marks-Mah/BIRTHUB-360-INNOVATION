const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const API_BASE_URL = RAW_API_BASE_URL.endsWith("/api/v1") ? RAW_API_BASE_URL : `${RAW_API_BASE_URL}/api/v1`;

type RequestOptions = {
  headers?: HeadersInit;
};

async function request<T>(path: string, init: RequestInit, options?: RequestOptions): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API request failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(path, { method: "POST", body: JSON.stringify(body) }, options);
  },
};
