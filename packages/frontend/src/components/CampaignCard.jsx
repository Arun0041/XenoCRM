import { useNavigate } from 'react-router-dom';
import { MessageSquare, Mail, Phone, Smartphone, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

const channelIcons = {
  whatsapp: MessageSquare,
  sms: Phone,
  email: Mail,
  rcs: Smartphone,
};

const channelColors = {
  whatsapp: 'text-emerald-400',
  sms: 'text-blue-400',
  email: 'text-amber-400',
  rcs: 'text-violet-400',
};

export default function CampaignCard({ campaign }) {
  const navigate = useNavigate();
  const ChannelIcon = channelIcons[campaign.channel] || MessageSquare;
  const stats = typeof campaign.stats === 'string' ? JSON.parse(campaign.stats) : campaign.stats;

  const deliveryRate = stats && stats.sent > 0
    ? ((stats.delivered / stats.sent) * 100).toFixed(0)
    : '—';

  return (
    <div
      onClick={() => navigate(`/campaigns/${campaign.id}`)}
      className="glass-card-hover p-4 cursor-pointer group animate-slide-up"
      id={`campaign-${campaign.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={clsx('w-9 h-9 rounded-lg bg-bg-secondary flex items-center justify-center', channelColors[campaign.channel])}>
            <ChannelIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-text-primary truncate">{campaign.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={clsx('status-badge', `status-${campaign.status}`)}>
                {campaign.status}
              </span>
              {campaign.segment_name && (
                <span className="text-xs text-text-muted truncate">→ {campaign.segment_name}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-text-primary">{deliveryRate}%</p>
            <p className="text-xs text-text-muted">delivery</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-text-primary">{campaign.total_recipients || 0}</p>
            <p className="text-xs text-text-muted">recipients</p>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-accent-purple transition-colors" />
        </div>
      </div>
    </div>
  );
}
