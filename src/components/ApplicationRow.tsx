import {CalendarCheck, Mail, Pencil} from 'lucide-react';
import {type EnrichedApplication, formatDisplayDate, formatRelativeUrgency} from '../lib/followUpEngine.ts';
import {type JobApplication} from '../types/application.ts';

interface ApplicationRowProps {
  item: EnrichedApplication;
  onOpenDraft: (record: JobApplication) => void;
  onEdit: (record: JobApplication) => void;
  onMarkFollowedUp: (id: string) => void;
}

export function ApplicationRow({
  item,
  onOpenDraft,
  onEdit,
  onMarkFollowedUp,
}: ApplicationRowProps) {
  const {application, followUp} = item;

  const urgencyTextClass =
    followUp.bucket === 'overdue'
      ? 'text-red-700 font-semibold'
      : followUp.bucket === 'due_today'
        ? 'text-amber-700 font-semibold'
        : followUp.bucket === 'upcoming'
          ? 'text-emerald-700 font-medium'
          : 'text-slate-500';

  const rowSurfaceClass =
    followUp.bucket === 'overdue'
      ? 'bg-red-50/35 hover:bg-red-50/60'
      : followUp.bucket === 'due_today'
        ? 'bg-amber-50/35 hover:bg-amber-50/60'
        : 'bg-white hover:bg-slate-50';

  return (
    <div
      className={`px-4 py-3.5 sm:px-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 transition-colors duration-150 ${rowSurfaceClass}`}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <button
            type="button"
            onClick={() => onOpenDraft(application)}
            className="text-left text-sm sm:text-base font-semibold text-slate-900 hover:text-blue-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded"
          >
            {application.company}
          </button>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span className="text-sm font-medium text-slate-700">{application.role}</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
          <span className="font-medium text-slate-800">{application.status}</span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span>
            {application.recruiterName ? (
              <>Recruiter: {application.recruiterName}</>
            ) : (
              <span className="text-slate-500">Unassigned recruiter</span>
            )}
          </span>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <span className="font-mono tabular-nums text-slate-500">
            Applied {formatDisplayDate(application.applicationDate)}
          </span>
          {application.lastFollowedUpAt && (
            <>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span className="font-mono tabular-nums text-slate-500">
                Last touch {formatDisplayDate(application.lastFollowedUpAt)}
              </span>
            </>
          )}
        </div>

        {application.notes && (
          <p className="text-xs text-slate-500 line-clamp-1">{application.notes}</p>
        )}
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-3 sm:gap-4 shrink-0">
        <div className="text-left lg:text-right min-w-[140px]">
          <div className={`text-xs font-mono tabular-nums ${urgencyTextClass}`}>
            {formatRelativeUrgency(followUp)}
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500 mt-0.5">
            {followUp.effectiveDate ? (
              <>
                {formatDisplayDate(followUp.effectiveDate)} ·{' '}
                {followUp.source === 'manual' ? 'Manual' : 'Auto 5d'}
              </>
            ) : (
              '—'
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenDraft(application)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
          >
            <Mail className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Copy Draft</span>
          </button>

          {application.status !== 'Closed' && (
            <button
              type="button"
              onClick={() => onMarkFollowedUp(application.id)}
              title="Mark followed up today and schedule +5 business days"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              <span className="hidden sm:inline">Followed Up</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(application)}
            aria-label={`Edit ${application.company}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Edit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
