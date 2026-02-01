/**
 * Module 2: Agent Reasoning & Decision Engine
 * Action Planner
 * 
 * Generate action proposals with estimated impact.
 * Always produces 3+ actions including do_nothing.
 * Pure functions, no side effects, no execution.
 */

import type {
  MetricsSnapshot,
  Anomaly,
  RecognizedPattern,
  Hypothesis,
  ActionOutcome,
  ActionProposal,
  ActionCategory,
  ActionType,
  ImpactEstimate,
} from './types.ts';

// ============================================================================
// Action Templates
// ============================================================================

interface ActionTemplate {
  type: ActionType;
  category: ActionCategory;
  description: string;
  parameters: Record<string, string | number | boolean | string[]>;
  prerequisites: string[];
  reversible: boolean;
  baseImpact: ImpactEstimate;
}

const trafficRoutingActions: ActionTemplate[] = [
  {
    type: 'shift_traffic',
    category: 'traffic_routing',
    description: 'Shift traffic away from degraded issuer to healthy alternatives',
    parameters: { shiftPercentage: 0.5, targetIssuers: [] },
    prerequisites: ['healthy_alternative_issuers_available'],
    reversible: true,
    baseImpact: {
      successRateChange: 0.03,
      latencyImpact: 10,
      costImpact: 0.1,
      riskLevel: 0.3,
    },
  },
  {
    type: 'disable_route',
    category: 'traffic_routing',
    description: 'Completely disable traffic to failing issuer',
    parameters: { targetIssuers: [] },
    prerequisites: ['alternative_routes_available'],
    reversible: true,
    baseImpact: {
      successRateChange: 0.05,
      latencyImpact: -20,
      costImpact: 0.2,
      riskLevel: 0.5,
    },
  },
  {
    type: 'enable_backup_provider',
    category: 'traffic_routing',
    description: 'Enable backup payment provider to handle overflow',
    parameters: { provider: 'backup', trafficPercentage: 0.2 },
    prerequisites: ['backup_provider_configured', 'backup_provider_healthy'],
    reversible: true,
    baseImpact: {
      successRateChange: 0.02,
      latencyImpact: 30,
      costImpact: 0.3,
      riskLevel: 0.4,
    },
  },
];

const rateLimitingActions: ActionTemplate[] = [
  {
    type: 'adjust_retry_policy',
    category: 'rate_limiting',
    description: 'Reduce retry attempts and increase backoff intervals',
    parameters: { maxRetries: 2, backoffMultiplier: 2.0 },
    prerequisites: [],
    reversible: true,
    baseImpact: {
      successRateChange: -0.01,
      latencyImpact: 50,
      costImpact: -0.1,
      riskLevel: 0.2,
    },
  },
  {
    type: 'implement_backoff',
    category: 'rate_limiting',
    description: 'Implement exponential backoff for affected endpoints',
    parameters: { initialDelay: 100, maxDelay: 5000, multiplier: 2 },
    prerequisites: [],
    reversible: true,
    baseImpact: {
      successRateChange: 0.01,
      latencyImpact: 100,
      costImpact: -0.05,
      riskLevel: 0.15,
    },
  },
  {
    type: 'throttle_path',
    category: 'rate_limiting',
    description: 'Throttle request rate to affected payment paths',
    parameters: { rateLimit: 100, windowSeconds: 60 },
    prerequisites: [],
    reversible: true,
    baseImpact: {
      successRateChange: -0.02,
      latencyImpact: 200,
      costImpact: -0.15,
      riskLevel: 0.25,
    },
  },
];

