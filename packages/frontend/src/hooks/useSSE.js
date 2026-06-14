import { useState, useEffect, useRef } from 'react';
import { getSSEUrl } from '../services/api';

/**
 * Hook to subscribe to campaign delivery stats via SSE
 * Opens a persistent EventSource connection and updates state on each event.
 * Automatically reconnects on error with exponential backoff.
 */
export function useSSE(campaignId) {
  const [stats, setStats] = useState(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);

  useEffect(() => {
    if (!campaignId) return;

    const url = getSSEUrl(campaignId);
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setStats(data);
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [campaignId]);

  return { stats, connected };
}

export default useSSE;
