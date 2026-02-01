import { useState } from 'react';
import { useAuditLogs } from '../hooks/useAuditLogs';
import { AuditLogEntry } from '../components/AuditLogEntry';
import { Download, Filter, RefreshCw } from 'lucide-react';

export function AuditPage() {
  const [filters, setFilters] = useState({
    level: '',
    module: '',
  });

  const { logs, loading, error, refetch } = useAuditLogs({
    level: filters.level || undefined,
    module: filters.module || undefined,
    limit: 100,
    autoRefresh: true,
    interval: 10000,
  });

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Level', 'Module', 'ID', 'Message'];
    const rows = logs.map((log) => [
      new Date(log.timestamp).toISOString(),
      log.level,
      log.module,
      log.id,
      log.message,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get unique modules for filter
  const uniqueModules = Array.from(new Set(logs.map((log) => log.module))).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-600 mt-1">
            System activity and compliance tracking
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => refetch()}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <select
            value={filters.level}
            onChange={(e) => setFilters({ ...filters, level: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Levels</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
            <option value="critical">Critical</option>
          </select>

          <select
            value={filters.module}
            onChange={(e) => setFilters({ ...filters, module: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Modules</option>
            {uniqueModules.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </select>

          <div className="col-span-2 text-sm text-gray-600 flex items-center justify-end">
            Showing {logs.length} log entries
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {['info', 'warn', 'error', 'critical'].map((level) => {
          const count = logs.filter((log) => log.level === level).length;
          const colors = {
            info: 'bg-blue-50 border-blue-200 text-blue-900',
            warn: 'bg-amber-50 border-amber-200 text-amber-900',
            error: 'bg-red-50 border-red-200 text-red-900',
            critical: 'bg-purple-50 border-purple-200 text-purple-900',
          };
          return (
            <div
              key={level}
              className={`border rounded-lg p-4 ${colors[level as keyof typeof colors]}`}
            >
              <div className="text-sm uppercase mb-1 opacity-75">{level}</div>
              <div className="text-2xl font-bold">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Logs Timeline */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="text-gray-500">Loading audit logs...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="font-medium text-red-900 mb-2">Error Loading Logs</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <div className="text-gray-500">No audit logs found</div>
          </div>
        ) : (
          logs.map((log) => <AuditLogEntry key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}
