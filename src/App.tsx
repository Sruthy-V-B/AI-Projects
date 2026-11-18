import {useEffect, useMemo, useState} from 'react';
import {Plus, Search, X} from 'lucide-react';
import {AllApplicationsTable} from './components/AllApplicationsTable.tsx';
import {ApplicationFormDrawer} from './components/ApplicationFormDrawer.tsx';
import {ApplicationRow} from './components/ApplicationRow.tsx';
import {BrowserStorageBanner} from './components/BrowserStorageBanner.tsx';
import {FollowUpDraftDrawer} from './components/FollowUpDraftDrawer.tsx';
import {TopBar, type WorkspaceView} from './components/TopBar.tsx';
import {type MetricFilter, UrgencySummaryStrip} from './components/UrgencySummaryStrip.tsx';
import {
  addBusinessDays,
  type EnrichedApplication,
  formatDisplayDate,
  getTodayLocalDate,
  sortByFollowUpPriority,
} from './lib/followUpEngine.ts';
import {
  clearAllBrowserRecords,
  loadApplicationsFromBrowser,
  resetToFictionalDemoData,
  saveApplicationsToBrowser,
} from './lib/storage.ts';
import {
  APPLICATION_STATUSES,
  type ApplicationFormValues,
  type ApplicationStatus,
  type JobApplication,
  type UrgencyBucket,
} from './types/application.ts';

type ScopeFilter = 'action_needed' | 'active' | 'all';

const SECTION_META: Array<{
  bucket: UrgencyBucket;
  title: string;
  subtitle: string;
}> = [
  {
    bucket: 'overdue',
    title: 'Overdue',
    subtitle: 'Past scheduled or 5-business-day follow-up date',
  },
  {
    bucket: 'due_today',
    title: 'Due Today',
    subtitle: 'Scheduled for follow-up today',
  },
  {
    bucket: 'upcoming',
    title: 'Upcoming',
    subtitle: 'Scheduled ahead',
  },
  {
    bucket: 'unscheduled',
    title: 'No Follow-Up Scheduled',
    subtitle: 'Paused or offer stages without an explicit follow-up date',
  },
  {
    bucket: 'closed',
    title: 'Closed',
    subtitle: 'Inactive applications excluded from daily nudges',
  },
];

