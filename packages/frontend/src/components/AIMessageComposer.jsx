import { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { streamDraftMessage } from '../services/api';
import clsx from 'clsx';

export default function AIMessageComposer({ segmentDescription, channel, onUseMessage, onClose }) {
  const [tone, setTone] = useState('friendly');
  const [message, setMessage] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const messageRef = useRef(null);

  const tones = [
    { value: 'friendly', label: '😊 Friendly', desc: 'Warm and conversational' },
    { value: 'urgent', label: '🔥 Urgent', desc: 'Time-sensitive, FOMO' },
    { value: 'promotional', label: '🎉 Promotional', desc: 'Offers and deals' },
  ];

  const handleGenerate = async () => {
    setMessage('');
    setStreaming(true);
    setDone(false);

    try {
      const response = await streamDraftMessage({
        segment_description: segmentDescription,
        channel,
        brand_name: 'BrewCo',
        tone,
      });

      // Check if response is SSE (streaming) or JSON (fallback)
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('text/event-stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done: readerDone, value } = await reader.read();
          if (readerDone) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  setMessage(prev => prev + data.text);
                }
                if (data.done) {
                  setDone(true);
                }
              } catch (e) {
                // Skip malformed events
              }
            }
          }
        }
      } else {
        // Fallback — non-streaming JSON response
        const data = await response.json();
        setMessage(data.message || '');
        setDone(true);
      }
    } catch (err) {
      console.error('Draft generation failed:', err);
      setMessage('Failed to generate message. Please try again.');
    } finally {
      setStreaming(false);
      setDone(true);
    }
  };

  // Auto-scroll during streaming
  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollTop = messageRef.current.scrollHeight;
    }
  }, [message]);

  return (
    <div className="glass-card p-5 space-y-4 animate-slide-in-right">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-purple-light" />
          <h3 className="text-sm font-semibold text-text-primary">AI Message Composer</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-bg-hover rounded-md transition-colors">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        )}
      </div>

      {/* Tone selector */}
      <div>
        <label className="text-xs text-text-muted mb-2 block">Message Tone</label>
        <div className="grid grid-cols-3 gap-2">
          {tones.map(t => (
            <button
              key={t.value}
              onClick={() => setTone(t.value)}
              className={clsx(
                'p-2.5 rounded-lg text-xs font-medium transition-all text-center border',
                tone === t.value
                  ? 'bg-accent-purple/15 border-accent-purple/30 text-accent-purple-light'
                  : 'bg-bg-secondary border-bg-border text-text-secondary hover:border-bg-border'
              )}
            >
              <div>{t.label}</div>
              <div className="text-[10px] text-text-muted mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={streaming}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {streaming ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Generate Message</>
        )}
      </button>

      {/* Streaming output */}
      {message && (
        <div className="animate-fade-in">
          <div
            ref={messageRef}
            className={clsx(
              'bg-bg-secondary rounded-lg p-4 text-sm text-text-primary min-h-[80px] max-h-[200px] overflow-y-auto whitespace-pre-wrap',
              streaming && 'typewriter-cursor'
            )}
          >
            {message}
          </div>

          {done && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onUseMessage?.(message)}
                className="btn-primary text-sm flex items-center gap-1.5 flex-1"
              >
                <Check className="w-3.5 h-3.5" /> Use This
              </button>
              <button
                onClick={handleGenerate}
                className="btn-secondary text-sm"
              >
                Regenerate
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
