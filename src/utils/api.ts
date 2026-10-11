// Dynamic API and WebSocket endpoint resolver

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const custom = localStorage.getItem("custom_server_url");
      if (custom && custom.trim().startsWith("http")) {
        return custom.trim().replace(/\/$/, "");
      }
    } catch (_) {}
  }
  const envUrl = ((import.meta as any).env?.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
  if (envUrl) return envUrl;
  return "";
}

export const API_BASE_URL: string = getApiBaseUrl();

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const url = input.startsWith("/api") ? `${baseUrl}${input}` : input;

  const headers = new Headers(init?.headers || {});

  // Automatically attach stored session token if not explicitly provided
  if (!headers.has("Authorization")) {
    try {
      const storedToken = localStorage.getItem("crowd_auth_token");
      if (storedToken && storedToken.trim()) {
        headers.set("Authorization", `Bearer ${storedToken.trim()}`);
      }
    } catch (_) {}
  }

  // Automatically attach stored user ID for auditing and direct lookup continuity
  if (!headers.has("X-User-Id")) {
    try {
      const storedUserId = localStorage.getItem("crowd_user_id");
      if (storedUserId && storedUserId.trim()) {
        headers.set("X-User-Id", storedUserId.trim());
      }
    } catch (_) {}
  }

  return fetch(url, {
    ...init,
    headers,
  });
}

export function getWebSocketUrl(): string {
  const baseUrl = getApiBaseUrl();
  if (baseUrl) {
    const wsPrefix = baseUrl.replace(/^http/, "ws");
    return `${wsPrefix}/ws`;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws`;
  }
  return "ws://localhost:3000/ws";
}

export function setCustomServerUrl(url: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem("custom_server_url");
    } else {
      let cleaned = url.trim().replace(/\/$/, "");
      if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
        cleaned = `https://${cleaned}`;
      }
      localStorage.setItem("custom_server_url", cleaned);
    }
  } catch (_) {}
}

export function getEffectiveServerDisplay(): string {
  if (typeof window === "undefined") return "http://localhost:3000";
  try {
    const custom = localStorage.getItem("custom_server_url");
    if (custom) return custom;
  } catch (_) {}
  const envUrl = ((import.meta as any).env?.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
  if (envUrl) return envUrl;
  return window.location.origin;
}
