import { Ban, Clock } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import * as api from '../../services/api';

/**
 * Tells a manufacturer when their company is not active yet (pending approval)
 * or has been suspended. Creating batches is blocked by the database until approved.
 */
export function AccountStatusBanner({ manufacturerId, pathname }: { manufacturerId: string; pathname: string }) {
  // re-check when the user moves between pages, so approval shows up without logging out
  const { data } = useAsync(() => api.getManufacturer(manufacturerId), [manufacturerId, pathname]);
  if (!data || data.status === 'active') return null;

  const pending = data.status === 'pending';
  return (
    <div
      role="status"
      className={
        pending
          ? 'mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900'
          : 'mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-900'
      }
    >
      {pending ? <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" /> : <Ban className="mt-0.5 size-5 shrink-0 text-rose-600" />}
      <div>
        <p className="font-semibold">{pending ? 'Waiting for approval' : 'Account suspended'}</p>
        <p className="mt-0.5 opacity-90">
          {pending
            ? `${data.name} is registered and being reviewed by the administrator. You can look around, but creating product batches and verification codes unlocks once your company is approved.`
            : `${data.name} has been suspended by the administrator. You cannot create new batches. Existing codes keep working. Contact the administrator for help.`}
        </p>
      </div>
    </div>
  );
}
