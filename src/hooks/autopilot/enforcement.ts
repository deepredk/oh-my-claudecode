/**
 * Autopilot Enforcement
 *
 * Parallel to ralph-loop enforcement - intercepts stops and continues
 * until phase completion signals are detected.
 */

import {
  readAutopilotState,
  writeAutopilotState,
  transitionPhase
} from './state.js';
import { getPhasePrompt } from './prompts.js';
import { detectSignal, getExpectedSignalForPhase } from './signals.js';
import {
  transitionRalphToUltraQA,
  transitionUltraQAToValidation,
  transitionToComplete
} from './transition.js';
import type { AutopilotState, AutopilotPhase } from './types.js';

export interface AutopilotEnforcementResult {
  /** Whether to block the stop event */
  shouldBlock: boolean;
  /** Message to inject into context */
  message: string;
  /** Current phase */
  phase: AutopilotPhase;
  /** Additional metadata */
  metadata?: {
    iteration?: number;
    maxIterations?: number;
    tasksCompleted?: number;
    tasksTotal?: number;
  };
}

/**
 * Get the next phase after current phase
 */
function getNextPhase(current: AutopilotPhase): AutopilotPhase | null {
  switch (current) {
    case 'expansion': return 'planning';
    case 'planning': return 'execution';
    case 'execution': return 'qa';
    case 'qa': return 'validation';
    case 'validation': return 'complete';
    default: return null;
  }
}

/**
 * Check autopilot state and determine if it should continue
 * This is the main enforcement function called by persistent-mode hook
 */
export async function checkAutopilot(
  sessionId?: string,
  directory?: string
): Promise<AutopilotEnforcementResult | null> {
  const workingDir = directory || process.cwd();
  const state = readAutopilotState(workingDir);

  if (!state || !state.active) {
    return null;
  }

  // Check session binding
  if (state.session_id && sessionId && state.session_id !== sessionId) {
    return null;
  }

  // Check max iterations (safety limit)
  if (state.iteration >= state.max_iterations) {
    transitionPhase(workingDir, 'failed');
    return {
      shouldBlock: false,
      message: `[AUTOPILOT STOPPED] Max iterations (${state.max_iterations}) reached. Consider reviewing progress.`,
      phase: 'failed'
    };
  }

  // Check for completion
  if (state.phase === 'complete') {
    return {
      shouldBlock: false,
      message: `[AUTOPILOT COMPLETE] All phases finished successfully!`,
      phase: 'complete'
    };
  }

  if (state.phase === 'failed') {
    return {
      shouldBlock: false,
      message: `[AUTOPILOT FAILED] Session ended in failure state.`,
      phase: 'failed'
    };
  }

  // Check for phase completion signal
  const expectedSignal = getExpectedSignalForPhase(state.phase);
  if (expectedSignal && sessionId && detectSignal(sessionId, expectedSignal)) {
    // Phase complete - transition to next phase
    const nextPhase = getNextPhase(state.phase);
    if (nextPhase) {
      // Handle special transitions
      if (state.phase === 'execution' && nextPhase === 'qa') {
        const result = transitionRalphToUltraQA(workingDir, sessionId);
        if (!result.success) {
          // Transition failed, continue in current phase
          return generateContinuationPrompt(state, workingDir);
        }
      } else if (state.phase === 'qa' && nextPhase === 'validation') {
        const result = transitionUltraQAToValidation(workingDir);
        if (!result.success) {
          return generateContinuationPrompt(state, workingDir);
        }
      } else if (nextPhase === 'complete') {
        transitionToComplete(workingDir);
        return {
          shouldBlock: false,
          message: `[AUTOPILOT COMPLETE] All phases finished successfully!`,
          phase: 'complete'
        };
      } else {
        transitionPhase(workingDir, nextPhase);
      }

      // Get new state and generate prompt for next phase
      const newState = readAutopilotState(workingDir);
      if (newState) {
        return generateContinuationPrompt(newState, workingDir);
      }
    }
  }

  // No signal detected - continue current phase
  return generateContinuationPrompt(state, workingDir);
}

/**
 * Generate continuation prompt for current phase
 */
function generateContinuationPrompt(
  state: AutopilotState,
  directory: string
): AutopilotEnforcementResult {
  // Increment iteration
  state.iteration += 1;
  writeAutopilotState(directory, state);

  const phasePrompt = getPhasePrompt(state.phase, {
    idea: state.originalIdea,
    specPath: state.expansion.spec_path || '.omc/autopilot/spec.md',
    planPath: state.planning.plan_path || '.omc/plans/autopilot-impl.md'
  });

  const continuationPrompt = `<autopilot-continuation>

[AUTOPILOT - PHASE: ${state.phase.toUpperCase()} | ITERATION ${state.iteration}/${state.max_iterations}]

Your previous response did not signal phase completion. Continue working on the current phase.

${phasePrompt}

IMPORTANT: When the phase is complete, output the appropriate signal:
- Expansion: EXPANSION_COMPLETE
- Planning: PLANNING_COMPLETE
- Execution: EXECUTION_COMPLETE
- QA: QA_COMPLETE
- Validation: AUTOPILOT_COMPLETE

</autopilot-continuation>

---

`;

  return {
    shouldBlock: true,
    message: continuationPrompt,
    phase: state.phase,
    metadata: {
      iteration: state.iteration,
      maxIterations: state.max_iterations,
      tasksCompleted: state.execution.tasks_completed,
      tasksTotal: state.execution.tasks_total
    }
  };
}
