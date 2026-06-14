import { useState, useEffect } from 'react';
import { Users, Filter, Megaphone, TrendingUp } from 'lucide-react';
import { fetchCustomerStats, fetchRecentCampaigns, fetchSegments } from '../services/api';
import StatCard from '../components/StatCard';
import CampaignCard from '../components/CampaignCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const [customerStats, setCustomerStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCustomerStats(),
      fetchRecentCampaigns(5),
      fetchSegments(),
    ]).then(([statsRes, campaignsRes, segmentsRes]) => {
      setCustomerStats(statsRes.data);
      setCampaigns(campaignsRes.data);
      setSegments(segmentsRes.data);
      setLoading(false);
    }).catch(err => {
      console.error('Dashboard load error:', err);
      setLoading(false);
    });
  }, []);

  // Build chart data from campaigns
  const chartData = campaigns
    .filter(c => c.status === 'completed' || c.status === 'partially_failed')
    .slice(0, 5)
    .reverse()
    .map(c => {
      const stats = typeof c.stats === 'string' ? JSON.parse(c.stats) : c.stats;
      return {
        name: c.name.length > 20 ? c.name.slice(0, 20) + '...' : c.name,
        delivered: stats?.delivered || 0,
        failed: stats?.failed || 0,
        opened: stats?.opened || 0,
        clicked: stats?.clicked || 0,
      };
    });

  const avgDeliveryRate = campaigns.length > 0
    ? campaigns.reduce((sum, c) => {
        const s = typeof c.stats === 'string' ? JSON.parse(c.stats) : c.stats;
        if (!s || !s.sent) return sum;
        return sum + (s.delivered / s.sent) * 100;
      }, 0) / Math.max(campaigns.filter(c => {
        const s = typeof c.stats === 'string' ? JSON.parse(c.stats) : c.stats;
        return s && s.sent > 0;
      }).length, 1)
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-xl" />)}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="dashboard-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary mt-1">BrewCo CRM overview — customer engagement at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Customers"
          value={parseInt(customerStats?.total_customers || 0).toLocaleString()}
          subValue={`${customerStats?.active_last_30_days || 0} active in 30d`}
          color="purple"
        />
        <StatCard
          icon={Filter}
          label="Active Segments"
          value={segments.length}
          subValue="audience groups"
          color="blue"
        />
        <StatCard
          icon={Megaphone}
          label="Campaigns Sent"
          value={campaigns.filter(c => c.status !== 'draft').length}
          subValue={`${campaigns.length} total`}
          color="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg. Delivery Rate"
          value={`${avgDeliveryRate.toFixed(1)}%`}
          subValue="across campaigns"
          color="amber"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Campaigns */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">Recent Campaigns</h2>
          {campaigns.length > 0 ? (
            <div className="space-y-2">
              {campaigns.map(campaign => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : (
            <div className="glass-card p-8 text-center">
              <Megaphone className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-text-secondary text-sm">No campaigns yet</p>
              <p className="text-text-muted text-xs mt-1">Create your first campaign to get started</p>
            </div>
          )}
        </div>

        {/* Delivery Performance Chart */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Delivery Performance</h2>
          <div className="glass-card p-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} barGap={4}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    axisLine={{ stroke: '#2A2A3A' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#16161F',
                      border: '1px solid #2A2A3A',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#F1F5F9' }}
                  />
                  <Bar dataKey="delivered" name="Delivered" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="opened" name="Opened" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clicked" name="Clicked" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" name="Failed" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center">
                <p className="text-text-muted text-sm">No campaign data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
