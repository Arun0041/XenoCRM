import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Mail, Phone, Smartphone, Sparkles, Send, ChevronLeft, ChevronRight, Eye, Loader2 } from 'lucide-react';
import { fetchSegments, createCampaign, sendCampaign, fetchSegmentCustomers } from '../services/api';
import AIMessageComposer from '../components/AIMessageComposer';
import clsx from 'clsx';

const channels = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'emerald' },
  { value: 'sms', label: 'SMS', icon: Phone, color: 'blue' },
  { value: 'email', label: 'Email', icon: Mail, color: 'amber' },
  { value: 'rcs', label: 'RCS', icon: Smartphone, color: 'violet' },
];

export default function CampaignBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [segments, setSegments] = useState([]);
  const [form, setForm] = useState({
    name: '',
    segment_id: '',
    channel: '',
    message_template: '',
  });
  const [showAI, setShowAI] = useState(false);
  const [previewCustomer, setPreviewCustomer] = useState(null);
  const [segmentSize, setSegmentSize] = useState(0);
  const [sending, setSending] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(null);

  useEffect(() => {
    fetchSegments().then(res => setSegments(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (form.segment_id) {
      const seg = segments.find(s => s.id === form.segment_id);
      setSelectedSegment(seg);
      fetchSegmentCustomers(form.segment_id)
        .then(res => {
          setSegmentSize(res.data.count);
          if (res.data.customers?.length > 0) {
            setPreviewCustomer(res.data.customers[0]);
          }
        })
        .catch(console.error);
    }
  }, [form.segment_id]);

  const steps = [
    { label: 'Name', valid: form.name.trim().length > 0 },
    { label: 'Segment', valid: !!form.segment_id },
    { label: 'Channel', valid: !!form.channel },
    { label: 'Message', valid: form.message_template.trim().length > 0 },
    { label: 'Preview & Send', valid: true },
  ];

  const canProceed = steps[step]?.valid;

  const handleSend = async () => {
    setSending(true);
    try {
      const campaignRes = await createCampaign(form);
      const campaign = campaignRes.data;
      await sendCampaign(campaign.id);
      navigate(`/campaigns/${campaign.id}`);
    } catch (err) {
      console.error('Failed to send campaign:', err);
      setSending(false);
    }
  };

  const previewMessage = form.message_template
    .replace(/\{\{name\}\}/g, previewCustomer?.name?.split(' ')[0] || 'Priya')
    .replace(/\{\{city\}\}/g, previewCustomer?.city || 'Mumbai');

  const getAudienceContext = () => {
    if (!selectedSegment) return '';
    let context = `Segment Name: ${selectedSegment.name}\n`;
    if (selectedSegment.description) context += `Description: ${selectedSegment.description}\n`;
    const filters = typeof selectedSegment.filters === 'string' ? selectedSegment.filters : JSON.stringify(selectedSegment.filters);
    context += `Targeting Logic: ${filters}`;
    return context;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6" id="campaign-builder-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Create Campaign</h1>
        <p className="text-sm text-text-secondary mt-1">Build and send a targeted campaign to your audience</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              className={clsx(
                'w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all',
                i === step
                  ? 'bg-accent-purple text-white'
                  : i < step
                  ? 'bg-accent-purple/20 text-accent-purple-light cursor-pointer'
                  : 'bg-bg-secondary text-text-muted'
              )}
            >
              {i + 1}
            </button>
            <span className={clsx(
              'text-xs font-medium hidden sm:inline',
              i === step ? 'text-text-primary' : 'text-text-muted'
            )}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={clsx(
                'w-8 h-px',
                i < step ? 'bg-accent-purple' : 'bg-bg-border'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="glass-card p-6 animate-fade-in">
        {/* Step 0: Name */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Name Your Campaign</h2>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Weekend Flash Sale, Re-engagement Drive"
              className="input-field text-base"
              autoFocus
              id="campaign-name-input"
            />
          </div>
        )}

        {/* Step 1: Segment */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Pick Your Audience</h2>
            <div className="space-y-2">
              {segments.map(seg => (
                <button
                  key={seg.id}
                  onClick={() => setForm(f => ({ ...f, segment_id: seg.id }))}
                  className={clsx(
                    'w-full text-left p-4 rounded-xl border transition-all',
                    form.segment_id === seg.id
                      ? 'bg-accent-purple/10 border-accent-purple/30'
                      : 'bg-bg-secondary border-bg-border hover:border-bg-border'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">{seg.name}</h3>
                      <p className="text-xs text-text-muted mt-0.5">{seg.description}</p>
                    </div>
                    <span className="text-xs font-medium text-text-secondary bg-bg-card px-2 py-1 rounded-full">
                      {seg.customer_count} customers
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Channel */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Choose Channel</h2>
            <div className="grid grid-cols-2 gap-3">
              {channels.map(ch => (
                <button
                  key={ch.value}
                  onClick={() => setForm(f => ({ ...f, channel: ch.value }))}
                  className={clsx(
                    'p-4 rounded-xl border transition-all text-center',
                    form.channel === ch.value
                      ? 'bg-accent-purple/10 border-accent-purple/30'
                      : 'bg-bg-secondary border-bg-border hover:border-bg-border'
                  )}
                >
                  <ch.icon className={clsx('w-6 h-6 mx-auto mb-2', `text-${ch.color}-400`)} />
                  <span className="text-sm font-medium text-text-primary">{ch.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Message */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Compose Message</h2>
              <button
                onClick={() => setShowAI(!showAI)}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {showAI ? 'Close AI' : 'Draft with AI'}
              </button>
            </div>

            <div className={clsx('grid gap-4', showAI ? 'grid-cols-1 lg:grid-cols-2' : '')}>
              <div className="space-y-2">
                <textarea
                  value={form.message_template}
                  onChange={e => setForm(f => ({ ...f, message_template: e.target.value }))}
                  placeholder={`Write your message here...\n\nUse {{name}} for customer's first name\nUse {{city}} for customer's city`}
                  className="input-field text-sm h-48 resize-none"
                  id="message-textarea"
                />
                <p className="text-xs text-text-muted">
                  {form.message_template.length} chars • Merge tags: {'{{name}}'}, {'{{city}}'}
                </p>
              </div>

              {showAI && (
                <AIMessageComposer
                  segmentDescription={getAudienceContext()}
                  channel={form.channel}
                  onUseMessage={(msg) => {
                    setForm(f => ({ ...f, message_template: msg }));
                    setShowAI(false);
                  }}
                  onClose={() => setShowAI(false)}
                />
              )}
            </div>
          </div>
        )}

        {/* Step 4: Preview & Send */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-text-primary">Preview & Send</h2>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg-secondary rounded-lg p-3">
                <p className="text-xs text-text-muted">Campaign</p>
                <p className="text-sm font-medium text-text-primary mt-0.5">{form.name}</p>
              </div>
              <div className="bg-bg-secondary rounded-lg p-3">
                <p className="text-xs text-text-muted">Segment</p>
                <p className="text-sm font-medium text-text-primary mt-0.5">{selectedSegment?.name}</p>
              </div>
              <div className="bg-bg-secondary rounded-lg p-3">
                <p className="text-xs text-text-muted">Channel</p>
                <p className="text-sm font-medium text-text-primary mt-0.5 capitalize">{form.channel}</p>
              </div>
              <div className="bg-bg-secondary rounded-lg p-3">
                <p className="text-xs text-text-muted">Recipients</p>
                <p className="text-sm font-bold text-accent-purple-light mt-0.5">{segmentSize}</p>
              </div>
            </div>

            {/* Message Preview */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-text-muted" />
                <p className="text-xs text-text-muted">Message preview (sample customer: {previewCustomer?.name || 'Priya Sharma'})</p>
              </div>
              <div className="bg-bg-secondary rounded-lg p-4 border border-bg-border">
                <p className="text-sm text-text-primary whitespace-pre-wrap">{previewMessage}</p>
              </div>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={sending}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
              id="send-campaign-btn"
            >
              {sending ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Dispatching...</>
              ) : (
                <><Send className="w-5 h-5" /> Send Campaign Now</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="btn-secondary flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        {step < steps.length - 1 && (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canProceed}
            className="btn-primary flex items-center gap-1"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