function createRecordId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [applications, setApplications] = useState<JobApplication[]>(() => {
    return loadApplicationsFromBrowser().applications;
  });
  const [activeView, setActiveView] = useState<WorkspaceView>('queue');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'ALL'>('ALL');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [metricFilter, setMetricFilter] = useState<MetricFilter>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<JobApplication | null>(null);
  const [draftRecord, setDraftRecord] = useState<JobApplication | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const today = getTodayLocalDate();

  useEffect(() => {
    saveApplicationsToBrowser(applications);
  }, [applications]);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3000);
  };

  const prioritized = useMemo(
    () => sortByFollowUpPriority(applications, today),
    [applications, today]
  );

  const counts = useMemo(() => {
    let overdue = 0;
    let dueToday = 0;
    let upcoming = 0;
    let active = 0;
    for (const item of prioritized) {
      if (item.followUp.bucket === 'overdue') overdue += 1;
      if (item.followUp.bucket === 'due_today') dueToday += 1;
      if (item.followUp.bucket === 'upcoming') upcoming += 1;
      if (item.followUp.bucket !== 'closed') active += 1;
    }
    return {overdue, dueToday, upcoming, active};
  }, [prioritized]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return prioritized.filter(({application, followUp}) => {
      if (metricFilter === 'overdue' && followUp.bucket !== 'overdue') return false;
      if (metricFilter === 'due_today' && followUp.bucket !== 'due_today') return false;
      if (metricFilter === 'upcoming' && followUp.bucket !== 'upcoming') return false;
      if (metricFilter === 'active' && followUp.bucket === 'closed') return false;

      if (scopeFilter === 'action_needed') {
        if (followUp.bucket !== 'overdue' && followUp.bucket !== 'due_today') return false;
      } else if (scopeFilter === 'active') {
        if (followUp.bucket === 'closed') return false;
      }

      if (statusFilter !== 'ALL' && application.status !== statusFilter) {
        return false;
      }

      if (q) {
        const haystack = [
          application.company,
          application.role,
          application.recruiterName,
          application.notes,
          application.status,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [prioritized, metricFilter, scopeFilter, statusFilter, searchQuery]);

  const groupedSections = useMemo(() => {
    const byBucket = new Map<UrgencyBucket, EnrichedApplication[]>();
    for (const item of filteredItems) {
      const list = byBucket.get(item.followUp.bucket) ?? [];
      list.push(item);
      byBucket.set(item.followUp.bucket, list);
    }
    return SECTION_META.map((meta) => ({
      ...meta,
      items: byBucket.get(meta.bucket) ?? [],
    })).filter((section) => section.items.length > 0);
  }, [filteredItems]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== 'ALL' ||
    scopeFilter !== 'all' ||
    metricFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setScopeFilter('all');
    setMetricFilter('all');
  };

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (record: JobApplication) => {
    setDraftRecord(null);
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleSaveApplication = (values: ApplicationFormValues, existingId?: string) => {
    const nowIso = new Date().toISOString();
    if (existingId) {
      setApplications((prev) =>
        prev.map((item) =>
          item.id === existingId
            ? {
                ...item,
                ...values,
                updatedAt: nowIso,
              }
            : item
        )
      );
      showToast(`Updated ${values.company}`);
    } else {
      const created: JobApplication = {
        id: createRecordId(),
        ...values,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setApplications((prev) => [created, ...prev]);
      showToast(`Added ${values.company}`);
    }
    setIsFormOpen(false);
    setEditingRecord(null);
  };

  const handleDeleteApplication = (id: string) => {
    const target = applications.find((item) => item.id === id);
    setApplications((prev) => prev.filter((item) => item.id !== id));
    setIsFormOpen(false);
    setEditingRecord(null);
    if (draftRecord?.id === id) {
      setDraftRecord(null);
    }
    if (target) {
      showToast(`Deleted ${target.company}`);
    }
  };

  const handleMarkFollowedUp = (id: string) => {
    const currentToday = getTodayLocalDate();
    const nextDate = addBusinessDays(currentToday, 5);
    const nowIso = new Date().toISOString();
    const logLine = `[${currentToday}] Sent follow-up.`;

    let updatedCompany = '';
    let updatedItem: JobApplication | null = null;

    setApplications((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        updatedCompany = item.company;
        const trimmedNotes = item.notes.trim();
        const nextNotes = trimmedNotes.includes(logLine)
          ? trimmedNotes
          : trimmedNotes
            ? `${trimmedNotes}\n${logLine}`
            : logLine;

        updatedItem = {
          ...item,
          followUpDate: nextDate,
          lastFollowedUpAt: currentToday,
          notes: nextNotes,
          updatedAt: nowIso,
        };
        return updatedItem;
      })
    );

    if (draftRecord?.id === id && updatedItem) {
      setDraftRecord(updatedItem);
    }

    if (updatedCompany) {
      showToast(`${updatedCompany} marked followed up · next ${formatDisplayDate(nextDate)}`);
    }
  };

  const handleResetDemo = () => {
    const seeded = resetToFictionalDemoData();
    setApplications(seeded);
    handleClearFilters();
    setDraftRecord(null);
    showToast('Restored 7 fictional RPA demo applications');
  };

  const handleClearAll = () => {
    const cleared = clearAllBrowserRecords();
    setApplications(cleared);
    handleClearFilters();
    setDraftRecord(null);
    showToast('Cleared all records from this browser');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        onAddApplication={handleOpenAdd}
      />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 text-balance">
              {activeView === 'queue'
                ? "Today's Recruiter Follow-Up Queue"
                : 'All RPA & Automation Applications'}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {activeView === 'queue'
                ? 'Overdue and due-today follow-ups appear first. Missing follow-up dates default to 5 business days after applying.'
                : 'Complete pipeline stored in this browser. Sort any column or open a draft.'}
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500 shrink-0">
            Today: {formatDisplayDate(today)}
          </div>
        </div>

        <BrowserStorageBanner
          recordCount={applications.length}
          onResetDemo={handleResetDemo}
          onClearAll={handleClearAll}
        />

        <UrgencySummaryStrip
          overdueCount={counts.overdue}
          dueTodayCount={counts.dueToday}
          upcomingCount={counts.upcoming}
          activeCount={counts.active}
          activeMetricFilter={metricFilter}
          onSelectMetric={(filter) => {
            setMetricFilter(filter);
            if (filter !== 'all') {
              setScopeFilter('all');
            }
          }}
        />

        <section
          aria-label="Filter and search applications"
          className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
        >
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, role, recruiter, or notes..."
              aria-label="Search applications"
              className="w-full pl-9 pr-8 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div
              role="group"
              aria-label="Queue scope"
              className="inline-flex items-center p-1 bg-slate-100 rounded-lg"
            >
              {(
                [
                  {id: 'all', label: 'All Prioritized'},
                  {id: 'action_needed', label: 'Action Needed'},
                  {id: 'active', label: 'Active Only'},
                ] as const
              ).map((tab) => {
                const active = scopeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setScopeFilter(tab.id);
                      setMetricFilter('all');
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'ALL')}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Statuses</option>
              {APPLICATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-2.5 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
              >
                Clear Filters
              </button>
            )}
          </div>
        </section>

        {applications.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
            <h2 className="text-base font-semibold text-slate-900">
              No applications saved in this browser yet
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Add your first RPA or intelligent automation application, or load the 7 fictional demo
              records to explore the follow-up queue and draft templates.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>Add First Application</span>
              </button>
              <button
                type="button"
                onClick={handleResetDemo}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              >
                Load Demo Records
              </button>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
            <h2 className="text-base font-semibold text-slate-900">
              No matching applications found
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Adjust your search text, status filter, or selected urgency bucket to view records.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : activeView === 'all' ? (
          <AllApplicationsTable
            items={filteredItems}
            onOpenDraft={setDraftRecord}
            onEdit={handleOpenEdit}
            onMarkFollowedUp={handleMarkFollowedUp}
          />
        ) : (
          <div className="space-y-5">
            {groupedSections.map((section) => (
              <section key={section.bucket} className="space-y-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
                  <div className="flex items-baseline gap-2.5">
                    <h2 className="text-sm font-semibold text-slate-900">
                      {section.title}{' '}
                      <span className="font-mono tabular-nums text-slate-500">
                        ({section.items.length})
                      </span>
                    </h2>
                    <span className="text-xs text-slate-500 hidden sm:inline">
                      {section.subtitle}
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
                  {section.items.map((item) => (
                    <ApplicationRow
                      key={item.application.id}
                      item={item}
                      onOpenDraft={setDraftRecord}
                      onEdit={handleOpenEdit}
                      onMarkFollowedUp={handleMarkFollowedUp}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <ApplicationFormDrawer
        isOpen={isFormOpen}
        editingRecord={editingRecord}
        onClose={() => {
          setIsFormOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveApplication}
        onDelete={handleDeleteApplication}
      />

      <FollowUpDraftDrawer
        record={draftRecord}
        onClose={() => setDraftRecord(null)}
        onEdit={handleOpenEdit}
        onMarkFollowedUp={handleMarkFollowedUp}
      />

      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-40 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-lg shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
