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

  const isFormData = data instanceof FormData;
  const { method = data ? "POST" : "GET", ...configWithoutMethod } = customConfig;

  const config: RequestInit = {
    method,
    body: isFormData ? (data as FormData) : (data ? JSON.stringify(data) : undefined),
    headers: {
      ...(!isFormData && { "Content-Type": "application/json" }),
      ...(userId ? { "X-User-Id": userId } : {}),
      ...headers,
    },
    credentials: "include", // Required for better-auth session cookies via cross-origin
    ...configWithoutMethod,
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

import axios from 'axios';

export async function apiUpload(
  endpoint: string, 
  formData: FormData, 
  onProgress?: (percent: number) => void
) {
  const savedUser = localStorage.getItem('mandalotim_user');
  const userId = savedUser ? JSON.parse(savedUser)?.id : undefined;

  const response = await axios.put(`${API_BASE_URL}${endpoint}`, formData, {
    headers: {
      ...(userId ? { "X-User-Id": userId } : {}),
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    }
  });

  return response.data;
}
