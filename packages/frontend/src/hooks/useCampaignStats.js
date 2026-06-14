import { useState, useEffect } from 'react';
import { fetchCampaign } from '../services/api';
import { useSSE } from './useSSE';

/**
 * Hook that merges initial campaign stats with live SSE updates.
 * Falls back to campaign.stats JSONB if message_logs haven't been created yet.
 */
export function useCampaignStats(campaignId) {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const { stats: liveStats, connected } = useSSE(campaignId);

  useEffect(() => {
    if (!campaignId) return;

    fetchCampaign(campaignId)
      .then(res => {
        setCampaign(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch campaign:', err);
        setLoading(false);
      });
  }, [campaignId]);

  // Merge: prefer live SSE stats, fall back to stored campaign stats
  const stats = liveStats || campaign?.live_stats || campaign?.stats || {
    sent: 0, delivered: 0, failed: 0, opened: 0, read: 0, clicked: 0, total: 0,
  };

  return { campaign, stats, loading, connected };
}

export default useCampaignStats;
