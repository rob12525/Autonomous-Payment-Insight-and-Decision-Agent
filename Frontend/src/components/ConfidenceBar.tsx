interface ConfidenceBarProps {
  confidence: number; // 0-1
  showLabel?: boolean;
}

export function ConfidenceBar({ confidence, showLabel = true }: ConfidenceBarProps) {
  const percent = Math.round(confidence * 100);
  
  let color = 'bg-red-500';
  if (confidence > 0.7) {
    color = 'bg-green-500';
  } else if (confidence > 0.4) {
    color = 'bg-amber-500';
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Confidence</span>
          <span className="font-medium">{percent}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
