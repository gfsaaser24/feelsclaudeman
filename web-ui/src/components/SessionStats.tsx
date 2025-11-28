'use client';

import type { SessionStats as SessionStatsType } from '@/types/emotions';

interface SessionStatsProps {
  stats: SessionStatsType | null;
}

export function SessionStats({ stats }: SessionStatsProps) {
  if (!stats) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold text-claude-gray-800 mb-3">Session Stats</h3>
        <p className="text-claude-gray-400 text-sm">No data yet...</p>
      </div>
    );
  }

  const {
    totalThoughts,
    avgIntensity,
    viralMoments,
    volatility,
    dominantEmotion,
  } = stats;

  const volatilityLabel = volatility > 0.7 ? 'Chaotic' : volatility > 0.4 ? 'Dynamic' : 'Stable';
  const volatilityColor = volatility > 0.7 ? 'text-red-600' : volatility > 0.4 ? 'text-orange-600' : 'text-green-600';

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-claude-gray-800 mb-3">Session Stats</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Total Thoughts */}
        <div className="bg-claude-gray-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-claude-gray-800">{totalThoughts}</p>
          <p className="text-xs text-claude-gray-500">Emotions</p>
        </div>

        {/* Average Intensity */}
        <div className="bg-claude-gray-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-claude-gray-800">{avgIntensity.toFixed(1)}</p>
          <p className="text-xs text-claude-gray-500">Avg Intensity</p>
        </div>

        {/* Viral Moments */}
        <div className="bg-claude-gray-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-purple-600">{viralMoments}</p>
          <p className="text-xs text-claude-gray-500">Viral Moments</p>
        </div>

        {/* Volatility */}
        <div className="bg-claude-gray-50 rounded-lg p-3">
          <p className={`text-2xl font-bold ${volatilityColor}`}>
            {volatilityLabel}
          </p>
          <p className="text-xs text-claude-gray-500">Mood Stability</p>
        </div>
      </div>

      {/* Dominant Emotion */}
      {dominantEmotion && dominantEmotion !== 'neutral' && (
        <div className="mt-3 pt-3 border-t border-claude-gray-200">
          <p className="text-xs text-claude-gray-500 mb-1">Dominant Vibe</p>
          <p className="font-medium text-claude-gray-800 capitalize">
            {dominantEmotion.replace(/_/g, ' ')}
          </p>
        </div>
      )}
    </div>
  );
}
