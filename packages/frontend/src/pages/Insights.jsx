import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Target, Sparkles, Loader2 } from 'lucide-react';
import { fetchCampaigns, streamInsight } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import clsx from 'clsx';

const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#6B7280'];

export default function Insights() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    fetchCampaigns()
      .then(res => {
        setCampaigns(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load campaigns:', err);
        setLoading(false);
      });
  }, []);

  const completedCampaigns = campaigns.filter(c => c.status === 'completed' || c.status === 'partially_failed');

  // Channel breakdown data
  const channelData = ['whatsapp', 'sms', 'email', 'rcs'].map(channel => {
    const channelCampaigns = completedCampaigns.filter(c => c.channel === channel);
    const totalSent = channelCampaigns.reduce((sum, c) => {
      const s = typeof c.stats === 'string' ? JSON.parse(c.stats) : c.stats;
      return sum + (s?.sent || 0);
    }, 0);
    const totalDelivered = channelCampaigns.reduce((sum, c) => {
      const s = typeof c.stats === 'string' ? JSON.parse(c.stats) : c.stats;
      return sum + (s?.delivered || 0);
    }, 0);
    return {
      channel: channel.charAt(0).toUpperCase() + channel.slice(1),
      campaigns: channelCampaigns.length,
      sent: totalSent,
      delivered: totalDelivered,
      rate: totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : 0,
    };
  }).filter(d => d.campaigns > 0);

  // Overall funnel data for pie chart
  const overallStats = completedCampaigns.reduce((acc, c) => {
    const s = typeof c.stats === 'string' ? JSON.parse(c.stats) : c.stats;
    if (s) {
      acc.delivered += (s.delivered || 0);
      acc.opened += (s.opened || 0);
      acc.read += (s.read || 0);
      acc.clicked += (s.clicked || 0);
      acc.failed += (s.failed || 0);
    }
    return acc;
  }, { delivered: 0, opened: 0, read: 0, clicked: 0, failed: 0 });

  const pieData = [
    { name: 'Delivered', value: overallStats.delivered },
    { name: 'Opened', value: overallStats.opened },
    { name: 'Read', value: overallStats.read },
    { name: 'Clicked', value: overallStats.clicked },
    { name: 'Failed', value: overallStats.failed },
  ].filter(d => d.value > 0);

  // Per-campaign comparison
  const comparisonData = completedCampaigns.slice(0, 6).map(c => {
    const s = typeof c.stats === 'string' ? JSON.parse(c.stats) : c.stats;
    return {
      name: c.name.length > 15 ? c.name.slice(0, 15) + '...' : c.name,
      delivered: s?.delivered || 0,
      opened: s?.opened || 0,
      clicked: s?.clicked || 0,
      failed: s?.failed || 0,
    };
  });

  const handleInsight = async (campaign) => {
    setSelectedCampaign(campaign);
    setInsight('');
    setInsightLoading(true);

    const s = typeof campaign.stats === 'string' ? JSON.parse(campaign.stats) : campaign.stats;

    try {
      const response = await streamInsight({
        stats: s,
        segment_name: campaign.segment_name || 'Unknown',
        channel: campaign.channel,
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
                if (data.text) setInsight(prev => prev + data.text);
              } catch (e) {}
            }
          }
        }
      } else {
        const data = await response.json();
        setInsight(data.insight || '');
      }
    } catch (err) {
      setInsight('Failed to generate insight.');
    } finally {
      setInsightLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-12 rounded-xl w-64" />
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-80 rounded-xl" />
          <div className="skeleton h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="insights-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Insights</h1>
        <p className="text-sm text-text-secondary mt-1">Campaign performance analytics and AI-powered recommendations</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-accent-purple-light" />
            <span className="text-xs text-text-muted">Total Campaigns</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{completedCampaigns.length}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-text-muted">Total Delivered</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{overallStats.delivered}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-text-muted">Overall Click Rate</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {overallStats.delivered > 0
              ? ((overallStats.clicked / overallStats.delivered) * 100).toFixed(1)
              : '0.0'}%
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Comparison Bar Chart */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Campaign Comparison</h2>
          {comparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparisonData}>
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={{ stroke: '#2A2A3A' }} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#16161F', border: '1px solid #2A2A3A', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#F1F5F9' }}
                />
                <Bar dataKey="delivered" name="Delivered" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="opened" name="Opened" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                <Bar dataKey="clicked" name="Clicked" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-text-muted text-sm">
              No completed campaigns yet
            </div>
          )}
        </div>

        {/* Engagement Funnel Pie Chart */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Engagement Funnel</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#16161F', border: '1px solid #2A2A3A', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-text-muted text-sm">
              No data yet
            </div>
          )}
        </div>
      </div>

      {/* AI Insights per campaign */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-accent-purple-light" />
          <h2 className="text-sm font-semibold text-text-primary">AI Campaign Analysis</h2>
        </div>

        {completedCampaigns.length > 0 ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {completedCampaigns.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleInsight(c)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                    selectedCampaign?.id === c.id
                      ? 'bg-accent-purple/15 border-accent-purple/30 text-accent-purple-light'
                      : 'bg-bg-secondary border-bg-border text-text-secondary hover:text-text-primary'
                  )}
                >
                  {c.name.length > 25 ? c.name.slice(0, 25) + '...' : c.name}
                </button>
              ))}
            </div>

            {insight && (
              <div className={clsx(
                'bg-bg-secondary rounded-lg p-4 text-sm text-text-primary whitespace-pre-wrap animate-fade-in',
                insightLoading && 'typewriter-cursor'
              )}>
                {insight}
              </div>
            )}

            {!insight && !insightLoading && (
              <p className="text-sm text-text-muted">Select a campaign above to generate AI insights.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-muted">Complete some campaigns to see AI-powered analysis.</p>
        )}
      </div>
    </div>
  );
}
