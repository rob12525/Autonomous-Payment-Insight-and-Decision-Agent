import { useState, useEffect } from 'react';
import { DecisionDetail } from '../types';
import { fetchAPI } from '../lib/api';

export function useDecisionDetail(id: string | null) {
  const [detail, setDetail] = useState<DecisionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const response = await fetchAPI<{ success: boolean; data: { decision: DecisionDetail; executions: any[]; outcomes: any[] } }>(`/api/decision/${id}`);
        setDetail(response.data?.decision || null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch decision detail');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  return { detail, loading, error };
}
