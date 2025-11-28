'use client';

import { useState } from 'react';
import type { Thought } from '@/types/emotions';

interface TimelineProps {
  thoughts: Thought[];
  onSelectThought: (thought: Thought) => void;
  currentThoughtId?: number;
}

type FilterType = 'all' | 'high' | 'success' | 'failure';

export function Timeline({ thoughts, onSelectThought, currentThoughtId }: TimelineProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredThoughts = thoughts.filter((thought) => {
    switch (filter) {
      case 'high':
        return thought.intensity >= 7;
      case 'success':
        return thought.tool_success === true;
      case 'failure':
        return thought.tool_success === false;
      default:
        return true;
    }
  });

  const getIntensityEmoji = (intensity: number): string => {
    if (intensity >= 9) return '🔥';
    if (intensity >= 7) return '😤';
    if (intensity >= 5) return '🤔';
    if (intensity >= 3) return '😐';
    return '😶';
  };

  const getIntensityColor = (intensity: number): string => {
    if (intensity >= 8) return 'bg-red-100 border-red-300';
    if (intensity >= 6) return 'bg-orange-100 border-orange-300';
    if (intensity >= 4) return 'bg-blue-100 border-blue-300';
    return 'bg-gray-100 border-gray-300';
  };

  return (
    <div className="card p-4">
      {/* Header with Filter */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-claude-gray-800">Timeline</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterType)}
          className="text-sm border border-claude-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-claude-orange"
        >
          <option value="all">All</option>
          <option value="high">High Intensity</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
      </div>

      {/* Timeline Scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filteredThoughts.length === 0 ? (
          <p className="text-claude-gray-400 text-sm py-4">No emotions yet...</p>
        ) : (
          <>
            {filteredThoughts.map((thought) => (
              <button
                key={thought.id}
                onClick={() => onSelectThought(thought)}
                className={`
                  timeline-item flex-shrink-0 w-16 h-16 rounded-xl border-2
                  flex flex-col items-center justify-center gap-1
                  transition-all cursor-pointer
                  ${getIntensityColor(thought.intensity)}
                  ${currentThoughtId === thought.id ? 'ring-2 ring-claude-orange ring-offset-2' : ''}
                `}
              >
                <span className="text-xl">{getIntensityEmoji(thought.intensity)}</span>
                <span className="text-xs text-claude-gray-600">{thought.intensity}</span>
              </button>
            ))}

            {/* NOW marker */}
            <div className="flex-shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-claude-orange bg-claude-orange/10 flex items-center justify-center">
              <span className="text-xs font-bold text-claude-orange">NOW</span>
            </div>
          </>
        )}
      </div>

      {/* Count */}
      <p className="text-xs text-claude-gray-400 mt-2">
        {filteredThoughts.length} emotion{filteredThoughts.length !== 1 ? 's' : ''} recorded
      </p>
    </div>
  );
}
