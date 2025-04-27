// hooks/useApiRequest.ts
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * API Request Status Type
 */
type RequestStatus = "idle" | "loading" | "success" | "error";

/**
 * Options for the useApiRequest hook
 */
export type UseApiRequestOptions<TData, TError = any> = {
  /** Should it run manually or automatically */
  manual?: boolean;
  
  /** Dependencies for re-execution */
  deps?: any[];
  
  /** Initial data value */
  initialData?: TData | null;
  
  /** Success callback */
  onSuccess?: (data: TData) => void;
  
  /** Error callback */
  onError?: (err: TError) => void;
  
  /** Delay before executing the request (in milliseconds) */
  delay?: number;
  
  /** Whether to cache the result */
  cache?: boolean;
  
  /** Cache key for storing and retrieving data */
  cacheKey?: string;
  
  /** Time-to-live for cached data (in milliseconds) */
  cacheTTL?: number;
  
  /** Whether to automatically retry after a failure */
  autoRetry?: boolean;
  
  /** Maximum number of retry attempts */
  maxRetries?: number;
  
  /** Function to calculate delay between retries */
  retryDelay?: (attempt: number) => number;
};

/**
 * Return type for the useApiRequest hook
 */
export type UseApiRequestResult<TData, TError = any> = {
  /** Data received from the request */
  data: TData | null;
  
  /** Whether the request is loading */
  loading: boolean;
  
  /** Current status of the request */
  status: RequestStatus;
  
  /** Request error (if any) */
  error: TError | null;
  
  /** Function to re-execute the request */
  refetch: () => Promise<TData>;
  
  /** Function to manually update data */
  setData: (data: TData | null) => void;
  
  /** Function to clear data and error */
  reset: () => void;
  
  /** Whether the request has been executed at least once */
  isFetched: boolean;
};

/**
 * Cache management for API requests
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const cache: Record<string, CacheItem<any>> = {};

/**
 * Custom hook for handling API requests with loading, error, and data states
 * 
 * @param requestFn - Function that returns a Promise
 * @param options - Hook configuration options
 */
export const useApiRequest = <TData, TError = any>(
  requestFn: () => Promise<TData>,
  options: UseApiRequestOptions<TData, TError> = {}
): UseApiRequestResult<TData, TError> => {
  const {
    manual = false,
    deps = [],
    initialData = null,
    onSuccess,
    onError,
    delay = 0,
    cache: shouldCache = false,
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes default
    autoRetry = false,
    maxRetries = 3,
    retryDelay = (attempt) => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff with 30s max
  } = options;

  // Reference to request function to prevent unwanted re-executions
  const requestFnRef = useRef(requestFn);
  useEffect(() => {
    requestFnRef.current = requestFn;
  }, [requestFn]);

  // Retrieve from cache if exists and valid
  const getCachedData = useCallback((): TData | null => {
    if (!shouldCache || !cacheKey) return null;
    
    const cachedItem = cache[cacheKey];
    if (!cachedItem) return null;
    
    const isExpired = Date.now() - cachedItem.timestamp > cacheTTL;
    if (isExpired) {
      delete cache[cacheKey];
      return null;
    }
    
    return cachedItem.data;
  }, [shouldCache, cacheKey, cacheTTL]);

  // State management
  const [data, setDataState] = useState<TData | null>(() => {
    return getCachedData() || initialData;
  });
  const [status, setStatus] = useState<RequestStatus>(manual ? "idle" : "loading");
  const [error, setError] = useState<TError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isFetched, setIsFetched] = useState(false);

  // Set data manually
  const setData = useCallback((newData: TData | null) => {
    setDataState(newData);
    if (newData !== null) {
      setStatus("success");
      
      // Store in cache if enabled
      if (shouldCache && cacheKey && newData) {
        cache[cacheKey] = {
          data: newData,
          timestamp: Date.now(),
        };
      }
    }
  }, [shouldCache, cacheKey]);

  // Clear state
  const reset = useCallback(() => {
    setDataState(initialData);
    setStatus("idle");
    setError(null);
    setRetryCount(0);
    setIsFetched(false);
  }, [initialData]);

  // Handle API fetch operation
  const fetchWithRetry = useCallback(async (attempt = 0): Promise<TData> => {
    try {
      // Retrieve from cache if available
      const cachedData = getCachedData();
      if (cachedData) {
        setData(cachedData);
        setStatus("success");
        onSuccess?.(cachedData);
        return cachedData;
      }

      // Execute request with delay if specified
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const result = await requestFnRef.current();
      setData(result);
      setStatus("success");
      setIsFetched(true);
      onSuccess?.(result);
      
      // Store in cache if enabled
      if (shouldCache && cacheKey) {
        cache[cacheKey] = {
          data: result,
          timestamp: Date.now(),
        };
      }
      
      setRetryCount(0);
      return result;
    } catch (err) {
      setError(err as TError);
      setStatus("error");
      setIsFetched(true);
      onError?.(err as TError);
      
      // Retry if enabled
      if (autoRetry && attempt < maxRetries) {
        const nextAttempt = attempt + 1;
        setRetryCount(nextAttempt);
        
        // Calculate delay for retry
        const nextDelay = retryDelay(attempt);
        
        await new Promise(resolve => setTimeout(resolve, nextDelay));
        return fetchWithRetry(nextAttempt);
      }
      
      throw err;
    }
  }, [
    getCachedData, delay, onSuccess, onError, 
    shouldCache, cacheKey, autoRetry, maxRetries, retryDelay
  ]);

  // Main fetch function exposed externally
  const fetch = useCallback(async (): Promise<TData> => {
    setStatus("loading");
    return fetchWithRetry();
  }, [fetchWithRetry]);

  // Auto-execute if not manual
  useEffect(() => {
    if (!manual) {
      fetch().catch(() => {
        // Error already handled in fetchWithRetry function
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // Calculate loading state based on status
  const loading = status === "loading";

  return {
    data,
    loading,
    status,
    error,
    refetch: fetch,
    setData,
    reset,
    isFetched
  };
};

/**
 * Example usage:
 * 
 * const getUserData = async (userId) => {
 *   const response = await fetch(`https://api.example.com/users/${userId}`);
 *   if (!response.ok) {
 *     throw new Error('Failed to fetch user data');
 *   }
 *   return response.json();
 * };
 * 
 * // Without parameters
 * const { data, loading, error, refetch } = useApiRequest(
 *   () => getUserData(userId),
 *   {
 *     deps: [userId],
 *     onSuccess: (data) => console.log('Data loaded:', data),
 *     onError: (err) => console.error('Error loading data:', err)
 *   }
 * );
 * 
 * // With caching
 * const { data, loading, error, refetch } = useApiRequest(
 *   () => getUserData(userId),
 *   {
 *     cache: true,
 *     cacheKey: `user-${userId}`,
 *     cacheTTL: 60 * 1000, // 1 minute
 *   }
 * );
 * 
 * // With manual execution
 * const { data, loading, error, refetch } = useApiRequest(
 *   () => getUserData(userId),
 *   { manual: true }
 * );
 * 
 * // Usage in component
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * if (!data) return <button onClick={refetch}>Load Data</button>;
 * 
 * return <div>{data.name}</div>;
 */
