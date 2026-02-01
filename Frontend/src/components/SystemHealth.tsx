import { useMetrics } from '../hooks/useMetrics';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { Activity, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export function SystemHealth() {
  const { metrics } = useMetrics(true, 5000);
  const { logs } = useAuditLogs({ limit: 10, autoRefresh: true, interval: 5000 });

  const getRiskDistribution = () => {
    // Mock data - in real app, this would come from API
    return {
      low: 65,
      medium: 25,
      high: 10,
    };
  };

  const getConfidenceDistribution = () => {
    // Mock data - in real app, this would come from API
    return {
      high: 70,
      medium: 20,
      low: 10,
    };
  };

  const riskDist = getRiskDistribution();
  const confDist = getConfidenceDistribution();

  const errorCounts = (logs || []).reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Success Rate */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
          <Activity className="w-4 h-4" />
          <span>Success Rate (24h)</span>
        </h3>
        <div className="text-3xl font-bold text-green-600 mb-2">
          {metrics ? `${Math.round(metrics.successRate * 100)}%` : '—'}
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500"
            style={{ width: `${(metrics?.successRate || 0) * 100}%` }}
          />
        </div>
      </div>

      {/* Confidence Distribution */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Confidence Distribution</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">High (70%+)</span>
            <span className="font-medium">{confDist.high}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500" style={{ width: `${confDist.high}%` }} />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Medium (40-70%)</span>
            <span className="font-medium">{confDist.medium}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500" style={{ width: `${confDist.medium}%` }} />
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Low (&lt;40%)</span>
            <span className="font-medium">{confDist.low}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-red-500" style={{ width: `${confDist.low}%` }} />
          </div>
        </div>
      </div>

      {/* Risk Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Risk Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">Low Risk</span>
            </div>
            <span className="text-sm font-medium">{riskDist.low}%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm text-gray-600">Medium Risk</span>
            </div>
            <span className="text-sm font-medium">{riskDist.medium}%</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-600">High Risk</span>
            </div>
            <span className="text-sm font-medium">{riskDist.high}%</span>
          </div>
        </div>
      </div>

      {/* Error Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Error Summary</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-red-50 rounded">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-gray-700">Critical</span>
            </div>
            <span className="text-sm font-medium text-red-600">
              {errorCounts.critical || 0}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-amber-50 rounded">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-gray-700">Warning</span>
            </div>
            <span className="text-sm font-medium text-amber-600">
              {errorCounts.warn || 0}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-gray-700">Info</span>
            </div>
            <span className="text-sm font-medium text-blue-600">
              {errorCounts.info || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center">
        <span className="inline-flex items-center space-x-1 text-xs text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Auto-refresh: 5s</span>
        </span>
      </div>
    </div>
  );
}
