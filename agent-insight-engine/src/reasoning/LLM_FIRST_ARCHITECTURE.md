# LLM-First Reasoning Architecture

## Overview

The reasoning engine now operates in **LLM-first mode**:
- **NO hardcoded hypotheses** or template-based reasoning
- **NO fallback templates** in production workflows
- **LLM is required** for all hypothesis generation
- **Errors propagate** if LLM is unavailable

## Architecture

```
Metrics → Anomalies → Patterns → [LLM CALL] → Hypotheses → Actions → Decision
                                      ↓
                            (Fallback only if LLM crashes)
```

### Key Components

#### 1. **Reasoning Orchestration** (`index.ts`)
- `reason(input)`: Now **async**, always calls LLM
- Automatically generates LLM prompts from metrics, anomalies, patterns
- Throws error if LLM unavailable (no silent fallback)
- Entry point for all reasoning workflows

#### 2. **Hypothesis Generation** (`hypothesisGenerator.ts`)
- `generateHypotheses(context, llmResponses)`: **Requires** LLM responses
- Throws error if no LLM responses provided
- Parses LLM JSON responses into typed Hypothesis objects
- Enforces confidence bounds (0 < confidence < 1)

#### 3. **LLM Client** (`llm/geminiClient.ts`)
- `callGemini(prompt)`: Calls Google Gemini API
- Returns `{ primaryHypothesis, confidence, reasoningChain, alternativeExplanations, source }`
- Returns `source: 'llm'` on success
- Returns `source: 'fallback'` if API error (temporary fallback only)

#### 4. **Fallback** (Safety Net)
- `generateFallbackHypothesis()`: Exists but **not called in normal flow**
- Only used if:
  1. LLM throws unrecoverable error
  2. Gemini API completely unreachable
  3. Manual testing/advanced use cases

## Workflow

### Production Flow (No Fallback)
```typescript
// This is how reason() now works:

1. Detect anomalies from metrics
2. Recognize patterns from anomalies
3. Build LLM prompt from context
4. Call LLM API (Gemini)
5. If LLM succeeds:
   → Parse response → Generate hypotheses → Plan actions → Decide
6. If LLM fails:
   → Throw error (error propagates upstream)
   → System fails fast, logs error, requires manual intervention
```

### Test/Debug Flow (With LLM Responses)
```typescript
// For testing, can pre-compute LLM responses:

const result = await reason({
  currentMetrics,
  baselineMetrics,
  pastOutcomes,
  llmResponses: [/* pre-computed Gemini responses */] // Test mode only
});
```

## Configuration

### Required Environment Variables
```bash
# Must be set for LLM to work
GEMINI_API_KEY=sk-...

# Optional
DB_HOST=localhost
DB_PORT=3306
```

### When LLM is Not Available
```
❌ LLM-based reasoning engine failed: ...
   Fallback templates are disabled. 
   Ensure GEMINI_API_KEY is set and LLM is accessible.
```

The system will:
1. Log the error
2. Throw exception
3. NOT silently use templates
4. Require manual intervention or API key fix

## Constraints

### Confidence Bounds
- Minimum: 0.01 (1%)
- Maximum: 0.99 (99%)
- Never 1.0 (absolute certainty not allowed)

### Hypothesis Quality
- All hypotheses come from LLM (never templates)
- All hypotheses have reasoning chains
- All hypotheses have alternative explanations
- All hypotheses have supporting evidence

### System Reliability
- If Gemini API fails → error propagates
- If GEMINI_API_KEY missing → error on first `reason()` call
- No graceful degradation to templates

## Testing

### Running with LLM
```bash
npx tsx src/executor/testModule3RunnerApprove.ts
```
- Loads metrics
- Calls LLM automatically
- Creates decisions/executions
- Persists to MySQL

### Running Tests
```bash
npm test -- reasoning.test.ts
```
- Tests verify LLM is called
- Tests verify no confidence = 1.0
- Tests verify hypotheses are LLM-generated

## Future Extensibility

To use a different LLM:

1. Create `llm/anthropicClient.ts` (or other provider)
2. Implement `async function callLLM(prompt): Promise<LLMResponse>`
3. Update `reason()` to use new client
4. Same interface, different backend

## FAQ

**Q: What if Gemini API is down?**
A: Error is thrown. System fails. You must fix the API or provide fallback.

**Q: Can I disable LLM for testing?**
A: No. But you can pre-compute LLM responses for reproducible tests.

**Q: What happened to the template hypotheses?**
A: They still exist (`generateFallbackHypothesis`) but are never used in production.

**Q: How do I know if LLM was called?**
A: Check logs for `[LLM] Calling Gemini API...` or `✅ LLM generated hypotheses successfully`.

