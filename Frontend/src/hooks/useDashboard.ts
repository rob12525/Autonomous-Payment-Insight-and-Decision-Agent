import { useState, useEffect } from 'react';
import { DashboardData } from '../types';
import { fetchAPI } from '../lib/api';

export function useDashboard(autoRefresh = true, interval = 5000) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      const response = await fetchAPI<{ success: boolean; data: DashboardData }>('/api/dashboard');
      setData(response.data || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    if (autoRefresh) {
      const timer = setInterval(fetchDashboard, interval);
      return () => clearInterval(timer);
    }
  }, [autoRefresh, interval]);

  return { data, loading, error, refetch: fetchDashboard };
}
