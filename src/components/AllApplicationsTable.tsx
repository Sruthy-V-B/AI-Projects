import {useMemo, useState} from 'react';
import {ArrowDown, ArrowUp, ArrowUpDown, CalendarCheck, Mail, Pencil} from 'lucide-react';
import {
  type EnrichedApplication,
  formatDisplayDate,
  formatRelativeUrgency,
} from '../lib/followUpEngine.ts';
import {type JobApplication} from '../types/application.ts';

type SortField = 'priority' | 'company' | 'applicationDate' | 'status' | 'followUpDate';
type SortDirection = 'asc' | 'desc';

interface AllApplicationsTableProps {
  items: EnrichedApplication[];
  onOpenDraft: (record: JobApplication) => void;
  onEdit: (record: JobApplication) => void;
  onMarkFollowedUp: (id: string) => void;
}

export function AllApplicationsTable({
  items,
  onOpenDraft,
  onEdit,
  onMarkFollowedUp,
}: AllApplicationsTableProps) {
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedItems = useMemo(() => {
    if (sortField === 'priority') {
      return sortDirection === 'asc' ? items : [...items].reverse();
    }

    return [...items].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'company') {
        cmp = a.application.company.localeCompare(b.application.company, undefined, {
          sensitivity: 'base',
        });
      } else if (sortField === 'applicationDate') {
        cmp = a.application.applicationDate.localeCompare(b.application.applicationDate);
      } else if (sortField === 'status') {
        cmp = a.application.status.localeCompare(b.application.status);
      } else if (sortField === 'followUpDate') {
        const dA = a.followUp.effectiveDate ?? '9999-12-31';
        const dB = b.followUp.effectiveDate ?? '9999-12-31';
        cmp = dA.localeCompare(dB);
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [items, sortField, sortDirection]);

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => handleToggleSort('company')}
                  className="inline-flex items-center gap-1 hover:text-slate-900"
                >
                  <span>Company &amp; Role</span>
                  {renderSortIcon('company')}
                </button>
              </th>
              <th className="py-3 px-4">Recruiter</th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => handleToggleSort('status')}
                  className="inline-flex items-center gap-1 hover:text-slate-900"
                >
                  <span>Status</span>
                  {renderSortIcon('status')}
                </button>
              </th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => handleToggleSort('applicationDate')}
                  className="inline-flex items-center gap-1 hover:text-slate-900"
                >
                  <span>Applied</span>
                  {renderSortIcon('applicationDate')}
                </button>
              </th>
              <th className="py-3 px-4">
                <button
                  type="button"
                  onClick={() => handleToggleSort('followUpDate')}
                  className="inline-flex items-center gap-1 hover:text-slate-900"
                >
                  <span>Follow-Up</span>
                  {renderSortIcon('followUpDate')}
                </button>
              </th>
              <th className="py-3 px-4 text-right">
                <button
                  type="button"
                  onClick={() => handleToggleSort('priority')}
                  className="inline-flex items-center gap-1 hover:text-slate-900"
                >
                  <span>Urgency</span>
                  {renderSortIcon('priority')}
                </button>
              </th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {sortedItems.map(({application, followUp}) => {
              const urgencyClass =
                followUp.bucket === 'overdue'
                  ? 'text-red-700 font-semibold'
                  : followUp.bucket === 'due_today'
                    ? 'text-amber-700 font-semibold'
                    : followUp.bucket === 'upcoming'
                      ? 'text-emerald-700 font-medium'
                      : 'text-slate-500';

              return (
                <tr key={application.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 align-top">
                    <button
                      type="button"
                      onClick={() => onOpenDraft(application)}
                      className="text-left font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                    >
                      {application.company}
                    </button>
                    <div className="text-xs text-slate-600 mt-0.5">{application.role}</div>
                  </td>
                  <td className="py-3 px-4 align-top text-xs text-slate-700">
                    {application.recruiterName || (
                      <span className="text-slate-400">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3 px-4 align-top text-xs font-medium text-slate-800 whitespace-nowrap">
                    {application.status}
                  </td>
                  <td className="py-3 px-4 align-top text-xs font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    {formatDisplayDate(application.applicationDate)}
                  </td>
                  <td className="py-3 px-4 align-top text-xs font-mono tabular-nums text-slate-600 whitespace-nowrap">
                    {followUp.effectiveDate ? (
                      <>
                        {formatDisplayDate(followUp.effectiveDate)}{' '}
                        <span className="text-slate-400">
                          ({followUp.source === 'manual' ? 'Manual' : 'Auto'})
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td
                    className={`py-3 px-4 align-top text-right text-xs font-mono tabular-nums whitespace-nowrap ${urgencyClass}`}
                  >
                    {formatRelativeUrgency(followUp)}
                  </td>
                  <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onOpenDraft(application)}
                        title="Open follow-up draft"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Draft</span>
                      </button>
                      {application.status !== 'Closed' && (
                        <button
                          type="button"
                          onClick={() => onMarkFollowedUp(application.id)}
                          title="Mark followed up today"
                          className="p-1.5 text-slate-600 hover:text-emerald-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                          aria-label={`Mark ${application.company} followed up today`}
                        >
                          <CalendarCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onEdit(application)}
                        title="Edit application"
                        className="p-1.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                        aria-label={`Edit ${application.company}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
