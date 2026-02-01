import { useState } from 'react';
import { useDecisions } from '../hooks/useDecisions';
import { useDecisionDetail } from '../hooks/useDecisionDetail';
import { Decision } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { DecisionDetail } from '../components/DecisionDetail';
import { Search, Filter, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export function DecisionsPage() {
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    minConfidence: '',
    search: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'time' | 'confidence' | 'status' | 'type'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const itemsPerPage = 20;

  const { decisions, loading, error } = useDecisions({
    status: filters.status || undefined,
    minConfidence: filters.minConfidence ? parseFloat(filters.minConfidence) : undefined,
    limit: 100,
    autoRefresh: true,
    interval: 10000,
  });

  const { detail, loading: detailLoading } = useDecisionDetail(selectedDecisionId);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Filter and sort decisions
  const filteredDecisions = decisions
    .filter((d) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          d.id.toLowerCase().includes(searchLower) ||
          d.actionType.toLowerCase().includes(searchLower) ||
          d.hypothesis?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'time':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'type':
          comparison = a.actionType.localeCompare(b.actionType);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const totalPages = Math.ceil(filteredDecisions.length / itemsPerPage);
  const paginatedDecisions = filteredDecisions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortBy }) => {
    if (sortBy !== field) return <span className="text-gray-400">↕</span>;
    return <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Type', 'Status', 'Confidence', 'Risk', 'Created', 'Hypothesis'];
    const rows = filteredDecisions.map((d) => [
      d.id,
      d.actionType,
      d.status,
      d.confidence,
      d.anomalyScore,
      new Date(d.createdAt).toISOString(),
      d.hypothesis || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decisions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Decisions</h1>
        <button
          onClick={exportToCSV}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, type, or hypothesis..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="executed">Executed</option>
          </select>

          <select
            value={filters.minConfidence}
            onChange={(e) => setFilters({ ...filters, minConfidence: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Confidence Levels</option>
            <option value="0.7">High (70%+)</option>
            <option value="0.4">Medium (40%+)</option>
            <option value="0">Low (0%+)</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center justify-end">
            Showing {paginatedDecisions.length} of {filteredDecisions.length} decisions
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('type')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Type</span>
                    <SortIcon field="type" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Status</span>
                    <SortIcon field="status" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('confidence')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Confidence</span>
                    <SortIcon field="confidence" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Risk
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('time')}
                    className="flex items-center space-x-1 hover:text-gray-900"
                  >
                    <span>Created</span>
                    <SortIcon field="time" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Approval
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Loading decisions...
                  </td>
                </tr>
              ) : paginatedDecisions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No decisions found
                  </td>
                </tr>
              ) : (
                paginatedDecisions.map((decision) => (
                  <tr
                    key={decision.id}
                    onClick={() => setSelectedDecisionId(decision.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {decision.actionType}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          decision.status === 'executed'
                            ? 'bg-blue-100 text-blue-800'
                            : decision.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : decision.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {decision.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              decision.confidence > 0.7
                                ? 'bg-green-500'
                                : decision.confidence > 0.4
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${decision.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-gray-600">{Math.round(decision.confidence * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <RiskBadge risk={decision.anomalyScore} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{formatRelativeTime(decision.createdAt)}</div>
                      <div className="text-xs text-gray-400">{formatTimestamp(decision.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {decision.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {decision.approvalRequired ? (
                        decision.humanApprovalGiven ? (
                          <span className="text-green-600 text-xs">✓ Approved</span>
                        ) : (
                          <span className="text-amber-600 text-xs">⏳ Pending</span>
                        )
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Decision Detail Modal */}
      {selectedDecisionId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <DecisionDetail
              detail={detail}
              loading={detailLoading}
              onClose={() => setSelectedDecisionId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
