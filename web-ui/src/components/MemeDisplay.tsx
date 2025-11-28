'use client';

import { useState } from 'react';
import type { Thought } from '@/types/emotions';

interface MemeDisplayProps {
  thought: Thought | null;
  isFullscreen?: boolean;
  onClose?: () => void;
}

export function MemeDisplay({ thought, isFullscreen, onClose }: MemeDisplayProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!thought) {
    return (
      <div className="card p-8 flex flex-col items-center justify-center min-h-[300px]">
        <div className="text-6xl mb-4">🤖</div>
        <p className="text-claude-gray-500 text-center">
          Waiting for Claude to feel something...
        </p>
        <p className="text-claude-gray-400 text-sm mt-2">
          Start a coding session to see emotions
        </p>
      </div>
    );
  }

  const { gif_url, gif_title, caption, intensity, display_mode } = thought;

  // Fire effect for this_is_fine type emotions
  const isOnFire = thought.gif_search?.toLowerCase().includes('fire') ||
                   thought.gif_search?.toLowerCase().includes('fine');

  const containerClasses = `
    gif-container relative
    ${isFullscreen ? 'max-w-4xl w-full' : 'w-full'}
    ${isOnFire ? 'fire-border' : ''}
    ${intensity >= 8 ? 'animate-pulse-slow' : ''}
  `;

  const content = (
    <div className={containerClasses}>
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-claude-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-claude-orange border-t-transparent" />
        </div>
      )}

      {imageError ? (
        <div className="flex flex-col items-center justify-center p-8 bg-claude-gray-100 min-h-[200px]">
          <div className="text-4xl mb-2">🖼️</div>
          <p className="text-claude-gray-500">GIF unavailable</p>
          <p className="text-claude-gray-400 text-sm mt-1">{thought.gif_search}</p>
        </div>
      ) : (
        <img
          src={gif_url}
          alt={gif_title || 'Emotion GIF'}
          className={`w-full h-auto ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}

      {caption && imageLoaded && (
        <div className="caption-overlay">
          {caption}
        </div>
      )}

      {isFullscreen && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fullscreen-overlay" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}>
          {content}
          {thought.internal_monologue && (
            <p className="text-white text-center mt-4 text-xl italic max-w-2xl">
              "{thought.internal_monologue}"
            </p>
          )}
        </div>
      </div>
    );
  }

  return content;
}
