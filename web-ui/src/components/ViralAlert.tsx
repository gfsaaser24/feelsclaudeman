'use client';

import { useEffect, useState } from 'react';
import type { ViralMoment } from '@/types/emotions';

interface ViralAlertProps {
  moment: ViralMoment | null;
  onDismiss: () => void;
}

export function ViralAlert({ moment, onDismiss }: ViralAlertProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (moment) {
      setVisible(true);
      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300); // Wait for fade out
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [moment, onDismiss]);

  if (!moment || !visible) {
    return null;
  }

  const handleShare = () => {
    // TODO: Implement sharing
    navigator.clipboard.writeText(`🎬 Viral Moment: ${moment.sequence_name}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in">
      <div className="relative max-w-lg w-full mx-4 animate-slide-up">
        {/* Card */}
        <div className="card bg-gradient-to-br from-purple-600 to-pink-600 text-white p-8 text-center">
          {/* Close button */}
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="text-5xl mb-4">🎬</div>
          <h2 className="text-2xl font-bold mb-2">VIRAL MOMENT!</h2>

          {/* Sequence name */}
          <p className="text-3xl font-bold mb-4 text-yellow-300">
            {moment.sequence_name}
          </p>

          {/* Virality score */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-lg">Virality Score:</span>
            <span className="text-2xl font-bold text-yellow-300">
              {moment.virality_score}/10
            </span>
            {moment.virality_score >= 9 && (
              <span className="text-2xl">🔥</span>
            )}
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="bg-white text-purple-600 font-bold px-6 py-3 rounded-full hover:bg-yellow-300 transition-colors"
          >
            📤 Share This Moment
          </button>
        </div>
      </div>
    </div>
  );
}
