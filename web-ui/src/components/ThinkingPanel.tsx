'use client';

import type { Thought } from '@/types/emotions';

interface ThinkingPanelProps {
  thought: Thought | null;
}

export function ThinkingPanel({ thought }: ThinkingPanelProps) {
  if (!thought) {
    return null;
  }

  const { thinking_block, tool_name, tool_input, tool_result, tool_success, error_message } = thought;

  return (
    <div className="card p-4 space-y-3">
      {/* Thinking Block */}
      {thinking_block && (
        <div className="flex items-start gap-2">
          <span className="text-lg">💭</span>
          <div>
            <p className="text-xs text-claude-gray-500 font-medium uppercase tracking-wide">Thinking</p>
            <p className="text-claude-gray-700 text-sm mt-1 leading-relaxed">
              {thinking_block.length > 300
                ? `${thinking_block.substring(0, 300)}...`
                : thinking_block}
            </p>
          </div>
        </div>
      )}

      {/* Tool Action */}
      {tool_name && (
        <div className="flex items-start gap-2">
          <span className="text-lg">🔧</span>
          <div>
            <p className="text-xs text-claude-gray-500 font-medium uppercase tracking-wide">Action</p>
            <p className="text-claude-gray-700 text-sm mt-1">
              <span className="font-mono bg-claude-gray-100 px-1.5 py-0.5 rounded text-claude-orange">
                {tool_name}
              </span>
              {tool_input && (
                <span className="ml-2 text-claude-gray-600">
                  {tool_input.length > 50 ? `${tool_input.substring(0, 50)}...` : tool_input}
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Result */}
      {tool_result && (
        <div className="flex items-start gap-2">
          <span className="text-lg">{tool_success ? '✅' : '❌'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-claude-gray-500 font-medium uppercase tracking-wide">Result</p>
            <div className={`mt-1 p-2 rounded text-sm font-mono ${
              tool_success
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <pre className="whitespace-pre-wrap break-words overflow-hidden">
                {tool_result.length > 200 ? `${tool_result.substring(0, 200)}...` : tool_result}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error_message && !tool_result && (
        <div className="flex items-start gap-2">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="text-xs text-claude-gray-500 font-medium uppercase tracking-wide">Error</p>
            <p className="text-red-600 text-sm mt-1">{error_message}</p>
          </div>
        </div>
      )}

      {/* Internal Monologue */}
      {thought.internal_monologue && (
        <div className="pt-2 border-t border-claude-gray-200">
          <p className="text-claude-gray-600 italic text-sm">
            "{thought.internal_monologue}"
          </p>
        </div>
      )}
    </div>
  );
}
