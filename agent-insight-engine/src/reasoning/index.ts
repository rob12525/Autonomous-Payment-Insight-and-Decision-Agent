/**
 * Module 2: Agent Reasoning & Decision Engine
 * Main Orchestration
 * 
 * Single entry point that coordinates all reasoning components.
 * Pure functions, no side effects, no execution.
 */

// Re-export all types
export * from './types.ts';
export * from './config.ts';

// Re-export all types
export type { LLMHypothesisResponse, HypothesisPromptContext } from './hypothesisGenerator.ts';

// Re-export component functions
export { detectAnomalies, detectSuccessRateDrop, detectLatencySpike, detectRetryAmplification } from './anomalyDetector.ts';
export { recognizePatterns, detectIssuerDegradation, detectRetryStorm, detectLatencySpikePattern, detectNoise } from './patternRecognizer.ts';
export { generateHypotheses, generateFallbackHypothesis } from './hypothesisGenerator.ts';
export { planActions } from './actionPlanner.ts';
export { makeDecision } from './decisionEngine.ts';

import type {
  MetricsSnapshot,
  ActionOutcome,
  ReasoningResult,
  Hypothesis,
  Decision,
} from './types.ts';
import type { ReasoningConfig } from './config.ts';
import { resolveThresholds, createDefaultConfig } from './config.ts';
import { detectAnomalies } from './anomalyDetector.ts';
import { recognizePatterns } from './patternRecognizer.ts';
import { generateHypotheses, generateFallbackHypothesis, type LLMHypothesisResponse } from './hypothesisGenerator.ts';
import { planActions } from './actionPlanner.ts';
import { makeDecision } from './decisionEngine.ts';

export interface ReasoningEngineInput {
  currentMetrics: MetricsSnapshot;
  baselineMetrics: MetricsSnapshot;
  pastOutcomes: ActionOutcome[];
  config?: ReasoningConfig;
  llmResponses?: Array<{
    primaryHypothesis: string;
    confidence: number;
    reasoningChain: Array<{ observation: string; inference: string }>;
    alternativeExplanations: Array<{ hypothesis: string; whyLessLikely: string; confidence: number }>;
    source: 'llm' | 'fallback';
  }>;
}

export const reason = async (input: ReasoningEngineInput): Promise<ReasoningResult> => {
  const startTime = Date.now();
  
  const {
    currentMetrics,
    baselineMetrics,
    pastOutcomes,
    config = createDefaultConfig(),
    llmResponses,
  } = input;
  
  // 1. Resolve thresholds
  const thresholds = resolveThresholds(config.thresholds, baselineMetrics);
  
  // 2. Detect anomalies
  const anomalies = detectAnomalies(currentMetrics, baselineMetrics, thresholds);
  
  // 3. Recognize patterns
  const patterns = recognizePatterns(currentMetrics, baselineMetrics, anomalies);
  
  // 4. Generate hypotheses via LLM
  let hypotheses: Hypothesis[] = [];
  
  try {
    const context = {
      currentMetrics,
      baselineMetrics,
      anomalies,
      patterns,
      recentOutcomes: pastOutcomes.slice(-10),
    };

    let finalResponses: LLMHypothesisResponse[] = [];

    if (llmResponses && llmResponses.length > 0) {
      console.log('[REASONING] Using pre-computed LLM responses (test mode)');
      finalResponses = [...llmResponses];

      // If we have 3 patterns but only 1 response, we need to fill the array 
      // so generateHypotheses doesn't crash on index lookup
      while (finalResponses.length < patterns.length) {
        // We reuse the first response as a base or allow fallback to kick in
        // by pushing undefined if we wanted to trigger fallback
        finalResponses.push(finalResponses[0]); 
      }
    } else {
      console.log('[REASONING] Calling LLM to generate hypotheses...');
      const { callGemini } = await import('../llm/geminiClient.ts');
      
      // Build prompt directly
      const fullPrompt = `Analyze these payment system patterns and generate hypotheses:
Patterns: ${patterns.map(p => p.type).join(', ')}
Current success rate: ${(currentMetrics.successRate * 100).toFixed(1)}%
Baseline success rate: ${(baselineMetrics.successRate * 100).toFixed(1)}%

Generate JSON response with primaryHypothesis, confidence, reasoningChain, and alternativeExplanations.`;
      
      const response = await callGemini(fullPrompt);

      if (response.source === 'llm') {
        // IMPORTANT: Gemini returns one giant analysis. 
        // We map this one response to ALL patterns so the generator has data for each.
        finalResponses = patterns.map(() => response);
      } else {
        throw new Error('LLM returned a fallback instead of a real analysis.');
      }
    }

    // Pass the correctly sized array to the generator
    hypotheses = generateHypotheses(context, finalResponses);

  } catch (error) {
    console.error('❌ REASONING ENGINE ERROR:', error);
    // If LLM fails completely, we use the pure local fallback for all patterns
    hypotheses = patterns.map(p => generateFallbackHypothesis(p, {
      currentMetrics,
      baselineMetrics,
      anomalies,
      patterns,
      recentOutcomes: pastOutcomes.slice(-10),
    }));
  }
  
  // 5. Plan actions
  const actions = planActions({
    patterns,
    anomalies,
    hypotheses,
    pastOutcomes,
  });
  
  // 6. Make decision
  const decision = makeDecision({
    actions,
    hypotheses,
    pastOutcomes,
    config: config.decision,
  });
  
  return {
    hypotheses,
    decision,
    anomalies,
    patterns,
    processingTime: Date.now() - startTime,
  };
};