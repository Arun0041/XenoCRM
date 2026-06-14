import { useState, useEffect } from 'react';
import { Filter, Users, Plus } from 'lucide-react';
import { fetchSegments, fetchSegmentCustomers } from '../services/api';
import SegmentBuilder from '../components/SegmentBuilder';
import clsx from 'clsx';

export default function Segments() {
  const [segments, setSegments] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [segmentCustomers, setSegmentCustomers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);

  const loadSegments = () => {
    fetchSegments()
      .then(res => {
        setSegments(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load segments:', err);
        setLoading(false);
      });
  };

  useEffect(() => { loadSegments(); }, []);

  const handleSelectSegment = async (segment) => {
    setSelectedSegment(segment);
    setShowBuilder(false);
    try {
      const res = await fetchSegmentCustomers(segment.id);
      setSegmentCustomers(res.data);
    } catch (err) {
      console.error('Failed to load segment customers:', err);
    }
  };

  return (
    <div className="space-y-6" id="segments-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Segments</h1>
          <p className="text-sm text-text-secondary mt-1">Define audiences for targeted campaigns</p>
        </div>
        <button
          onClick={() => { setShowBuilder(true); setSelectedSegment(null); }}
          className="btn-primary flex items-center gap-2"
          id="new-segment-btn"
        >
          <Plus className="w-4 h-4" /> New Segment
        </button>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Segment List */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)
          ) : segments.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Filter className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-text-secondary text-sm">No segments yet</p>
              <p className="text-text-muted text-xs mt-1">Create your first audience segment</p>
            </div>
          ) : (
            segments.map(seg => (
              <button
                key={seg.id}
                onClick={() => handleSelectSegment(seg)}
                className={clsx(
                  'w-full text-left p-4 rounded-xl border transition-all duration-200',
                  selectedSegment?.id === seg.id
                    ? 'bg-accent-purple/10 border-accent-purple/30'
                    : 'glass-card-hover'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">{seg.name}</h3>
                    {seg.description && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{seg.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 bg-bg-secondary px-2.5 py-1 rounded-full">
                    <Users className="w-3 h-3 text-text-muted" />
                    <span className="text-xs font-medium text-text-primary">{seg.customer_count}</span>
                  </div>
                </div>
                {seg.ai_prompt && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-purple/10 text-accent-purple-light font-medium">AI</span>
                    <span className="text-[10px] text-text-muted truncate">{seg.ai_prompt}</span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Right: Builder or Detail */}
        <div className="lg:col-span-3">
          {showBuilder ? (
            <div className="glass-card p-5">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Create Segment</h2>
              <SegmentBuilder
                onSegmentCreated={() => {
                  setShowBuilder(false);
                  loadSegments();
                }}
              />
            </div>
          ) : selectedSegment ? (
            <div className="space-y-4 animate-fade-in">
              <div className="glass-card p-5">
                <h2 className="text-lg font-semibold text-text-primary">{selectedSegment.name}</h2>
                {selectedSegment.description && (
                  <p className="text-sm text-text-secondary mt-1">{selectedSegment.description}</p>
                )}

                <div className="mt-4 bg-bg-secondary rounded-lg p-3">
                  <p className="text-xs text-text-muted mb-1">Filters:</p>
                  <pre className="text-xs text-accent-purple-light overflow-x-auto">
                    {JSON.stringify(
                      typeof selectedSegment.filters === 'string'
                        ? JSON.parse(selectedSegment.filters)
                        : selectedSegment.filters,
                      null, 2
                    )}
                  </pre>
                </div>
              </div>

              {/* Customer preview */}
              {segmentCustomers && (
                <div className="glass-card p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">
                    Matching Customers ({segmentCustomers.count})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-bg-border">
                          <th className="text-left p-2 text-text-muted">Name</th>
                          <th className="text-left p-2 text-text-muted">City</th>
                          <th className="text-right p-2 text-text-muted">Spent</th>
                          <th className="text-left p-2 text-text-muted">Tags</th>
                        </tr>
                      </thead>
                      <tbody>
                        {segmentCustomers.customers?.slice(0, 15).map(c => (
                          <tr key={c.id} className="border-b border-bg-border/50">
                            <td className="p-2 text-text-primary">{c.name}</td>
                            <td className="p-2 text-text-secondary">{c.city}</td>
                            <td className="p-2 text-right text-text-primary">₹{parseFloat(c.total_spent).toLocaleString()}</td>
                            <td className="p-2">
                              <div className="flex flex-wrap gap-1">
                                {(c.tags || []).map(t => (
                                  <span key={t} className="px-1.5 py-0.5 rounded text-[10px] bg-accent-purple/10 text-accent-purple-light">{t}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <Filter className="w-10 h-10 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">Select a segment to view details</p>
              <p className="text-text-muted text-sm mt-1">Or create a new one with the builder</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
