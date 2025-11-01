import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    let text = "";
    
    // Check if response is JSON or HTML
    if (contentType.includes("application/json")) {
      try {
        const json = await res.json();
        text = json.message || JSON.stringify(json);
      } catch (e) {
        text = await res.text();
      }
    } else {
      text = await res.text();
      // If it's HTML (like an error page), provide a better error message
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        text = `Server returned HTML error page (Status ${res.status}). The API route may not exist or the server needs to be restarted.`;
      }
    }
    
    const errorMessage = text || res.statusText;
    throw new Error(`${res.status}: ${errorMessage}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build URL with query parameters
    let url = queryKey[0] as string;
    
    // If there's a second element that's an object, convert it to query params
    if (queryKey.length > 1 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
      const params = new URLSearchParams();
      const filters = queryKey[1] as Record<string, string>;
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
      
      const queryString = params.toString();
      if (queryString) {
        url = `${url}?${queryString}`;
      }
    } else {
      // For non-object keys, join with "/"
      url = queryKey.join("/") as string;
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
