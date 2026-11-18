import {useState} from 'react';
import {HardDrive, RotateCcw, Trash2} from 'lucide-react';

interface BrowserStorageBannerProps {
  recordCount: number;
  onResetDemo: () => void;
  onClearAll: () => void;
}

export function BrowserStorageBanner({
  recordCount,
  onResetDemo,
  onClearAll,
}: BrowserStorageBannerProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);

  return (
    <section
      aria-label="Browser storage information"
      className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 sm:px-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
    >
      <div className="flex items-start gap-3">
        <HardDrive className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-sm text-slate-700 leading-relaxed">
          <strong className="font-semibold text-slate-900">Stored in this browser only:</strong>{' '}
          All application records are saved locally in your browser&apos;s{' '}
          <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
            localStorage
          </code>
          . Clearing site data or switching browsers will remove them. Drafts use built-in
          templates with no email integration or API key required, and the preloaded companies are
          fictional demo records.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 pl-7 lg:pl-0">
        <button
          type="button"
          onClick={() => {
            setConfirmingClear(false);
            onResetDemo();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset Demo Data</span>
        </button>

        {recordCount > 0 && !confirmingClear && (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Clear All</span>
          </button>
        )}

        {confirmingClear && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onClearAll();
                setConfirmingClear(false);
              }}
              className="px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              Confirm Clear ({recordCount})
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
