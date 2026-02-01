interface RiskBadgeProps {
  risk: number; // 0-1
  size?: 'sm' | 'md' | 'lg';
}

export function RiskBadge({ risk, size = 'md' }: RiskBadgeProps) {
  const riskPercent = Math.round(risk * 100);
  
  let color = 'green';
  let label = 'Low';
  
  if (risk > 0.66) {
    color = 'red';
    label = 'High';
  } else if (risk > 0.33) {
    color = 'amber';
    label = 'Medium';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-300',
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    red: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${colorClasses[color as keyof typeof colorClasses]}`}>
      {label} ({riskPercent}%)
    </span>
  );
}
