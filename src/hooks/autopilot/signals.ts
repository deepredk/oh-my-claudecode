/**
 * Autopilot Signal Detection
 *
 * Detects phase completion signals in the session transcript,
 * similar to how ralph-loop/index.ts detects completion promises.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { AutopilotSignal } from './types.js';

/**
 * Signal patterns - each signal can appear in transcript
 */
const SIGNAL_PATTERNS: Record<AutopilotSignal, RegExp> = {
  'EXPANSION_COMPLETE': /EXPANSION_COMPLETE/i,
  'PLANNING_COMPLETE': /PLANNING_COMPLETE/i,
  'EXECUTION_COMPLETE': /EXECUTION_COMPLETE/i,
  'QA_COMPLETE': /QA_COMPLETE/i,
  'VALIDATION_COMPLETE': /VALIDATION_COMPLETE/i,
  'AUTOPILOT_COMPLETE': /AUTOPILOT_COMPLETE/i,
  'TRANSITION_TO_QA': /TRANSITION_TO_QA/i,
  'TRANSITION_TO_VALIDATION': /TRANSITION_TO_VALIDATION/i,
};

/**
 * Detect a specific signal in the session transcript
 */
export function detectSignal(sessionId: string, signal: AutopilotSignal): boolean {
  const claudeDir = join(homedir(), '.claude');
  const possiblePaths = [
    join(claudeDir, 'sessions', sessionId, 'transcript.md'),
    join(claudeDir, 'sessions', sessionId, 'messages.json'),
    join(claudeDir, 'transcripts', `${sessionId}.md`)
  ];

  const pattern = SIGNAL_PATTERNS[signal];
  if (!pattern) return false;

  for (const transcriptPath of possiblePaths) {
    if (existsSync(transcriptPath)) {
      try {
        const content = readFileSync(transcriptPath, 'utf-8');
        if (pattern.test(content)) {
          return true;
        }
      } catch {
        continue;
      }
    }
  }
  return false;
}

/**
 * Get the expected signal for the current phase
 */
export function getExpectedSignalForPhase(phase: string): AutopilotSignal | null {
  switch (phase) {
    case 'expansion': return 'EXPANSION_COMPLETE';
    case 'planning': return 'PLANNING_COMPLETE';
    case 'execution': return 'EXECUTION_COMPLETE';
    case 'qa': return 'QA_COMPLETE';
    case 'validation': return 'VALIDATION_COMPLETE';
    default: return null;
  }
}

/**
 * Detect any autopilot signal in transcript (for phase advancement)
 */
export function detectAnySignal(sessionId: string): AutopilotSignal | null {
  for (const signal of Object.keys(SIGNAL_PATTERNS) as AutopilotSignal[]) {
    if (detectSignal(sessionId, signal)) {
      return signal;
    }
  }
  return null;
}
