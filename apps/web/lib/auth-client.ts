export interface StoredSession {
  accessToken?: string;
  csrfToken?: string;
  tenantId?: string;
  userId?: string;
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function toApiUrl(input: string): string {
  if (!input.startsWith("/") || isAbsoluteUrl(input)) {
    return input;
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    return input;
  }

  return new URL(input, apiBaseUrl).toString();
}

export function getStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const accessToken = localStorage.getItem("bh_access_token");
  const csrfToken = localStorage.getItem("bh_csrf_token");
  const tenantId = localStorage.getItem("bh_tenant_id");
  const userId = localStorage.getItem("bh_user_id");

  if (!accessToken && !csrfToken && !tenantId && !userId) {
    return null;
  }

  return {
    ...(accessToken ? { accessToken } : {}),
    ...(csrfToken ? { csrfToken } : {}),
    ...(tenantId ? { tenantId } : {}),
    ...(userId ? { userId } : {})
  };
}

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export async function fetchWithSession(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const session = getStoredSession();

  const headers = new Headers(init.headers);

  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const csrfToken = session?.csrfToken ?? getCookieValue("bh360_csrf");
  if (csrfToken) {
    headers.set("x-csrf-token", csrfToken);
  }

  if (session?.tenantId) {
    headers.set("x-tenant-id", session.tenantId);
  }

  if (session?.userId) {
    headers.set("x-user-id", session.userId);
  }

  const nextInit: RequestInit = {
    ...init,
    credentials: "include",
    headers
  };

  if (typeof input === "string") {
    return fetch(toApiUrl(input), nextInit);
  }

  return fetch(input, nextInit);
}
