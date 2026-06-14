import clsx from 'clsx';

const statusConfig = {
  sent:      { color: 'bg-status-sent',      label: 'Sent' },
  delivered: { color: 'bg-status-delivered',  label: 'Delivered' },
  opened:    { color: 'bg-status-opened',     label: 'Opened' },
  read:      { color: 'bg-status-read',       label: 'Read' },
  clicked:   { color: 'bg-status-clicked',    label: 'Clicked' },
  failed:    { color: 'bg-status-failed',     label: 'Failed' },
};

export default function DeliveryProgressBar({ stats, showLegend = true }) {
  if (!stats) return null;

  const total = parseInt(stats.total) || 0;
  if (total === 0) return null;

  const segments = ['delivered', 'opened', 'read', 'clicked', 'failed', 'sent'];
  const values = {};
  let accounted = 0;

  // Calculate values — each status represents where the message currently is
  for (const key of segments) {
    values[key] = parseInt(stats[key]) || 0;
    accounted += values[key];
  }

  // Remaining are still queued
  const queued = Math.max(0, total - accounted);

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="h-4 bg-bg-secondary rounded-full overflow-hidden flex">
        {segments.map((key) => {
          const pct = (values[key] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={key}
              className={clsx(statusConfig[key].color, 'transition-all duration-500 ease-out')}
              style={{ width: `${pct}%` }}
              title={`${statusConfig[key].label}: ${values[key]} (${pct.toFixed(1)}%)`}
            />
          );
        })}
        {queued > 0 && (
          <div
            className="bg-gray-700 transition-all duration-500 ease-out"
            style={{ width: `${(queued / total) * 100}%` }}
            title={`Queued: ${queued}`}
          />
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {segments.map((key) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={clsx('w-2.5 h-2.5 rounded-full', statusConfig[key].color)} />
              <span className="text-xs text-text-secondary">
                {statusConfig[key].label}: <span className="text-text-primary font-medium">{values[key]}</span>
              </span>
            </div>
          ))}
          {queued > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
              <span className="text-xs text-text-secondary">
                Queued: <span className="text-text-primary font-medium">{queued}</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
