import { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { fetchAPI } from '../lib/api';

interface UseAuditLogsParams {
  level?: string;
  module?: string;
  limit?: number;
  autoRefresh?: boolean;
  interval?: number;
}

export function useAuditLogs(params: UseAuditLogsParams = {}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { autoRefresh = false, interval = 5000, ...apiParams } = params;

  const fetchLogs = async () => {
    try {
      const response = await fetchAPI<{ success: boolean; data: AuditLog[] }>('/api/audit-logs', apiParams);
      setLogs(response.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    if (autoRefresh) {
      const timer = setInterval(fetchLogs, interval);
      return () => clearInterval(timer);
    }
  }, [JSON.stringify(apiParams), autoRefresh, interval]);

  return { logs, loading, error, refetch: fetchLogs };
}
