import {useEffect, useState, type FormEvent} from 'react';
import {Trash2, X} from 'lucide-react';
import {
  APPLICATION_STATUSES,
  AUTO_SCHEDULE_STATUSES,
  type ApplicationFormValues,
  type JobApplication,
} from '../types/application.ts';
import {
  addBusinessDays,
  formatDisplayDate,
  getTodayLocalDate,
  isValidISODate,
  validateApplicationForm,
  type ValidationErrors,
} from '../lib/followUpEngine.ts';

interface ApplicationFormDrawerProps {
  isOpen: boolean;
  editingRecord: JobApplication | null;
  onClose: () => void;
  onSave: (values: ApplicationFormValues, existingId?: string) => void;
  onDelete: (id: string) => void;
}

const EMPTY_FORM = (today: string): ApplicationFormValues => ({
  company: '',
  role: '',
  applicationDate: today,
  status: 'Applied',
  recruiterName: '',
  followUpDate: '',
  notes: '',
});

export function ApplicationFormDrawer({
  isOpen,
  editingRecord,
  onClose,
  onSave,
  onDelete,
}: ApplicationFormDrawerProps) {
  const today = getTodayLocalDate();
  const [values, setValues] = useState<ApplicationFormValues>(() => EMPTY_FORM(today));
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingRecord) {
      setValues({
        company: editingRecord.company,
        role: editingRecord.role,
        applicationDate: editingRecord.applicationDate,
        status: editingRecord.status,
        recruiterName: editingRecord.recruiterName,
        followUpDate: editingRecord.followUpDate,
        notes: editingRecord.notes,
      });
    } else {
      setValues(EMPTY_FORM(getTodayLocalDate()));
    }
    setErrors({});
    setConfirmingDelete(false);
  }, [isOpen, editingRecord]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const computedAutoDate =
    !values.followUpDate.trim() &&
    AUTO_SCHEDULE_STATUSES.has(values.status) &&
    isValidISODate(values.applicationDate)
      ? addBusinessDays(values.applicationDate, 5)
      : null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const validation = validateApplicationForm(values);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    onSave(
      {
        company: values.company.trim(),
        role: values.role.trim(),
        applicationDate: values.applicationDate.trim(),
        status: values.status,
        recruiterName: values.recruiterName.trim(),
        followUpDate: values.followUpDate.trim(),
        notes: values.notes.trim(),
      },
      editingRecord?.id
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35"
      role="dialog"
      aria-modal="true"
      aria-labelledby="application-form-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white h-full border-l border-slate-200 flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <h2 id="application-form-title" className="text-lg font-semibold text-slate-900">
            {editingRecord ? 'Edit Application' : 'Add Application'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close form"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label htmlFor="field-company" className="block text-sm font-medium text-slate-800">
              Company <span className="text-red-600">*</span>
            </label>
            <input
              id="field-company"
              type="text"
              value={values.company}
              onChange={(e) => {
                setValues((prev) => ({...prev, company: e.target.value}));
                if (errors.company) setErrors((prev) => ({...prev, company: undefined}));
              }}
              placeholder="e.g. Vanguard Logistics Corp"
              className="mt-1.5 w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
            {errors.company && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.company}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="field-role" className="block text-sm font-medium text-slate-800">
              Role <span className="text-red-600">*</span>
            </label>
            <input
              id="field-role"
              type="text"
              value={values.role}
              onChange={(e) => {
                setValues((prev) => ({...prev, role: e.target.value}));
                if (errors.role) setErrors((prev) => ({...prev, role: undefined}));
              }}
              placeholder="e.g. Senior UiPath Developer"
              className="mt-1.5 w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
            {errors.role && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.role}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="field-application-date"
                className="block text-sm font-medium text-slate-800"
              >
                Application Date <span className="text-red-600">*</span>
              </label>
              <input
                id="field-application-date"
                type="date"
                value={values.applicationDate}
                onChange={(e) => {
                  setValues((prev) => ({...prev, applicationDate: e.target.value}));
                  if (errors.applicationDate) {
                    setErrors((prev) => ({...prev, applicationDate: undefined}));
                  }
                }}
                className="mt-1.5 w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              {errors.applicationDate && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {errors.applicationDate}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="field-status" className="block text-sm font-medium text-slate-800">
                Status <span className="text-red-600">*</span>
              </label>
              <select
                id="field-status"
                value={values.status}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    status: e.target.value as ApplicationFormValues['status'],
                  }))
                }
                className="mt-1.5 w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              >
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              {errors.status && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {errors.status}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-recruiter" className="block text-sm font-medium text-slate-800">
                Recruiter Name <span className="text-xs font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="field-recruiter"
                type="text"
                value={values.recruiterName}
                onChange={(e) => setValues((prev) => ({...prev, recruiterName: e.target.value}))}
                placeholder="e.g. Elena Rostova"
                className="mt-1.5 w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label
                htmlFor="field-follow-up-date"
                className="block text-sm font-medium text-slate-800"
              >
                Follow-Up Date <span className="text-xs font-normal text-slate-500">(optional)</span>
              </label>
              <div className="mt-1.5 flex items-center gap-1.5">
                <input
                  id="field-follow-up-date"
                  type="date"
                  value={values.followUpDate}
                  onChange={(e) => {
                    setValues((prev) => ({...prev, followUpDate: e.target.value}));
                    if (errors.followUpDate) {
                      setErrors((prev) => ({...prev, followUpDate: undefined}));
                    }
                  }}
                  className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
                {values.followUpDate && (
                  <button
                    type="button"
                    onClick={() => setValues((prev) => ({...prev, followUpDate: ''}))}
                    className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>
              {errors.followUpDate && (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {errors.followUpDate}
                </p>
              )}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-600">
            {values.followUpDate ? (
              <span>
                Manual follow-up date set for{' '}
                <strong className="font-mono text-slate-800">
                  {formatDisplayDate(values.followUpDate)}
                </strong>
                . Clear it to use the 5-business-day rule.
              </span>
            ) : computedAutoDate ? (
              <span>
                No manual date set. Auto-scheduled 5 business days after application:{' '}
                <strong className="font-mono text-slate-800">
                  {formatDisplayDate(computedAutoDate)}
                </strong>
                .
              </span>
            ) : (
              <span>
                Status <strong>{values.status}</strong> does not auto-schedule a follow-up. Add a
                manual date if you want this role in your queue.
              </span>
            )}
          </div>

          <div>
            <label htmlFor="field-notes" className="block text-sm font-medium text-slate-800">
              Notes <span className="text-xs font-normal text-slate-500">(optional)</span>
            </label>
            <textarea
              id="field-notes"
              rows={4}
              value={values.notes}
              onChange={(e) => setValues((prev) => ({...prev, notes: e.target.value}))}
              placeholder="RPA stack, referral details, case study status, or interview notes..."
              className="mt-1.5 w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            {editingRecord ? (
              !confirmingDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  <span>Delete</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onDelete(editingRecord.id)}
                    className="px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                </div>
              )
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                {editingRecord ? 'Save Changes' : 'Save Application'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