const alertingActions: ActionTemplate[] = [
  {
    type: 'escalate_oncall',
    category: 'alerting',
    description: 'Escalate to on-call engineer for manual intervention',
    parameters: { severity: 'high', channel: 'pagerduty' },
    prerequisites: ['oncall_rotation_configured'],
    reversible: false,
    baseImpact: {
      successRateChange: 0,
      latencyImpact: 0,
      costImpact: 0.05,
      riskLevel: 0.05,
    },
  },
  {
    type: 'send_notification',
    category: 'alerting',
    description: 'Send notification to relevant stakeholders',
    parameters: { channels: ['slack', 'email'], priority: 'high' },
    prerequisites: [],
    reversible: false,
    baseImpact: {
      successRateChange: 0,
      latencyImpact: 0,
      costImpact: 0.01,
      riskLevel: 0.02,
    },
  },
  {
    type: 'log_for_analysis',
    category: 'alerting',
    description: 'Increase logging verbosity for post-incident analysis',
    parameters: { logLevel: 'debug', duration: 3600 },
    prerequisites: [],
    reversible: true,
    baseImpact: {
      successRateChange: 0,
      latencyImpact: 5,
      costImpact: 0.02,
      riskLevel: 0.01,
    },
  },
];

const doNothingAction: ActionTemplate = {
  type: 'do_nothing',
  category: 'do_nothing',
  description: 'Take no action and continue monitoring',
  parameters: { monitoringInterval: 60 },
  prerequisites: [],
  reversible: true,
  baseImpact: {
    successRateChange: 0,
    latencyImpact: 0,
    costImpact: 0,
    riskLevel: 0.1,
  },
};

// ============================================================================
// Impact Estimation
// ============================================================================

/**
 * Adjust impact estimate based on pattern and anomaly context
 */
const adjustImpactForContext = (
  baseImpact: ImpactEstimate,
  pattern: RecognizedPattern,
  anomalies: Anomaly[]
): ImpactEstimate => {
  const severity = anomalies.reduce((max, a) => {
    const severityScore = { low: 1, medium: 2, high: 3, critical: 4 }[a.severity];
    return Math.max(max, severityScore);
  }, 0);
  
  // Higher severity = higher potential impact
  const severityMultiplier = 1 + (severity - 2) * 0.2;
  
  // Pattern confidence affects expected outcome reliability
  const confidenceMultiplier = 0.5 + pattern.confidence * 0.5;
  
  return {
    successRateChange: baseImpact.successRateChange * severityMultiplier * confidenceMultiplier,
    latencyImpact: baseImpact.latencyImpact * severityMultiplier,
    costImpact: baseImpact.costImpact * severityMultiplier,
    riskLevel: baseImpact.riskLevel * (2 - confidenceMultiplier), // Lower confidence = higher risk
  };
};

/**
 * Incorporate historical outcomes into impact estimation
 */
const adjustImpactFromHistory = (
  impact: ImpactEstimate,
  actionType: ActionType,
  outcomes: ActionOutcome[]
): ImpactEstimate => {
  const relevantOutcomes = outcomes.filter((o) => o.actionType === actionType);
  
  if (relevantOutcomes.length === 0) {
    // No historical data - slightly increase risk
    return {
      ...impact,
      riskLevel: Math.min(1, impact.riskLevel * 1.2),
    };
  }
  
  const successRate = relevantOutcomes.filter((o) => o.wasSuccessful).length / relevantOutcomes.length;
  const avgSuccessChange = relevantOutcomes.reduce(
    (sum, o) => sum + (o.actualImpact.successRateAfter - o.actualImpact.successRateBefore),
    0
  ) / relevantOutcomes.length;
  
  return {
    // Blend predicted with historical average
    successRateChange: impact.successRateChange * 0.5 + avgSuccessChange * 0.5,
    latencyImpact: impact.latencyImpact,
    costImpact: impact.costImpact,
    // Adjust risk based on historical success rate
    riskLevel: impact.riskLevel * (1.5 - successRate),
  };
};

// ============================================================================
// Action Generation
// ============================================================================

/**
 * Generate a unique action ID
 */
