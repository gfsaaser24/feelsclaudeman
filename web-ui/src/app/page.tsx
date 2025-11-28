'use client';

import { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { Thought } from '@/types/emotions';

// GIF Display with elegant loading state
function GifDisplay({ thought }: { thought: Thought | null }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (thought?.gif_url !== prevUrlRef.current) {
      setImageLoaded(false);
      prevUrlRef.current = thought?.gif_url || null;
    }
  }, [thought?.gif_url]);

  if (!thought?.gif_url) {
    return (
      <div className="aspect-video bg-gradient-to-br from-[#292524] to-[#1c1917] flex items-center justify-center rounded-2xl">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#E07A5F]/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#E07A5F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-[#78716C] font-medium">Waiting for vibes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-[#1c1917] flex items-center justify-center rounded-2xl overflow-hidden">
      {!imageLoaded && (
        <div className="absolute inset-0 shimmer" />
      )}
      <img
        key={thought.gif_url}
        src={thought.gif_url}
        alt={thought.gif_title || 'Emotion GIF'}
        className={`max-h-full max-w-full object-contain transition-all duration-500 ${
          imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onLoad={() => setImageLoaded(true)}
      />
      {/* Subtle vignette */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-black/20" />
    </div>
  );
}

// Context meter with Claude aesthetic
function ContextMeter({ usage }: { usage?: number }) {
  if (usage === undefined || usage === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#78716C]">
        <span className="font-mono text-xs">Context</span>
        <div className="w-24 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-[#E07A5F]/30 animate-pulse rounded-full" />
        </div>
      </div>
    );
  }

  const percentage = Math.round(usage * 100);
  const tokens = Math.round(usage * 200000);
  const AUTO_COMPACT_THRESHOLD = 160000;
  const toAutoCompact = Math.max(0, Math.round(((AUTO_COMPACT_THRESHOLD - tokens) / AUTO_COMPACT_THRESHOLD) * 100));

  const getBarColor = () => {
    if (toAutoCompact <= 5) return 'bg-[#EF4444]';
    if (toAutoCompact <= 20) return 'bg-[#F59E0B]';
    if (toAutoCompact <= 40) return 'bg-[#FBBF24]';
    return 'bg-[#10B981]';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs gap-3">
          <span className="font-mono text-[#78716C]">Context</span>
          <span className={`font-medium ${toAutoCompact <= 20 ? 'text-[#EF4444]' : 'text-[#78716C]'}`}>
            {percentage}%
          </span>
        </div>
        <div className="relative w-28 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full ${getBarColor()} transition-all duration-700 ease-out rounded-full`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
          <div className="absolute top-0 bottom-0 w-px bg-[#9CA3AF]" style={{ left: '80%' }} />
        </div>
      </div>
    </div>
  );
}

// Emotion badge with warm colors
function EmotionBadge({ emotion, intensity }: { emotion?: string; intensity: number }) {
  const config: Record<string, { bg: string; text: string; emoji: string }> = {
    excited: { bg: 'bg-amber-100', text: 'text-amber-800', emoji: '🎉' },
    success: { bg: 'bg-emerald-100', text: 'text-emerald-800', emoji: '✨' },
    frustrated: { bg: 'bg-red-100', text: 'text-red-800', emoji: '😤' },
    confused: { bg: 'bg-violet-100', text: 'text-violet-800', emoji: '🤔' },
    creative: { bg: 'bg-pink-100', text: 'text-pink-800', emoji: '💡' },
    curious: { bg: 'bg-blue-100', text: 'text-blue-800', emoji: '🔍' },
    thinking: { bg: 'bg-slate-100', text: 'text-slate-800', emoji: '🧠' },
    focused: { bg: 'bg-indigo-100', text: 'text-indigo-800', emoji: '🎯' },
    determined: { bg: 'bg-orange-100', text: 'text-orange-800', emoji: '💪' },
    relieved: { bg: 'bg-teal-100', text: 'text-teal-800', emoji: '😮‍💨' },
    proud: { bg: 'bg-yellow-100', text: 'text-yellow-800', emoji: '🏆' },
    playful: { bg: 'bg-rose-100', text: 'text-rose-800', emoji: '😏' },
  };

  const { bg, text, emoji } = config[emotion || ''] || { bg: 'bg-stone-100', text: 'text-stone-800', emoji: '🤖' };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${bg} ${text} transition-all duration-300`}>
      <span className="text-lg">{emoji}</span>
      <span className="font-semibold capitalize text-sm">{emotion || 'neutral'}</span>
      <div className="flex gap-0.5 ml-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
              i < Math.ceil(intensity / 2) ? 'bg-current' : 'bg-current/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Internal monologue with meta-commentary
function MonologueCard({ thought, showHaiku }: { thought: Thought | null; showHaiku: boolean }) {
  if (!thought) return null;

  return (
    <div className="dark-card rounded-2xl overflow-hidden">
      {/* Main thought */}
      <div className="p-5">
        <div className="relative h-20 overflow-y-auto">
          <p className="text-white/90 text-sm leading-relaxed font-light">
            {thought.internal_monologue || "Processing..."}
          </p>
        </div>

        {/* Tool info */}
        <div className="mt-3 flex items-center gap-3">
          {thought.tool_name && (
            <span className="tool-badge bg-white/10 text-white/70 px-2 py-1 rounded">
              {thought.tool_name}
            </span>
          )}
          <span className="text-white/40 text-xs">
            {thought.timestamp?.split(' ')[1] || ''}
          </span>
        </div>
      </div>

      {/* FeelsClaudeMan Meta-Commentary */}
      {showHaiku && thought.meta_commentary && (
        <div className="commentary-glow px-5 py-4 bg-[#E07A5F]/5">
          <div className="flex items-start gap-3">
            <span className="text-lg">🔥</span>
            <div className="flex-1 min-w-0">
              <p className="text-[#E07A5F] font-bold text-xs uppercase tracking-wider mb-1">
                FeelsClaudeMan
              </p>
              <p className="text-white/80 text-sm font-medium leading-snug">
                {thought.meta_commentary}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Timeline item
function TimelineItem({
  thought,
  isActive,
  isLive,
  onClick
}: {
  thought: Thought;
  isActive: boolean;
  isLive: boolean;
  onClick: () => void;
}) {
  const emotionColors: Record<string, string> = {
    excited: 'border-l-amber-400 bg-amber-50/50',
    success: 'border-l-emerald-400 bg-emerald-50/50',
    frustrated: 'border-l-red-400 bg-red-50/50',
    confused: 'border-l-violet-400 bg-violet-50/50',
    creative: 'border-l-pink-400 bg-pink-50/50',
    curious: 'border-l-blue-400 bg-blue-50/50',
    thinking: 'border-l-slate-400 bg-slate-50/50',
    focused: 'border-l-indigo-400 bg-indigo-50/50',
    determined: 'border-l-orange-400 bg-orange-50/50',
    relieved: 'border-l-teal-400 bg-teal-50/50',
    proud: 'border-l-yellow-400 bg-yellow-50/50',
    playful: 'border-l-rose-400 bg-rose-50/50',
  };

  return (
    <div
      onClick={onClick}
      className={`
        p-3 rounded-xl border-l-4 cursor-pointer transition-all duration-200 hover-lift
        ${emotionColors[thought.emotion || ''] || 'border-l-stone-300 bg-stone-50/50'}
        ${isActive ? 'ring-2 ring-[#E07A5F] ring-offset-2' : ''}
      `}
    >
      {isLive && (
        <div className="flex items-center gap-2 mb-2">
          <span className="relative flex h-2 w-2">
            <span className="live-pulse absolute inline-flex h-full w-full rounded-full bg-[#E07A5F] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E07A5F]"></span>
          </span>
          <span className="text-[10px] font-bold text-[#E07A5F] uppercase tracking-wider">Live</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold capitalize text-[#1C1917] text-sm">
          {thought.emotion || 'neutral'}
        </span>
        <span className="text-xs text-[#78716C] font-mono">
          {thought.intensity}/10
        </span>
      </div>

      {thought.internal_monologue && (
        <p className="text-xs text-[#44403C] line-clamp-2 leading-relaxed">
          {thought.internal_monologue}
        </p>
      )}

      {thought.tool_name && (
        <div className="mt-2">
          <span className="tool-badge bg-[#F5F0E8] text-[#78716C] px-1.5 py-0.5 rounded text-[10px]">
            {thought.tool_name}
          </span>
        </div>
      )}
    </div>
  );
}

// Thought stream timeline
function ThoughtStream({
  thoughts,
  onSelectThought,
  currentThoughtId,
  isLiveMode
}: {
  thoughts: Thought[];
  onSelectThought: (thought: Thought) => void;
  currentThoughtId?: number;
  isLiveMode: boolean;
}) {
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timelineRef.current && isLiveMode) {
      timelineRef.current.scrollTop = 0;
    }
  }, [thoughts.length, isLiveMode]);

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-[#1C1917]">Thought Stream</h3>
        <span className="text-xs text-[#78716C] bg-[#F5F0E8] px-2 py-1 rounded-full font-medium">
          {thoughts.length} thoughts
        </span>
      </div>

      <div
        ref={timelineRef}
        className="space-y-2 max-h-[600px] overflow-y-auto pr-1"
      >
        {thoughts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#E07A5F]/10 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <p className="text-[#78716C] text-sm">Waiting for Claude's thoughts...</p>
          </div>
        ) : (
          thoughts.map((thought, index) => (
            <TimelineItem
              key={thought.id}
              thought={thought}
              isActive={thought.id === currentThoughtId}
              isLive={index === 0 && isLiveMode}
              onClick={() => onSelectThought(thought)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Stats card
function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="glass-card rounded-xl p-4 text-center hover-lift">
      <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
      <p className="text-xs text-[#78716C] mt-1 font-medium">{label}</p>
    </div>
  );
}

// Haiku toggle button
function HaikuToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`
        px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
        flex items-center gap-2
        ${enabled
          ? 'bg-[#F4A393] text-[#7C2D12] shadow-md shadow-[#E07A5F]/20'
          : 'bg-[#78716C] text-[#D6D3D1]'
        }
      `}
      title={enabled ? 'Commentary enabled' : 'Commentary disabled'}
    >
      <span>{enabled ? '🔥' : '💤'}</span>
      <span>Commentary</span>
    </button>
  );
}

// Main Dashboard
export default function Dashboard() {
  const {
    connectionState,
    currentThought,
    thoughts,
    connect,
  } = useWebSocket();

  const [selectedThought, setSelectedThought] = useState<Thought | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [showHaiku, setShowHaiku] = useState(true);
  const prevThoughtIdRef = useRef<number | null>(null);

  // Load haiku preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('feelsclaudeman-haiku');
    if (saved !== null) {
      setShowHaiku(saved === 'true');
    }
  }, []);

  const toggleHaiku = () => {
    const newValue = !showHaiku;
    setShowHaiku(newValue);
    localStorage.setItem('feelsclaudeman-haiku', String(newValue));
  };

  useEffect(() => {
    if (currentThought && currentThought.id !== prevThoughtIdRef.current) {
      prevThoughtIdRef.current = currentThought.id;
      if (isLiveMode) {
        setSelectedThought(null);
      }
    }
  }, [currentThought, isLiveMode]);

  const displayThought = isLiveMode ? currentThought : (selectedThought || currentThought);

  const handleSelectThought = (thought: Thought) => {
    setSelectedThought(thought);
    setIsLiveMode(false);
  };

  const handleBackToLive = () => {
    setSelectedThought(null);
    setIsLiveMode(true);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-[#E07A5F]/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <h1 className="font-display text-2xl font-bold tracking-tight">
                <span className="text-[#E07A5F]">Feels</span>
                <span className="text-[#1C1917]">ClaudeMan</span>
              </h1>
              {displayThought && (
                <EmotionBadge
                  emotion={displayThought.emotion}
                  intensity={displayThought.intensity}
                />
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-6">
              <HaikuToggle enabled={showHaiku} onToggle={toggleHaiku} />
              <ContextMeter usage={displayThought?.context_usage} />

              {/* Connection status */}
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    connectionState === 'connected'
                      ? 'bg-[#10B981] status-glow text-[#10B981]'
                      : connectionState === 'connecting'
                      ? 'bg-[#F59E0B] animate-pulse'
                      : 'bg-[#EF4444]'
                  }`}
                />
                <span className="text-xs text-[#78716C] capitalize font-medium">
                  {connectionState}
                </span>
                {connectionState !== 'connected' && (
                  <button
                    onClick={connect}
                    className="text-xs text-[#E07A5F] hover:text-[#C86B52] font-semibold ml-1 transition-colors"
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-5 gap-6 items-start">
          {/* Left Column - Main Display */}
          <div className="lg:col-span-3 space-y-5 stagger-children">
            {/* GIF Display */}
            <div className="glass-card rounded-2xl overflow-hidden p-1">
              <GifDisplay thought={displayThought} />
              {/* Giphy Attribution */}
              <div className="bg-[#1c1917] px-4 py-2 flex justify-between items-center rounded-b-xl">
                <span className="text-white/40 text-xs font-mono">
                  {displayThought?.gif_search || 'vibes loading...'}
                </span>
                <img
                  src="/giphy-powered.gif"
                  alt="Powered by GIPHY"
                  className="h-6 opacity-80"
                />
              </div>
            </div>

            {/* Monologue Card */}
            <MonologueCard thought={displayThought} showHaiku={showHaiku} />

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                value={thoughts.length}
                label="Thoughts"
                color="text-[#E07A5F]"
              />
              <StatCard
                value={displayThought?.intensity || 0}
                label="Intensity"
                color="text-[#8B5CF6]"
              />
              <StatCard
                value={displayThought?.emotion || '-'}
                label="Current Vibe"
                color="text-[#10B981]"
              />
            </div>

            {/* Mode indicator */}
            {!isLiveMode && selectedThought && (
              <div className="flex items-center justify-between glass-card rounded-xl p-4 border border-[#E07A5F]/20">
                <div className="flex items-center gap-3">
                  <span className="text-[#E07A5F]">⏮</span>
                  <span className="text-sm text-[#44403C]">
                    Viewing thought from <span className="font-mono font-medium">{selectedThought.timestamp}</span>
                  </span>
                </div>
                <button
                  onClick={handleBackToLive}
                  className="coral-gradient text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Back to Live
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Timeline */}
          <div className="lg:col-span-2">
            <ThoughtStream
              thoughts={thoughts}
              onSelectThought={handleSelectThought}
              currentThoughtId={isLiveMode ? currentThought?.id : selectedThought?.id}
              isLiveMode={isLiveMode}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
