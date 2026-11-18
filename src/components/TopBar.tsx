import {Plus} from 'lucide-react';

export type WorkspaceView = 'queue' | 'all';

interface TopBarProps {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  onAddApplication: () => void;
}

export function TopBar({activeView, onSelectView, onAddApplication}: TopBarProps) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onSelectView('queue')}
          className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded"
        >
          Recruiter Follow-Up Tracker
        </button>

        <nav aria-label="Primary" className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => onSelectView('queue')}
            className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              activeView === 'queue'
                ? 'border-blue-600 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Today&apos;s Queue
          </button>
          <button
            type="button"
            onClick={() => onSelectView('all')}
            className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              activeView === 'all'
                ? 'border-blue-600 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            All Applications
          </button>
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onAddApplication}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Application</span>
          </button>
        </div>
      </div>
    </header>
  );
}
