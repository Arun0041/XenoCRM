import { useState } from 'react';
import { Sparkles, Search, Loader2, Save } from 'lucide-react';
import { resolveAISegment, previewSegment, createSegment } from '../services/api';
import clsx from 'clsx';

export default function SegmentBuilder({ onSegmentCreated }) {
  const [mode, setMode] = useState('rules'); // 'rules' | 'ai'
  const [filters, setFilters] = useState({ city: '', min_spent: '', max_spent: '', days_since_last_order: '', min_orders: '', tags: [] });
  const [aiPrompt, setAiPrompt] = useState('');
  const [previewResult, setPreviewResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [resolvedFilters, setResolvedFilters] = useState(null);

  const tagOptions = ['loyalist', 'weekend-buyer', 'new', 'app-user', 'churned', 'high-value', 'was-loyalist'];

  const toggleTag = (tag) => {
    setFilters(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const cleanFilters = {};
      if (filters.city) cleanFilters.city = filters.city;
      if (filters.min_spent) cleanFilters.min_spent = parseFloat(filters.min_spent);
      if (filters.max_spent) cleanFilters.max_spent = parseFloat(filters.max_spent);
      if (filters.days_since_last_order) cleanFilters.days_since_last_order = parseInt(filters.days_since_last_order);
      if (filters.min_orders) cleanFilters.min_orders = parseInt(filters.min_orders);
      if (filters.tags.length) cleanFilters.tags = filters.tags;

      const res = await previewSegment(cleanFilters);
      setPreviewResult(res.data);
      setResolvedFilters(cleanFilters);
    } catch (err) {
      console.error('Preview failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAIResolve = async () => {
    if (!aiPrompt.trim()) return;
    setLoading(true);
    try {
      const res = await resolveAISegment(aiPrompt);
      setPreviewResult(res.data);
      setResolvedFilters(res.data.filters);
    } catch (err) {
      console.error('AI resolve failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!saveName.trim() || !resolvedFilters) return;
    setLoading(true);
    try {
      await createSegment({
        name: saveName,
        description: saveDesc,
        filters: resolvedFilters,
        ai_prompt: mode === 'ai' ? aiPrompt : null,
      });
      setShowSave(false);
      setSaveName('');
      setSaveDesc('');
      setPreviewResult(null);
      onSegmentCreated?.();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-1 bg-bg-secondary p-1 rounded-lg">
        <button
          onClick={() => setMode('rules')}
          className={clsx(
            'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all',
            mode === 'rules' ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'
          )}
        >
          Rule Builder
        </button>
        <button
          onClick={() => setMode('ai')}
          className={clsx(
            'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5',
            mode === 'ai' ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'
          )}
        >
          <Sparkles className="w-3.5 h-3.5" /> AI Mode
        </button>
      </div>

      {/* Rule Builder */}
      {mode === 'rules' && (
        <div className="space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1 block">City</label>
              <select
                value={filters.city}
                onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                className="select-field text-sm"
              >
                <option value="">Any City</option>
                {['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Min Orders</label>
              <input
                type="number"
                value={filters.min_orders}
                onChange={e => setFilters(f => ({ ...f, min_orders: e.target.value }))}
                placeholder="e.g. 5"
                className="input-field text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Min Spent (₹)</label>
              <input
                type="number"
                value={filters.min_spent}
                onChange={e => setFilters(f => ({ ...f, min_spent: e.target.value }))}
                placeholder="e.g. 5000"
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Max Spent (₹)</label>
              <input
                type="number"
                value={filters.max_spent}
                onChange={e => setFilters(f => ({ ...f, max_spent: e.target.value }))}
                placeholder="e.g. 15000"
                className="input-field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Days Since Last Order</label>
            <input
              type="number"
              value={filters.days_since_last_order}
              onChange={e => setFilters(f => ({ ...f, days_since_last_order: e.target.value }))}
              placeholder="e.g. 30"
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={clsx(
                    'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                    filters.tags.includes(tag)
                      ? 'bg-accent-purple text-white'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary border border-bg-border'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handlePreview} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Preview Audience
          </button>
        </div>
      )}

      {/* AI Mode */}
      {mode === 'ai' && (
        <div className="space-y-3 animate-fade-in">
          <textarea
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            placeholder="e.g. Find high-value customers in Mumbai who haven't ordered in 30 days"
            className="input-field text-sm h-24 resize-none"
          />
          <button onClick={handleAIResolve} disabled={loading || !aiPrompt.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Segment
          </button>

          {/* Show resolved filters */}
          {resolvedFilters && (
            <div className="bg-bg-secondary rounded-lg p-3 border border-bg-border">
              <p className="text-xs text-text-muted mb-1.5">Resolved Filters:</p>
              <pre className="text-xs text-accent-purple-light overflow-x-auto">
                {JSON.stringify(resolvedFilters, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Preview Results */}
      {previewResult && (
        <div className="animate-slide-up space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-text-primary">
              <span className="text-accent-purple-light font-bold">{previewResult.count}</span> customers match
            </p>
            <button
              onClick={() => setShowSave(true)}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save Segment
            </button>
          </div>

          {/* Sample customers */}
          <div className="bg-bg-secondary rounded-lg border border-bg-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-bg-border">
                  <th className="text-left p-2.5 text-text-muted font-medium">Name</th>
                  <th className="text-left p-2.5 text-text-muted font-medium">City</th>
                  <th className="text-right p-2.5 text-text-muted font-medium">Spent</th>
                </tr>
              </thead>
              <tbody>
                {previewResult.customers?.slice(0, 8).map((c) => (
                  <tr key={c.id} className="border-b border-bg-border/50 last:border-0">
                    <td className="p-2.5 text-text-primary">{c.name}</td>
                    <td className="p-2.5 text-text-secondary">{c.city}</td>
                    <td className="p-2.5 text-text-primary text-right">₹{parseFloat(c.total_spent).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Save dialog */}
          {showSave && (
            <div className="bg-bg-card rounded-lg p-4 border border-accent-purple/20 space-y-3 animate-fade-in">
              <input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="Segment name"
                className="input-field text-sm"
                autoFocus
              />
              <input
                value={saveDesc}
                onChange={e => setSaveDesc(e.target.value)}
                placeholder="Description (optional)"
                className="input-field text-sm"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={!saveName.trim() || loading} className="btn-primary text-sm flex-1">
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setShowSave(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
