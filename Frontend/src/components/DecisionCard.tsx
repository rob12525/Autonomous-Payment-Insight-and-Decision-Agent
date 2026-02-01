import { Decision } from '../types';
import { RiskBadge } from './RiskBadge';
import { ConfidenceBar } from './ConfidenceBar';
import { Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface DecisionCardProps {
  decision: Decision;
  onClick?: () => void;
  showActions?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export function DecisionCard({ decision, onClick, showActions, onApprove, onReject }: DecisionCardProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const statusIcon = {
    pending: <Clock className="w-4 h-4 text-amber-500" />,
    approved: <CheckCircle className="w-4 h-4 text-green-500" />,
    rejected: <XCircle className="w-4 h-4 text-red-500" />,
    executed: <CheckCircle className="w-4 h-4 text-blue-500" />,
  };

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            {statusIcon[decision.status]}
            <span className="font-mono text-xs text-gray-500">{decision.id.slice(0, 8)}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">{formatTime(decision.createdAt)}</span>
          </div>
          <h3 className="font-medium text-gray-900">{decision.actionType}</h3>
        </div>
        <RiskBadge risk={decision.anomalyScore} size="sm" />
      </div>

      <div className="mb-3">
        <ConfidenceBar confidence={decision.confidence} />
      </div>

      {decision.hypothesis && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{decision.hypothesis}</p>
      )}

      {decision.patterns && decision.patterns.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {decision.patterns.slice(0, 3).map((pattern, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-700"
            >
              {pattern.name}
            </span>
          ))}
          {decision.patterns.length > 3 && (
            <span className="text-xs text-gray-500">+{decision.patterns.length - 3} more</span>
          )}
        </div>
      )}

      {decision.approvalRequired && !decision.humanApprovalGiven && showActions && (
        <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove?.(decision.id);
            }}
            className="flex-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReject?.(decision.id);
            }}
            className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
          >
            Reject
          </button>
        </div>
      )}

      {decision.humanApprovalGiven && (
        <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm text-gray-600">
            Approved by {decision.approvedBy || 'System'}
          </span>
        </div>
      )}
    </div>
  );
}
