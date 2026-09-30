import { useEffect, useState, type ReactNode } from 'react';
import { MapPin, MessageSquare, Phone } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import * as api from '../../services/api';
import type { CounterfeitReport, ReportStatus } from '../../types';
import { cn } from '../../utils/cn';
import { formatCode, formatDateTime } from '../../utils/format';
import { Button, Modal, StatusBadge, Textarea } from '../ui';

const STATUSES: Array<{ value: ReportStatus; label: string; help: string }> = [
  { value: 'pending', label: 'Pending', help: 'Not reviewed yet' },
  { value: 'investigating', label: 'Investigating', help: 'Team is checking' },
  { value: 'confirmed', label: 'Confirmed', help: 'Counterfeit confirmed' },
  { value: 'resolved', label: 'Resolved', help: 'Case closed' },
];

interface Props {
  report: CounterfeitReport | null;
  onClose: () => void;
  /** Admins can change the status; manufacturers only view */
  editable?: boolean;
  onUpdated?: () => void;
}

export function ReportDetailsModal({ report, onClose, editable, onUpdated }: Props) {
  const toast = useToast();
  const [status, setStatus] = useState<ReportStatus>('pending');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (report) {
      setStatus(report.status);
      setNote('');
    }
  }, [report]);

  if (!report) return null;
  const changed = status !== report.status || note.trim().length > 0;

  const save = async () => {
    setSaving(true);
    try {
      await api.updateReportStatus(report.id, status, note);
      toast.success('Report updated', `${report.reference} is now "${STATUSES.find((s) => s.value === status)?.label}".`);
      onUpdated?.();
      onClose();
    } catch (e) {
      toast.error('Update failed', e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={
        <span className="flex flex-wrap items-center gap-2">
          Report {report.reference} <StatusBadge status={report.status} />
        </span>
      }
      description={`Received ${formatDateTime(report.createdAt)} via SMS`}
      footer={
        editable ? (
          <>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving} disabled={!changed}>
              Save changes
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
          <Item label="Product" value={report.productName} />
          <Item label="Verification code" value={<span className="font-mono">{formatCode(report.code)}</span>} />
          <Item label="Reason" value={report.reason} />
          <Item label="Location" value={<span className="inline-flex items-center gap-1"><MapPin className="size-3.5 text-slate-400" />{report.location}</span>} />
          <Item label="Reporter" value={<span className="inline-flex items-center gap-1"><Phone className="size-3.5 text-slate-400" />{report.reporterPhone}</span>} />
          <Item label="Reference" value={report.reference} />
        </dl>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            <MessageSquare className="size-3.5" /> Customer message
          </p>
          <blockquote className="rounded-xl border-l-4 border-brand-400 bg-brand-50/50 px-4 py-3 text-sm text-slate-700">
            “{report.description}”
          </blockquote>
        </div>

        {report.notes.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Case notes</p>
            <ol className="space-y-2 border-l-2 border-slate-100 pl-4">
              {report.notes.map((n, i) => (
                <li key={i} className="relative text-sm text-slate-600">
                  <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-slate-300" />
                  {n}
                </li>
              ))}
            </ol>
          </div>
        )}

        {editable && (
          <div className="space-y-4 border-t border-slate-100 pt-5">
            <p className="text-sm font-semibold text-slate-900">Update status</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition',
                    status === s.value ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-500/10' : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <span className="block text-sm font-semibold text-slate-900">{s.label}</span>
                  <span className="block text-xs text-slate-500">{s.help}</span>
                </button>
              ))}
            </div>
            <Textarea label="Add a note (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Sample collected from the shop for lab testing." />
          </div>
        )}
      </div>
    </Modal>
  );
}

function Item({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-slate-900">{value}</dd>
    </div>
  );
}
