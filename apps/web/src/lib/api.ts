/// <reference types="vite/client" />
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

interface ApiRequestOptions extends RequestInit {
  data?: unknown;
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { data, headers, ...customConfig } = options;

  // Get mock user from localStorage for auth header
  const savedUser = localStorage.getItem('mandalotim_user');
  const userId = savedUser ? JSON.parse(savedUser)?.id : undefined;

  const config: RequestInit = {
    method: data ? "POST" : "GET",
    body: data ? JSON.stringify(data) : undefined,
    headers: {
      "Content-Type": data ? "application/json" : "application/json",
      ...(userId ? { "X-User-Id": userId } : {}),
      ...headers,
    },
    credentials: "include", // Required for better-auth session cookies via cross-origin
    ...customConfig,
  };

  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, config);

  if (!response.ok) {
    // Attempt to parse error message if available
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData?.message || errorData?.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses
  if (response.status === 204) {
    return {} as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}
