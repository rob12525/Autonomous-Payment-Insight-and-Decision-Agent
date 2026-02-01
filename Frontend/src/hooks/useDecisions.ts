import { useState, useEffect } from 'react';
import { Decision } from '../types';
import { fetchAPI } from '../lib/api';

interface UseDecisionsParams {
  status?: string;
  minConfidence?: number;
  limit?: number;
  autoRefresh?: boolean;
  interval?: number;
}

export function useDecisions(params: UseDecisionsParams = {}) {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { autoRefresh = false, interval = 5000, ...apiParams } = params;

  const fetchDecisions = async () => {
    try {
      const response = await fetchAPI<{ success: boolean; data: Decision[] }>('/api/decisions', apiParams);
      setDecisions(response.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch decisions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();

    if (autoRefresh) {
      const timer = setInterval(fetchDecisions, interval);
      return () => clearInterval(timer);
    }
  }, [JSON.stringify(apiParams), autoRefresh, interval]);

  return { decisions, loading, error, refetch: fetchDecisions };
}
