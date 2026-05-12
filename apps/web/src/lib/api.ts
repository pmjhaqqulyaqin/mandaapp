/// <reference types="vite/client" />
import { cacheApiResponse, getCachedApiResponse } from './apiCache';

export const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : "http://localhost:3001/api");

interface ApiRequestOptions extends RequestInit {
  data?: unknown;
}

export async function apiClient<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { data, headers, ...customConfig } = options;

  const isFormData = data instanceof FormData;
  const { method = data ? "POST" : "GET", ...configWithoutMethod } = customConfig;
  const isGET = method === "GET";

  // ━━ OFFLINE-FIRST for GET requests ━━
  // If clearly offline, serve from cache immediately without attempting fetch
  if (isGET && !navigator.onLine) {
    const cached = await getCachedApiResponse(endpoint);
    if (cached) {
      console.log(`[API] Offline → serving cached: ${endpoint} (${cached.isStale ? 'stale' : 'fresh'}, ${Math.round((Date.now() - cached.cachedAt) / 60000)}m ago)`);
      return cached.data as T;
    }
    // No cache available — throw so caller can show appropriate UI
    throw new Error(`Offline: no cached data for ${endpoint}`);
  }

  const config: RequestInit = {
    method,
    body: isFormData ? (data as FormData) : (data ? JSON.stringify(data) : undefined),
    headers: {
      ...(!isFormData && { "Content-Type": "application/json" }),
      ...headers,
    },
    credentials: "include", // Required for better-auth session cookies
    ...configWithoutMethod,
  };

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
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

    let result: T;
    try {
      result = (await response.json()) as T;
    } catch {
      result = {} as T;
    }

    // Cache successful GET responses (non-blocking)
    if (isGET) {
      cacheApiResponse(endpoint, result).catch(() => {});
    }

    return result;
  } catch (err: any) {
    // On network error for GET requests, try cached response
    if (isGET) {
      const msg = (err?.message || '').toLowerCase();
      const isNetworkErr = !navigator.onLine 
        || msg.includes('failed to fetch') 
        || msg.includes('networkerror') 
        || msg.includes('network error')
        || msg.includes('load failed')
        || msg.includes('fetch error')
        || msg.includes('abort')
        || err.name === 'TypeError'; // fetch() throws TypeError on network failures

      if (isNetworkErr) {
        const cached = await getCachedApiResponse(endpoint);
        if (cached) {
          console.log(`[API] Network error → serving cached: ${endpoint} (${cached.isStale ? 'stale' : 'fresh'})`);
          return cached.data as T;
        }
      }
    }
    throw err;
  }
}

import axios from 'axios';

export async function apiUpload(
  endpoint: string, 
  formData: FormData, 
  onProgress?: (percent: number) => void
) {
  const response = await axios.put(`${API_BASE_URL}${endpoint}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    withCredentials: true, // Required for better-auth session cookies
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    }
  });

  return response.data;
}

