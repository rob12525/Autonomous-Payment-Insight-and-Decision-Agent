import { useState, useEffect } from 'react';
import { Metrics } from '../types';
import { fetchAPI } from '../lib/api';

export function useMetrics(autoRefresh = false, interval = 5000) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const response = await fetchAPI<{ success: boolean; data: Metrics }>('/api/metrics');
      setMetrics(response.data || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const timer = setInterval(fetchMetrics, interval);
      return () => clearInterval(timer);
    }
  }, [autoRefresh, interval]);

  return { metrics, loading, error, refetch: fetchMetrics };
}
