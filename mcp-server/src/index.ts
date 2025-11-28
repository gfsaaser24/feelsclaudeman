/**
 * FeelsClaudeMan MCP Server - Entry Point
 *
 * Turn Claude's inner monologue into a meme-worthy reality show.
 */

import { FeelsClaudeManServer } from './server.js';

const server = new FeelsClaudeManServer();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[FeelsClaudeMan] Shutting down...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[FeelsClaudeMan] Shutting down...');
  server.stop();
  process.exit(0);
});

// Start the server
server.start().catch((error) => {
  console.error('[FeelsClaudeMan] Failed to start:', error);
  process.exit(1);
});
