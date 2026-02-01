interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

export function MetricCard({ label, value, trend, icon, color = 'blue' }: MetricCardProps) {
  const colorClasses = {
    blue: 'border-blue-500/20 bg-blue-500/5',
    green: 'border-green-500/20 bg-green-500/5',
    amber: 'border-amber-500/20 bg-amber-500/5',
    red: 'border-red-500/20 bg-red-500/5',
    purple: 'border-purple-500/20 bg-purple-500/5',
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {trend && (
        <div className="text-xs mt-1">
          {trend === 'up' && <span className="text-green-600">↑ Trending up</span>}
          {trend === 'down' && <span className="text-red-600">↓ Trending down</span>}
          {trend === 'neutral' && <span className="text-gray-600">→ Stable</span>}
        </div>
      )}
    </div>
  );
}
