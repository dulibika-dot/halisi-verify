import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

/**
 * Runs an async function (usually an api.ts call) and tracks loading / error / data.
 *
 *   const { data, loading, error, reload } = useAsync(() => api.getProducts(id), [id]);
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const callId = useRef(0);

  // Re-create the loader only when the caller's dependencies change
  const run = useCallback(fn, deps);

  const load = useCallback(
    async (silent = false) => {
      const id = ++callId.current;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const result = await run();
        if (id === callId.current) setData(result);
      } catch (e) {
        if (id === callId.current) setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        if (id === callId.current) setLoading(false);
      }
    },
    [run],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /** reload() shows skeletons again; reload(true) refreshes quietly in the background */
  return { data, loading, error, reload: load, setData };
}
