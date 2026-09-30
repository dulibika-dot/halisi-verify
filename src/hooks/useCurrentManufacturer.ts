import { useAuth } from '../context/AuthContext';

/** The manufacturer id of the logged-in manufacturer user. */
export function useManufacturerId(): string {
  const { user } = useAuth();
  return user?.manufacturerId ?? 'm1';
}
