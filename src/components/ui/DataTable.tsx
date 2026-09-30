import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatNumber } from '../../utils/format';
import { Skeleton } from './States';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Provide to make the column sortable */
  sortValue?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Hide on medium screens to save space */
  hideOnTablet?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  pageSize?: number;
  empty?: ReactNode;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  /** Custom layout for phones. Defaults to a label/value card. */
  mobileCard?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
}

/**
 * Reusable table with sorting + pagination.
 * On phones it turns into a list of cards so nothing overflows.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  pageSize = 10,
  empty,
  initialSort,
  mobileCard,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);

  // Go back to page 1 whenever the filtered data changes
  useEffect(() => setPage(1), [rows.length]);

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key);
    if (!sort || !col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const av = get(a);
      const bv = get(b);
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));

  const alignClass = (a?: Column<T>['align']) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  if (loading) {
    return (
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="size-9 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) return <>{empty}</>;

  return (
    <div>
      {/* Desktop / tablet table */}
      <div className="scroll-thin hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-xs font-semibold tracking-wide whitespace-nowrap text-slate-500 uppercase first:pl-5 last:pr-5',
                    alignClass(c.align),
                    c.hideOnTablet && 'hidden xl:table-cell',
                  )}
                >
                  {c.sortValue ? (
                    <button
                      onClick={() => toggleSort(c.key)}
                      className={cn('inline-flex items-center gap-1 tracking-wide uppercase transition hover:text-slate-900', sort?.key === c.key && 'text-slate-900')}
                    >
                      {c.header}
                      {sort?.key === c.key ? (
                        sort.dir === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                      ) : (
                        <ChevronsUpDown className="size-3.5 opacity-50" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('transition-colors hover:bg-slate-50/80', onRowClick && 'cursor-pointer', rowClassName?.(row))}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      'px-4 py-3.5 align-middle text-slate-700 first:pl-5 last:pr-5',
                      alignClass(c.align),
                      c.hideOnTablet && 'hidden xl:table-cell',
                      c.className,
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone cards */}
      <div className="divide-y divide-slate-100 md:hidden">
        {visible.map((row) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn('px-4 py-4', onRowClick && 'cursor-pointer active:bg-slate-50', rowClassName?.(row))}
          >
            {mobileCard ? (
              mobileCard(row)
            ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {columns.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{c.header}</dt>
                    <dd className="mt-0.5 truncate text-sm text-slate-700">{c.render(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 sm:flex-row">
        {pageCount === 1 ? (
          <p className="text-xs text-slate-500">
            Showing all <span className="font-semibold text-slate-700">{formatNumber(sorted.length)}</span>
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-700">{formatNumber((current - 1) * pageSize + 1)}</span>–
            <span className="font-semibold text-slate-700">{formatNumber(Math.min(current * pageSize, sorted.length))}</span> of{' '}
            <span className="font-semibold text-slate-700">{formatNumber(sorted.length)}</span> · page {current} of {pageCount}
          </p>
        )}
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <PageButton disabled={current === 1} onClick={() => setPage(current - 1)} label="Previous page">
              <ChevronLeft className="size-4" />
            </PageButton>
            {pageNumbers(current, pageCount).map((n, i) =>
              n === -1 ? (
                <span key={`gap${i}`} className="px-1 text-xs text-slate-400">
                  …
                </span>
              ) : (
                <PageButton key={n} active={n === current} onClick={() => setPage(n)} label={`Page ${n}`}>
                  {n}
                </PageButton>
              ),
            )}
            <PageButton disabled={current === pageCount} onClick={() => setPage(current + 1)} label="Next page">
              <ChevronRight className="size-4" />
            </PageButton>
          </div>
        )}
      </div>
    </div>
  );
}

function PageButton({
  children,
  onClick,
  disabled,
  active,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition disabled:opacity-40',
        active ? 'bg-ink-900 text-white' : 'text-slate-600 hover:bg-slate-100',
      )}
    >
      {children}
    </button>
  );
}

/** [1, -1, 4, 5, 6, -1, 20]  (-1 = "…") */
function pageNumbers(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const list = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: number[] = [];
  list.forEach((p, i) => {
    if (i > 0 && p - list[i - 1]! > 1) out.push(-1);
    out.push(p);
  });
  return out;
}
