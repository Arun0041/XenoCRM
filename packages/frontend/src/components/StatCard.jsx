import clsx from 'clsx';

export default function StatCard({ icon: Icon, label, value, subValue, trend, color = 'purple' }) {
  const colorMap = {
    purple: 'from-accent-purple/20 to-accent-purple/5 text-accent-purple-light',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-400',
    emerald: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-500/5 text-amber-400',
  };

  const iconBgMap = {
    purple: 'bg-accent-purple/15 text-accent-purple-light',
    blue: 'bg-blue-500/15 text-blue-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
    amber: 'bg-amber-500/15 text-amber-400',
  };

  return (
    <div className="glass-card-hover p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', iconBgMap[color])}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        {trend && (
          <span className={clsx(
            'text-xs font-medium px-2 py-0.5 rounded-full',
            trend > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        <p className="text-sm text-text-secondary mt-1">{label}</p>
        {subValue && <p className="text-xs text-text-muted mt-1">{subValue}</p>}
      </div>
    </div>
  );
}