const generateActionId = (type: ActionType): string =>
  `action_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

/**
 * Create action proposal from template with context-adjusted impact
 */
const createActionProposal = (
  template: ActionTemplate,
  pattern: RecognizedPattern,
  anomalies: Anomaly[],
  outcomes: ActionOutcome[],
  customParams?: Record<string, string | number | boolean | string[]>
): ActionProposal => {
  let estimatedImpact = adjustImpactForContext(template.baseImpact, pattern, anomalies);
  estimatedImpact = adjustImpactFromHistory(estimatedImpact, template.type, outcomes);
  
  return {
    id: generateActionId(template.type),
    category: template.category,
    type: template.type,
    description: template.description,
    parameters: { ...template.parameters, ...customParams },
    estimatedImpact,
    prerequisites: template.prerequisites,
    reversible: template.reversible,
  };
};

/**
 * Get actions relevant to issuer degradation pattern
 */
const getIssuerDegradationActions = (
  pattern: RecognizedPattern,
  anomalies: Anomaly[],
  outcomes: ActionOutcome[]
): ActionProposal[] => {
  const actions: ActionProposal[] = [];
  
  // Traffic routing is primary response
  actions.push(
    createActionProposal(
      trafficRoutingActions[0], // shift_traffic
      pattern,
      anomalies,
      outcomes,
      { targetIssuers: pattern.affectedIssuers }
    )
  );
  
  if (pattern.confidence > 0.7) {
    actions.push(
      createActionProposal(
        trafficRoutingActions[1], // disable_route
        pattern,
        anomalies,
        outcomes,
        { targetIssuers: pattern.affectedIssuers }
      )
    );
  }
  
  actions.push(
    createActionProposal(trafficRoutingActions[2], pattern, anomalies, outcomes) // enable_backup
  );
  
  // Add alerting
  actions.push(
    createActionProposal(alertingActions[0], pattern, anomalies, outcomes) // escalate
  );
  
  return actions;
};

/**
 * Get actions relevant to retry storm pattern
 */
const getRetryStormActions = (
  pattern: RecognizedPattern,
  anomalies: Anomaly[],
  outcomes: ActionOutcome[]
): ActionProposal[] => {
  const actions: ActionProposal[] = [];
  
  // Rate limiting is primary response
  actions.push(
    createActionProposal(rateLimitingActions[0], pattern, anomalies, outcomes) // adjust_retry_policy
  );
  actions.push(
    createActionProposal(rateLimitingActions[1], pattern, anomalies, outcomes) // implement_backoff
  );
  actions.push(
    createActionProposal(rateLimitingActions[2], pattern, anomalies, outcomes) // throttle_path
  );
  
  // Traffic routing as secondary
  actions.push(
    createActionProposal(trafficRoutingActions[0], pattern, anomalies, outcomes)
  );
  
  // Alerting
  actions.push(
    createActionProposal(alertingActions[0], pattern, anomalies, outcomes)
  );
  
  return actions;
};

/**
 * Get actions relevant to latency spike pattern
 */
const getLatencySpikeActions = (
  pattern: RecognizedPattern,
  anomalies: Anomaly[],
  outcomes: ActionOutcome[]
): ActionProposal[] => {
  const actions: ActionProposal[] = [];
  
  // Rate limiting to reduce load
  actions.push(
    createActionProposal(rateLimitingActions[2], pattern, anomalies, outcomes) // throttle_path
  );
  
  // Traffic routing
  if (pattern.affectedIssuers.length > 0) {
    actions.push(
      createActionProposal(
        trafficRoutingActions[0],
        pattern,
        anomalies,
        outcomes,
        { targetIssuers: pattern.affectedIssuers }
      )
    );
  }
  
  actions.push(
    createActionProposal(trafficRoutingActions[2], pattern, anomalies, outcomes) // enable_backup
  );
  
  // Logging for analysis
  actions.push(
    createActionProposal(alertingActions[2], pattern, anomalies, outcomes) // log_for_analysis
  );
  
  // Alerting
  actions.push(
    createActionProposal(alertingActions[0], pattern, anomalies, outcomes)
  );
  
  return actions;
};

/**
 * Get actions for noise pattern (mostly monitoring)
 */
const getNoiseActions = (
  pattern: RecognizedPattern,
  anomalies: Anomaly[],
  outcomes: ActionOutcome[]
): ActionProposal[] => {
  const actions: ActionProposal[] = [];
  
  // Light monitoring actions
  actions.push(
    createActionProposal(alertingActions[2], pattern, anomalies, outcomes) // log_for_analysis
  );
  actions.push(
    createActionProposal(alertingActions[1], pattern, anomalies, outcomes) // send_notification
  );
  
  return actions;
};

/**
 * Create do_nothing action with context-adjusted impact
 */
const createDoNothingAction = (
  pattern: RecognizedPattern,
  anomalies: Anomaly[]
): ActionProposal => {
  const severity = anomalies.reduce((max, a) => {
    const severityScore = { low: 1, medium: 2, high: 3, critical: 4 }[a.severity];
    return Math.max(max, severityScore);
  }, 0);
  
  // Estimate impact of inaction based on severity
  const inactionRisk = severity * 0.15;
  const successRateDecline = severity > 2 ? -0.01 * (severity - 2) : 0;
  
  return {
    id: generateActionId('do_nothing'),
    category: 'do_nothing',
    type: 'do_nothing',
    description: doNothingAction.description,
    parameters: doNothingAction.parameters,
    estimatedImpact: {
      successRateChange: successRateDecline,
      latencyImpact: 0,
      costImpact: 0,
      riskLevel: inactionRisk,
    },
    prerequisites: [],
    reversible: true,
  };
};

// ============================================================================
// Main Action Planning Function
// ============================================================================

export interface ActionPlannerInput {
  patterns: RecognizedPattern[];
  anomalies: Anomaly[];
  hypotheses: Hypothesis[];
  pastOutcomes: ActionOutcome[];
}

/**
 * Generate action proposals for the given situation
 * Always returns at least 3 actions including do_nothing
 */
export const planActions = (input: ActionPlannerInput): ActionProposal[] => {
  const { patterns, anomalies, hypotheses, pastOutcomes } = input;
  
  const allActions: ActionProposal[] = [];
  const primaryPattern = patterns[0] || { type: 'noise', confidence: 0.3 } as RecognizedPattern;
  
  // Generate pattern-specific actions
  for (const pattern of patterns) {
    let patternActions: ActionProposal[] = [];
    
    switch (pattern.type) {
      case 'issuer_degradation':
        patternActions = getIssuerDegradationActions(pattern, anomalies, pastOutcomes);
        break;
      case 'retry_storm':
        patternActions = getRetryStormActions(pattern, anomalies, pastOutcomes);
        break;
      case 'latency_spike':
        patternActions = getLatencySpikeActions(pattern, anomalies, pastOutcomes);
        break;
      case 'noise':
        patternActions = getNoiseActions(pattern, anomalies, pastOutcomes);
        break;
    }
    
    allActions.push(...patternActions);
  }
  
  // Always include do_nothing
  allActions.push(createDoNothingAction(primaryPattern, anomalies));
  
  // Deduplicate by action type
  const uniqueActions = new Map<ActionType, ActionProposal>();
  for (const action of allActions) {
    if (!uniqueActions.has(action.type)) {
      uniqueActions.set(action.type, action);
    }
  }
  
  let finalActions = Array.from(uniqueActions.values());
  
  // Ensure we have at least 3 actions
  if (finalActions.length < 3) {
    // Add generic monitoring actions
    if (!finalActions.some((a) => a.type === 'send_notification')) {
      finalActions.push(
        createActionProposal(alertingActions[1], primaryPattern, anomalies, pastOutcomes)
      );
    }
    if (!finalActions.some((a) => a.type === 'log_for_analysis')) {
      finalActions.push(
        createActionProposal(alertingActions[2], primaryPattern, anomalies, pastOutcomes)
      );
    }
  }
  
  // Sort by expected positive impact (success rate change - risk)
  return finalActions.sort((a, b) => {
    const scoreA = a.estimatedImpact.successRateChange - a.estimatedImpact.riskLevel;
    const scoreB = b.estimatedImpact.successRateChange - b.estimatedImpact.riskLevel;
    return scoreB - scoreA;
  });
};
