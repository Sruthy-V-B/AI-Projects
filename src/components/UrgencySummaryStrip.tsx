export type MetricFilter = 'all' | 'overdue' | 'due_today' | 'upcoming' | 'active';

interface UrgencySummaryStripProps {
  overdueCount: number;
  dueTodayCount: number;
  upcomingCount: number;
  activeCount: number;
  activeMetricFilter: MetricFilter;
  onSelectMetric: (filter: MetricFilter) => void;
}

export function UrgencySummaryStrip({
  overdueCount,
  dueTodayCount,
  upcomingCount,
  activeCount,
  activeMetricFilter,
  onSelectMetric,
}: UrgencySummaryStripProps) {
  const cards: Array<{
    id: MetricFilter;
    label: string;
    count: number;
    helper: string;
    countColor: string;
  }> = [
    {
      id: 'overdue',
      label: 'Overdue',
      count: overdueCount,
      helper: 'Follow up immediately',
      countColor: overdueCount > 0 ? 'text-red-600' : 'text-slate-900',
    },
    {
      id: 'due_today',
      label: 'Due Today',
      count: dueTodayCount,
      helper: 'Scheduled for today',
      countColor: dueTodayCount > 0 ? 'text-amber-600' : 'text-slate-900',
    },
    {
      id: 'upcoming',
      label: 'Upcoming',
      count: upcomingCount,
      helper: 'Scheduled ahead',
      countColor: 'text-emerald-700',
    },
    {
      id: 'active',
      label: 'Active Pipeline',
      count: activeCount,
      helper: 'Excluding closed roles',
      countColor: 'text-slate-900',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const isSelected = activeMetricFilter === card.id;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectMetric(isSelected ? 'all' : card.id)}
            aria-pressed={isSelected}
            className={`text-left bg-white rounded-xl p-4 border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              isSelected
                ? 'border-blue-600 ring-1 ring-blue-600'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-xs font-medium text-slate-500">{card.label}</div>
            <div
              className={`mt-1.5 text-2xl font-semibold font-mono tabular-nums tracking-tight ${card.countColor}`}
            >
              {card.count}
            </div>
            <div className="mt-1 text-xs text-slate-500">{card.helper}</div>
          </button>
        );
      })}
    </div>
  );
}
