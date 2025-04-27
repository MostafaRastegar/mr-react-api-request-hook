# useApiRequest

A powerful, flexible React hook for handling API requests with built-in state management, caching, and retry capabilities.

## Features

- 🚀 **Simple API**: Easy to use with minimal configuration
- 🔄 **State Management**: Tracks loading, error, and success states
- 💾 **Caching**: Built-in caching system for optimizing network requests
- 🔁 **Auto-retry**: Configurable retry mechanism with exponential backoff
- ⏱️ **Dependency Tracking**: Automatic refetching when dependencies change
- 🎛️ **Manual Control**: Full control over when and how requests are made
- 🧩 **TypeScript Support**: Fully typed for better developer experience

## Basic Usage

```tsx
import { useApiRequest } from 'use-api-request';

const UserProfile = ({ userId }) => {
  const { data, loading, error, refetch } = useApiRequest(
    () => fetch(`/api/users/${userId}`).then(res => res.json()),
    {
      deps: [userId]
    }
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>{data?.name}</h1>
      <p>{data?.email}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
};
```

## Advanced Examples

### Manual Fetching

```tsx
const { data, loading, refetch } = useApiRequest(
  () => fetchUserData(userId),
  { manual: true }
);

// Later, trigger the request manually
<button onClick={refetch}>Load Data</button>
```

### With Caching

```tsx
const { data } = useApiRequest(
  () => fetchUserData(userId),
  {
    cache: true,
    cacheKey: `user-${userId}`,
    cacheTTL: 60 * 1000, // 1 minute
  }
);
```

### Automatic Retry on Failure

```tsx
const { data, loading, error } = useApiRequest(
  () => fetchDataThatMightFail(),
  {
    autoRetry: true,
    maxRetries: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  }
);
```

### Custom Success and Error Handling

```tsx
const { data } = useApiRequest(
  () => postData(formValues),
  {
    onSuccess: (response) => {
      toast.success('Data saved successfully!');
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    }
  }
);
```

### Using Initial Data

```tsx
const { data, loading } = useApiRequest(
  () => fetchUserProfile(userId),
  {
    initialData: cachedUserData,
    deps: [userId]
  }
);
```

## API Reference

### `useApiRequest(requestFn, options)`

#### Parameters

- `requestFn`: `() => Promise<TData>` - A function that returns a promise resolving to the requested data.
- `options`: `UseApiRequestOptions<TData, TError>` - Configuration options.

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `manual` | boolean | `false` | If `true`, the request won't be executed automatically. |
| `deps` | any[] | `[]` | Dependencies array that triggers re-fetching when changed. |
| `initialData` | TData \| null | `null` | Initial data to use before the first fetch. |
| `onSuccess` | (data: TData) => void | `undefined` | Callback function called when the request succeeds. |
| `onError` | (error: TError) => void | `undefined` | Callback function called when the request fails. |
| `delay` | number | `0` | Delay in milliseconds before executing the request. |
| `cache` | boolean | `false` | Whether to cache the response. |
| `cacheKey` | string | `undefined` | Unique key to store the cached data. Required if `cache` is `true`. |
| `cacheTTL` | number | `300000` | Time to live for cached data in milliseconds (5 minutes default). |
| `autoRetry` | boolean | `false` | Whether to automatically retry failed requests. |
| `maxRetries` | number | `3` | Maximum number of retry attempts. |
| `retryDelay` | (attempt: number) => number | *Exponential* | Function to calculate delay between retries. |

#### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `data` | TData \| null | The data returned from the API call. |
| `loading` | boolean | Whether the request is currently in progress. |
| `status` | 'idle' \| 'loading' \| 'success' \| 'error' | The current status of the request. |
| `error` | TError \| null | Error object if the request failed. |
| `refetch` | () => Promise<TData> | Function to manually trigger the request. |
| `setData` | (data: TData \| null) => void | Function to manually update the data. |
| `reset` | () => void | Function to reset the hook state. |
| `isFetched` | boolean | Whether the request has been executed at least once. |

## Best Practices

1. **Unique Cache Keys**: When using caching, ensure cache keys are unique and deterministic based on the request parameters.

2. **Proper Dependency Arrays**: Include all variables used in your `requestFn` in the `deps` array to avoid stale closures.

3. **Error Handling**: Always handle potential errors, either via the `error` state or using the `onError` callback.

4. **TypeScript Integration**: Leverage TypeScript to define your data and error types for better IDE support:

```tsx
interface User {
  id: number;
  name: string;
  email: string;
}

interface ApiError {
  status: number;
  message: string;
}

const { data, error } = useApiRequest<User, ApiError>(
  () => fetchUser(userId),
  { deps: [userId] }
);
```

## Comparison with Other Libraries

| Feature | useApiRequest | React Query | SWR |
|---------|---------------|-------------|-----|
| Bundle Size | Very Light | Larger | Medium |
| Cache Invalidation | Basic | Advanced | Advanced |
| DevTools | No | Yes | No |
| Server State Focus | No | Yes | Yes |
| Complex Mutations | No | Yes | No |
| Pagination | Manual | Built-in | Limited |
| Learning Curve | Low | Medium | Low |

## License

MIT
