import { DecisionDetail as DecisionDetailType } from '../types';
import { RiskBadge } from './RiskBadge';
import { ConfidenceBar } from './ConfidenceBar';
import { X, Copy, ExternalLink, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface DecisionDetailProps {
  detail: DecisionDetailType | null;
  loading: boolean;
  onClose: () => void;
}

export function DecisionDetail({ detail, loading, onClose }: DecisionDetailProps) {
  const [copied, setCopied] = useState(false);

  if (!detail && !loading) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const { decision, executions, outcomes } = detail;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <h2 className="text-xl font-bold">Decision Details</h2>
              <button
                onClick={() => copyToClipboard(decision.id)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Copy ID"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="font-mono text-sm text-blue-100">{decision.id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-blue-200 mb-1">Action Type</div>
            <div className="font-medium">{decision.actionType}</div>
          </div>
          <div>
            <div className="text-blue-200 mb-1">Status</div>
            <div className="font-medium capitalize">{decision.status}</div>
          </div>
          <div>
            <div className="text-blue-200 mb-1">Created</div>
            <div className="font-medium">{formatTimestamp(decision.createdAt)}</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Confidence & Risk */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <ConfidenceBar confidence={decision.confidence} />
          </div>
          <div className="flex items-center justify-end">
            <RiskBadge risk={decision.anomalyScore} size="lg" />
          </div>
        </div>

        {/* Hypothesis */}
        {decision.hypothesis && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Hypothesis</h3>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
              {decision.hypothesis}
            </p>
          </div>
        )}

        {/* Patterns */}
        {decision.patterns && decision.patterns.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Detected Patterns</h3>
            <div className="space-y-2">
              {decision.patterns.map((pattern, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm text-gray-900">{pattern.name}</div>
                    <div className="text-xs text-gray-600">{String(pattern.value)}</div>
                  </div>
                  {pattern.confidence !== undefined && (
                    <div className="text-sm text-gray-600">
                      {Math.round(pattern.confidence * 100)}% confidence
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approval Status */}
        {decision.approvalRequired && (
          <div className={`p-4 rounded-lg border ${
            decision.humanApprovalGiven
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <div className="flex items-center space-x-2">
              {decision.humanApprovalGiven ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-900">Approved</div>
                    <div className="text-sm text-green-700">
                      By {decision.approvedBy || 'System'} on {formatTimestamp(decision.approvedAt || decision.updatedAt)}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <div>
                    <div className="font-medium text-amber-900">Pending Approval</div>
                    <div className="text-sm text-amber-700">Human approval required</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Executions */}
        {executions && executions.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Executions</h3>
            <div className="space-y-2">
              {executions.map((execution) => (
                <div key={execution.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {execution.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                      {execution.status === 'failed' && <XCircle className="w-4 h-4 text-red-600" />}
                      {execution.status === 'pending' && <Clock className="w-4 h-4 text-amber-600" />}
                      <span className="text-sm font-medium capitalize">{execution.status}</span>
                    </div>
                    <span className="text-xs text-gray-500">{execution.duration}ms</span>
                  </div>
                  <p className="text-sm text-gray-700">{execution.outcome}</p>
                  <div className="mt-2">
                    <RiskBadge risk={execution.risk} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outcomes */}
        {outcomes && outcomes.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Outcomes</h3>
            <div className="space-y-2">
              {outcomes.map((outcome) => (
                <div key={outcome.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Predicted</div>
                      <div className="text-sm font-medium">{outcome.predicted}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Actual</div>
                      <div className="text-sm font-medium">{outcome.actual}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Accuracy: {Math.round(outcome.accuracy * 100)}%
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(outcome.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
