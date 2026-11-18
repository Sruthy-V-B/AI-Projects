import {useEffect, useState} from 'react';
import {Check, CalendarCheck, Copy, Pencil, X} from 'lucide-react';
import {type DraftTemplateId, type JobApplication} from '../types/application.ts';
import {
  addBusinessDays,
  buildFollowUpDraft,
  DRAFT_TEMPLATE_OPTIONS,
  formatDisplayDate,
  formatRelativeUrgency,
  getTodayLocalDate,
  resolveEffectiveFollowUp,
  suggestTemplateId,
} from '../lib/followUpEngine.ts';

interface FollowUpDraftDrawerProps {
  record: JobApplication | null;
  onClose: () => void;
  onEdit: (record: JobApplication) => void;
  onMarkFollowedUp: (id: string) => void;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy execCommand fallback
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function FollowUpDraftDrawer({
  record,
  onClose,
  onEdit,
  onMarkFollowedUp,
}: FollowUpDraftDrawerProps) {
  const today = getTodayLocalDate();
  const [templateId, setTemplateId] = useState<DraftTemplateId>('post_application');
  const [includeNoteContext, setIncludeNoteContext] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copiedState, setCopiedState] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    if (!record) return;
    const suggested = suggestTemplateId(record, getTodayLocalDate());
    setTemplateId(suggested);
    setIncludeNoteContext(false);
    setCopiedState('idle');
    const draft = buildFollowUpDraft(record, suggested, {includeNoteContext: false});
    setSubject(draft.subject);
    setBody(draft.body);
  }, [record]);

  useEffect(() => {
    if (!record) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [record, onClose]);

  if (!record) return null;

  const resolved = resolveEffectiveFollowUp(record, today);
  const nextScheduledDate = addBusinessDays(today, 5);

  const handleTemplateChange = (nextTemplateId: DraftTemplateId) => {
    setTemplateId(nextTemplateId);
    const draft = buildFollowUpDraft(record, nextTemplateId, {includeNoteContext});
    setSubject(draft.subject);
    setBody(draft.body);
  };

  const handleToggleNoteContext = (checked: boolean) => {
    setIncludeNoteContext(checked);
    const draft = buildFollowUpDraft(record, templateId, {includeNoteContext: checked});
    setSubject(draft.subject);
    setBody(draft.body);
  };

  const handleCopy = async () => {
    const fullText = `Subject: ${subject}\n\n${body}`;
    const ok = await copyTextToClipboard(fullText);
    setCopiedState(ok ? 'copied' : 'error');
    window.setTimeout(() => {
      setCopiedState('idle');
    }, 2200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35"
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-drawer-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white h-full border-l border-slate-200 flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="draft-drawer-title" className="text-lg font-semibold text-slate-900 truncate">
              {record.company}
            </h2>
            <p className="text-sm text-slate-600 truncate">{record.role}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(record)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close draft drawer"
              className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-700">
              <span>
                Recruiter:{' '}
                <strong className="font-medium text-slate-900">
                  {record.recruiterName || 'Unassigned (uses team greeting)'}
                </strong>
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span>
                Stage: <strong className="font-medium text-slate-900">{record.status}</strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-mono tabular-nums">
              <span>Applied {formatDisplayDate(record.applicationDate)}</span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span>
                {resolved.effectiveDate
                  ? `Follow-up ${formatDisplayDate(resolved.effectiveDate)} (${resolved.source === 'manual' ? 'Manual' : 'Auto 5d'})`
                  : 'No follow-up date scheduled'}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                ·
              </span>
              <span
                className={
                  resolved.bucket === 'overdue'
                    ? 'text-red-600 font-medium'
                    : resolved.bucket === 'due_today'
                      ? 'text-amber-700 font-medium'
                      : 'text-slate-700'
                }
              >
                {formatRelativeUrgency(resolved)}
              </span>
            </div>

            {record.notes && (
              <p className="pt-2 border-t border-slate-200 text-xs text-slate-600 leading-relaxed">
                <strong className="font-medium text-slate-800">Notes:</strong> {record.notes}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label htmlFor="draft-template" className="text-sm font-medium text-slate-900">
                Template
              </label>
              <span className="text-xs text-slate-500">
                Offline template engine · No API key required
              </span>
            </div>
            <select
              id="draft-template"
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value as DraftTemplateId)}
              className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            >
              {DRAFT_TEMPLATE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>

            {record.notes.trim().length > 0 && (
              <label className="mt-2.5 inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeNoteContext}
                  onChange={(e) => handleToggleNoteContext(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span>Include first line of application notes in draft</span>
              </label>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="draft-subject" className="block text-sm font-medium text-slate-800">
                Subject
              </label>
              <input
                id="draft-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label htmlFor="draft-body" className="block text-sm font-medium text-slate-800">
                Message Draft
              </label>
              <textarea
                id="draft-body"
                rows={9}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg leading-relaxed focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            onClick={() => onMarkFollowedUp(record.id)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <CalendarCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span>Mark Followed Up (Next: {formatDisplayDate(nextScheduledDate)})</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            {copiedState === 'copied' ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Copied Draft</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                <span>Copy Draft</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
