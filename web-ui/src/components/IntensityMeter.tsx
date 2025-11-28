'use client';

interface IntensityMeterProps {
  intensity: number;
  showLabel?: boolean;
}

const INTENSITY_LABELS: Record<number, string> = {
  1: 'Meh',
  2: 'Meh',
  3: 'Notable',
  4: 'Notable',
  5: 'Mood',
  6: 'Mood',
  7: 'BIG Mood',
  8: 'BIG Mood',
  9: 'WITNESS ME',
  10: 'WITNESS ME',
};

const INTENSITY_COLORS: Record<number, string> = {
  1: 'bg-claude-gray-300',
  2: 'bg-claude-gray-400',
  3: 'bg-blue-400',
  4: 'bg-blue-500',
  5: 'bg-claude-orange',
  6: 'bg-claude-orange',
  7: 'bg-orange-500',
  8: 'bg-red-500',
  9: 'bg-red-600',
  10: 'bg-red-700',
};

export function IntensityMeter({ intensity, showLabel = true }: IntensityMeterProps) {
  const clampedIntensity = Math.max(1, Math.min(10, intensity));
  const percentage = clampedIntensity * 10;
  const label = INTENSITY_LABELS[clampedIntensity];
  const colorClass = INTENSITY_COLORS[clampedIntensity];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        {showLabel && (
          <span className={`text-sm font-medium ${clampedIntensity >= 7 ? 'text-red-600' : 'text-claude-gray-600'}`}>
            {label}
          </span>
        )}
        <span className="text-sm text-claude-gray-500">
          {clampedIntensity}/10
        </span>
      </div>

      <div className="h-2 bg-claude-gray-200 rounded-full overflow-hidden">
        <div
          className={`intensity-bar h-full rounded-full ${colorClass} ${clampedIntensity >= 8 ? 'animate-pulse' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
