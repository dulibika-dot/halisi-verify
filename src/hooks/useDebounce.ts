import { useEffect, useState } from 'react';

/** Delays updating a value until the user stops typing (used by search boxes). */
export function useDebounce<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
