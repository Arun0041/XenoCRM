import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Mail, Phone, Smartphone, Clock, Users, Sparkles, Loader2, Wifi, WifiOff } from 'lucide-react';
import { fetchCampaign, fetchCampaignLogs, streamInsight } from '../services/api';
import { useSSE } from '../hooks/useSSE';
import DeliveryProgressBar from '../components/DeliveryProgressBar';
import clsx from 'clsx';

const channelIcons = { whatsapp: MessageSquare, sms: Phone, email: Mail, rcs: Smartphone };

const statCards = [
  { key: 'sent', label: 'Sent', color: 'text-gray-400', bg: 'bg-gray-500/15' },
  { key: 'delivered', label: 'Delivered', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  { key: 'opened', label: 'Opened', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  { key: 'read', label: 'Read', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  { key: 'clicked', label: 'Clicked', color: 'text-violet-400', bg: 'bg-violet-500/15' },
  { key: 'failed', label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/15' },
];

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [logs, setLogs] = useState({ logs: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const { stats: liveStats, connected } = useSSE(id);

  useEffect(() => {
    Promise.all([
      fetchCampaign(id),
      fetchCampaignLogs(id),
    ]).then(([campaignRes, logsRes]) => {
      setCampaign(campaignRes.data);
      setLogs(logsRes.data);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load campaign:', err);
      setLoading(false);
    });
  }, [id]);

  // Merge stats: prefer live SSE, fall back to stored
  const getStats = () => {
    if (liveStats) return liveStats;
    if (campaign?.live_stats) return campaign.live_stats;
    const stored = typeof campaign?.stats === 'string' ? JSON.parse(campaign.stats) : campaign?.stats;
    return stored || {};
  };

  const stats = getStats();
  const total = parseInt(stats.total) || campaign?.total_recipients || 0;

  const loadPage = async (page) => {
    try {
      const res = await fetchCampaignLogs(id, page);
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load logs page:', err);
    }
  };

  const handleGenerateInsight = async () => {
    setInsight('');
    setInsightLoading(true);

    try {
      const response = await streamInsight({
        stats: stats,
        segment_name: campaign?.segment_name || 'Unknown',
        channel: campaign?.channel || 'whatsapp',
      });

      const contentType = response.headers.get('content-type');

      if (contentType?.includes('text/event-stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  setInsight(prev => prev + data.text);
                }
              } catch (e) {}
            }
          }
        }
      } else {
        const data = await response.json();
        setInsight(data.insight || 'No insight available');
      }
    } catch (err) {
      console.error('Failed to generate insight:', err);
      setInsight('Failed to generate insight. Please try again.');
    } finally {
      setInsightLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-20 rounded-xl" />
        <div className="skeleton h-16 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return <div className="text-text-muted text-center py-12">Campaign not found</div>;
  }

  const ChannelIcon = channelIcons[campaign.channel] || MessageSquare;

  return (
    <div className="space-y-6" id="campaign-detail-page">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-text-secondary hover:text-text-primary text-sm mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold text-text-primary">{campaign.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={clsx('status-badge', `status-${campaign.status}`)}>{campaign.status}</span>
            <span className="flex items-center gap-1.5 text-xs text-text-secondary">
              <ChannelIcon className="w-3.5 h-3.5" /> {campaign.channel}
            </span>
            {campaign.segment_name && (
              <span className="text-xs text-text-muted">→ {campaign.segment_name}</span>
            )}
            {campaign.sent_at && (
              <span className="flex items-center gap-1 text-xs text-text-muted">
                <Clock className="w-3 h-3" />
                {new Date(campaign.sent_at).toLocaleString('en-IN')}
              </span>
            )}
          </div>
        </div>

        {/* SSE Connection Status */}
        <div className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
          connected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-500/15 text-gray-400'
        )}>
          {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {connected ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* Live Delivery Progress Bar */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">Delivery Progress</h2>
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Users className="w-3 h-3" /> {total} recipients
          </span>
        </div>
        <DeliveryProgressBar stats={{ ...stats, total }} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(({ key, label, color, bg }) => {
          const value = parseInt(stats[key]) || 0;
          const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
          return (
            <div key={key} className="glass-card p-4 text-center">
              <div className={clsx('w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center', bg)}>
                <span className={clsx('text-sm font-bold', color)}>{value}</span>
              </div>
              <p className="text-xs font-medium text-text-primary">{label}</p>
              <p className="text-[10px] text-text-muted">{pct}%</p>
            </div>
          );
        })}
      </div>

      {/* AI Insight Panel */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-purple-light" />
            <h2 className="text-sm font-semibold text-text-primary">AI Campaign Insight</h2>
          </div>
          <button
            onClick={handleGenerateInsight}
            disabled={insightLoading}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            {insightLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Generate Insight
          </button>
        </div>
        {insight ? (
          <div className={clsx(
            'bg-bg-secondary rounded-lg p-4 text-sm text-text-primary whitespace-pre-wrap',
            insightLoading && 'typewriter-cursor'
          )}>
            {insight}
          </div>
        ) : (
          <p className="text-sm text-text-muted">Click "Generate Insight" to get AI analysis of this campaign's performance.</p>
        )}
      </div>

      {/* Message Logs Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-bg-border">
          <h2 className="text-sm font-semibold text-text-primary">Message Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" id="message-logs-table">
            <thead>
              <tr className="border-b border-bg-border bg-bg-secondary/50">
                <th className="text-left p-3 text-text-muted font-medium">Recipient</th>
                <th className="text-left p-3 text-text-muted font-medium">Address</th>
                <th className="text-left p-3 text-text-muted font-medium">Status</th>
                <th className="text-left p-3 text-text-muted font-medium">Sent</th>
                <th className="text-left p-3 text-text-muted font-medium">Delivered</th>
              </tr>
            </thead>
            <tbody>
              {logs.logs?.map(log => (
                <tr key={log.id} className="border-b border-bg-border/50 hover:bg-bg-hover/50 transition-colors">
                  <td className="p-3 text-text-primary font-medium">{log.customer_name || '—'}</td>
                  <td className="p-3 text-text-secondary">{log.recipient_address}</td>
                  <td className="p-3">
                    <span className={clsx('status-badge', `status-${log.status}`)}>{log.status}</span>
                  </td>
                  <td className="p-3 text-text-muted">
                    {log.sent_at ? new Date(log.sent_at).toLocaleTimeString('en-IN') : '—'}
                  </td>
                  <td className="p-3 text-text-muted">
                    {log.delivered_at ? new Date(log.delivered_at).toLocaleTimeString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
              {(!logs.logs || logs.logs.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-muted">
                    No message logs yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {logs.totalPages > 1 && (
          <div className="p-3 border-t border-bg-border flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Page {logs.page} of {logs.totalPages} ({logs.total} logs)
            </p>
            <div className="flex gap-1">
              <button onClick={() => loadPage(logs.page - 1)} disabled={logs.page <= 1} className="btn-secondary text-xs px-2 py-1">
                Prev
              </button>
              <button onClick={() => loadPage(logs.page + 1)} disabled={logs.page >= logs.totalPages} className="btn-secondary text-xs px-2 py-1">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
