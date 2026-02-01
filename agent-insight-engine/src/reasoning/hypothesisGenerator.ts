import type {
  MetricsSnapshot,
  Anomaly,
  RecognizedPattern,
  ActionOutcome,
  Hypothesis,
  ReasoningStep,
  AlternativeExplanation,
} from './types.ts';

export interface HypothesisPromptContext {
  currentMetrics: MetricsSnapshot;
  baselineMetrics: MetricsSnapshot;
  anomalies: Anomaly[];
  patterns: RecognizedPattern[];
  recentOutcomes: ActionOutcome[];
}

export interface LLMHypothesisResponse {
  primaryHypothesis: string;
  confidence: number;
  reasoningChain: Array<{ observation: string; inference: string }>;
  alternativeExplanations: Array<{ hypothesis: string; whyLessLikely: string; confidence: number }>;
}

// ============================================================================
// Fallback Hypothesis Generation (Local Templates)
// ============================================================================

export const generateFallbackHypothesis = (
  pattern: RecognizedPattern,
  context: HypothesisPromptContext
): Hypothesis => {
  const id = `hypothesis_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const templates: Record<string, { primary: string; alternatives: string[] }> = {
    issuer_degradation: {
      primary: `Issuer-specific issue affecting ${pattern.affectedIssuers.join(', ') || 'multiple issuers'}.`,
      alternatives: ['Network connectivity issues', 'Temporary issuer maintenance'],
    },
    retry_storm: {
      primary: 'Cascading retry amplification is overwhelming the system.',
      alternatives: ['Upstream service degradation', 'Retry policy misconfiguration'],
    },
    latency_spike: {
      primary: 'Broad latency increase across the payment pipeline.',
      alternatives: ['Database performance degradation', 'Network congestion'],
    },
  };
  
  const template = templates[pattern.type] || {
    primary: 'Unknown pattern detected. Manual investigation recommended.',
    alternatives: ['Insufficient data', 'Possible new failure mode'],
  };
  
  return {
    id,
    pattern: pattern.type,
    confidence: Math.min(0.99, pattern.confidence * 0.8),
    primaryExplanation: template.primary,
    reasoningChain: pattern.evidence.slice(0, 2).map((e, i) => ({
      step: i + 1,
      observation: `${e.metric}: observed ${e.observed.toFixed(2)}`,
      inference: `Deviation from baseline detected.`,
    })),
    alternativeExplanations: template.alternatives.map((alt) => ({
      hypothesis: alt,
      confidence: 0.2,
      whyLessLikely: 'Lower evidence support',
    })),
    supportingEvidence: pattern.evidence,
    generatedAt: Date.now(),
  };
};

// ============================================================================
// Main Entry Point
// ============================================================================

export const generateHypotheses = (
  context: HypothesisPromptContext,
  llmResponses?: LLMHypothesisResponse[]
): Hypothesis[] => {
  const hypotheses: Hypothesis[] = [];
  
  // Iterate through all detected patterns
  for (let i = 0; i < context.patterns.length; i++) {
    const pattern = context.patterns[i];
    const llmResponse = llmResponses ? llmResponses[i] : undefined;
    
    if (llmResponse) {
      // Logic for parsing a successful LLM response
      const id = `hypothesis_llm_${Date.now()}_${i}`;
      
      // Build reasoning chain - if LLM didn't include details, generate from explanation
      let reasoningChain = (llmResponse.reasoningChain || []).map((r, idx) => ({
        step: idx + 1,
        observation: r.observation || `Step ${idx + 1}`,
        inference: r.inference || llmResponse.primaryHypothesis || 'Analysis performed',
      }));
      
      // If no reasoning chain, create one from the primary explanation
      if (reasoningChain.length === 0 && llmResponse.primaryHypothesis) {
        reasoningChain = [
          {
            step: 1,
            observation: `Pattern detected: ${pattern.type}`,
            inference: llmResponse.primaryHypothesis,
          },
          {
            step: 2,
            observation: `Confidence level: ${llmResponse.confidence || 0.5}`,
            inference: 'Assessment confidence based on available evidence',
          },
        ];
      }
      
      hypotheses.push({
        id,
        pattern: pattern.type,
        confidence: Math.min(0.99, llmResponse.confidence || 0.5),
        primaryExplanation: llmResponse.primaryHypothesis,
        reasoningChain,
        alternativeExplanations: llmResponse.alternativeExplanations || [],
        supportingEvidence: pattern.evidence,
        generatedAt: Date.now(),
      });
    } else {
      // CRITICAL FIX: Instead of throwing, use fallback if index is missing
      console.warn(`⚠️ [REASONING] Missing LLM response for pattern ${pattern.type}. Using fallback.`);
      hypotheses.push(generateFallbackHypothesis(pattern, context));
    }
  }
  
  return hypotheses.sort((a, b) => b.confidence - a.confidence);
};