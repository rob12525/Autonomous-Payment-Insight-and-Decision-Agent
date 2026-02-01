import { useState } from 'react';
import { useDashboard } from '../hooks/useDashboard';
import { useDecisionDetail } from '../hooks/useDecisionDetail';
import { DecisionCard } from '../components/DecisionCard';
import { DecisionDetail } from '../components/DecisionDetail';
import { SystemHealth } from '../components/SystemHealth';
import { postAPI } from '../lib/api';
import { RefreshCw, Filter } from 'lucide-react';

export function Dashboard() {
  const { data, loading, error, refetch } = useDashboard(true, 5000);
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const { detail, loading: detailLoading } = useDecisionDetail(selectedDecisionId);
  const [sortBy, setSortBy] = useState<'newest' | 'risk' | 'confidence'>('newest');

  const handleApprove = async (id: string) => {
    try {
      await postAPI(`/api/decision/${id}/approve`, { approvedBy: 'Current User' });
      refetch();
    } catch (err) {
      console.error('Failed to approve decision:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await postAPI(`/api/decision/${id}/reject`, { rejectedBy: 'Current User' });
      refetch();
    } catch (err) {
      console.error('Failed to reject decision:', err);
    }
  };

  const sortDecisions = (decisions: typeof data.recentDecisions) => {
    if (!decisions) return [];
    
    const sorted = [...decisions];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => b.createdAt - a.createdAt);
      case 'risk':
        return sorted.sort((a, b) => b.anomalyScore - a.anomalyScore);
      case 'confidence':
        return sorted.sort((a, b) => a.confidence - b.confidence);
      default:
        return sorted;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="col-span-4">
          <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
        </div>
        <div className="col-span-3">
          <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="font-medium text-red-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Column - Decision Timeline */}
      <div className="col-span-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Decision Timeline</h2>
          <div className="flex items-center space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="risk">Highest Risk</option>
              <option value="confidence">Lowest Confidence</option>
            </select>
            <button
              onClick={() => refetch()}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Pending Approvals */}
        {data.pendingDecisions && data.pendingDecisions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Pending Approvals ({data.pendingDecisions.length})
            </h3>
            <div className="space-y-3">
              {data.pendingDecisions.map((decision) => (
                <DecisionCard
                  key={decision.id}
                  decision={decision}
                  onClick={() => setSelectedDecisionId(decision.id)}
                  showActions
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent Decisions */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Decisions</h3>
          <div className="space-y-3">
            {sortDecisions(data.recentDecisions).map((decision) => (
              <DecisionCard
                key={decision.id}
                decision={decision}
                onClick={() => setSelectedDecisionId(decision.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Center Column - Decision Details */}
      <div className="col-span-4">
        {selectedDecisionId ? (
          <DecisionDetail
            detail={detail}
            loading={detailLoading}
            onClose={() => setSelectedDecisionId(null)}
          />
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Filter className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="font-medium text-gray-900 mb-2">No Decision Selected</h3>
            <p className="text-sm text-gray-600">
              Click on a decision card to view detailed information
            </p>
          </div>
        )}
      </div>

      {/* Right Column - System Health */}
      <div className="col-span-3">
        <h2 className="text-lg font-bold text-gray-900 mb-4">System Health</h2>
        <SystemHealth />
      </div>
    </div>
  );
}
