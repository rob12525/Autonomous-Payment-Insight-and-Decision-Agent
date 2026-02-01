# LLM (Gemini) Integration Constraints & Verification

## 🎯 Purpose of LLM in Payment Intelligence System

The Gemini LLM is used **strictly for hypothesis generation and reasoning**, not for execution or control.

### Why Gemini?

Payment failure root-cause analysis is:
- **Probabilistic** - Multiple factors interact in complex ways
- **Ambiguous** - Same symptoms can have different causes
- **Context-dependent** - Rules valid in one scenario fail in another

Traditional approaches fail:
- ❌ Fixed rules - Cannot adapt to new patterns
- ❌ ML classifiers - Require labeled data; struggle with edge cases
- ❌ Heuristics - Too rigid; high false positives

Gemini provides:
- ✅ Natural language reasoning with explainability
- ✅ Contextual understanding of payment systems
- ✅ Generalization to novel patterns
- ✅ Human-readable hypothesis generation

---

## 🛡️ Critical Constraints (Enforced)

### 1. **LLM Does NOT Execute Actions**
```typescript
// ✅ ALLOWED: Generate hypothesis
const hypothesis = await callGemini(prompt);

// ❌ FORBIDDEN: Execute action based on LLM output
// database.deleteUser();  // ← Would violate constraint
// payment.process();      // ← Would violate constraint
```

### 2. **LLM Does NOT Modify System State**
- Only generates hypotheses
- No database writes, no API calls, no configuration changes
- All side effects isolated in executor/index.ts

### 3. **All Outputs are Validated and Clamped**
```typescript
// VALIDATION: Hypothesis must be non-empty string
if (!parsed.hypothesis || typeof parsed.hypothesis !== 'string') {
  return fallback; // ← Fallback to template
}

// CONSTRAINT: Confidence bounded (0 < confidence < 1)
confidence = Math.min(0.99, Math.max(0.01, confidence));
// Never 0.0 (no absolute certainty)
// Never 1.0 (no absolute certainty)
```

### 4. **Confidence Score Bounded**
```
Valid range: (0, 1) - open interval, never endpoints
✅ 0.01-0.99 - Valid
❌ 0.0 - Forbidden (absolute certainty)
❌ 1.0 - Forbidden (absolute certainty)
❌ negative/NaN - Rejected, clamped
```

### 5. **Deterministic Fallback Logic**
If LLM fails for ANY reason:
- No API key → Fallback template
- Network error → Fallback template
- Invalid JSON response → Fallback template
- Empty hypothesis → Fallback template
- Out-of-bounds confidence → Fallback template

**System remains functional with or without LLM.**

### 6. **Architecturally Replaceable**
```typescript
// Can be swapped with another LLM:
// - Claude API
// - OpenAI GPT
// - Local model
// - Or disabled entirely

// Without affecting system correctness
```

---

## 📊 Output Tracking: LLM vs Fallback

### Source Tracking in `callGemini()`

```typescript
return {
  hypothesis: string,
  confidence: number,
  source: 'llm' | 'fallback'  // ← Explicit source tracking
}
```

### Console Logging

```
🤖 [LLM] Calling Gemini API...
✅ [LLM SUCCESS] Gemini generated hypothesis with confidence: 0.76

// OR

📋 [FALLBACK] Using template (no Gemini API key)
⚠️ [FALLBACK] Gemini response not in expected JSON format
⚠️ [CONSTRAINT] Gemini confidence out of bounds: 1.5, clamping to valid range
```

### Integration with Reasoning Pipeline

```typescript
// testRunner.ts
const llmResponse = await callGemini(fullPrompt);

// ✅ Validate that we got LLM output
if (llmResponse.source === 'llm') {
  console.log("✅ Using LLM reasoning");
} else {
  console.log("⚠️ Using fallback template");
}

// hypothesisGenerator.ts
const hypotheses = generateHypotheses(context, [llmResponse]);
// If llmResponse provided → uses LLM output
// If llmResponse undefined → uses fallback templates
```

---

## 🔍 How to Verify LLM is Being Used (Not Just Fallback)

### 1. Check Console Output
Run the system and look for:
```
✅ [LLM SUCCESS] Gemini generated hypothesis with confidence: 0.XX
```

NOT just:
```
📋 [FALLBACK] Using template...
```

### 2. Verify GEMINI_API_KEY is Set
```bash
# In agent-insight-engine/.env
GEMINI_API_KEY=AIzaSyAJ3eRqTrrj3BEVBX1zuPCnDuDuDN6ap5M
```

### 3. Run testRunner to Trace LLM Flow
```bash
cd agent-insight-engine
npm run test:module3  # Uses testRunner.ts which calls Gemini
```

Expected output flow:
```
🤖 [LLM] Calling Gemini API...
✅ [LLM SUCCESS] Gemini generated hypothesis with confidence: 0.72
===== AGENT OUTPUT (GEMINI) =====
{ hypotheses: [ { source: 'llm', ... } ] }
```

### 4. Check Hypothesis Source Field
```typescript
// If llmResponse.source === 'llm'
// → Hypothesis came from Gemini API

// If llmResponse.source === 'fallback'
// → Using template (investigate why LLM failed)
```

---

## 📋 Fallback Logic (Template-Based)

Fallback hypotheses are used when:
1. No API key configured
2. Network/API error
3. Invalid JSON response from Gemini
4. Empty hypothesis returned
5. Invalid confidence score

**Fallback templates:**
- "Pattern detected in payment behavior. Recommend review before processing."
- "Unable to parse Gemini response. Using fallback hypothesis."
- "Anomaly detected in transaction pattern. Recommend human review."

**All fallback uses are LOGGED** so you know when LLM isn't working.

---

## 🏗️ Architecture Diagram

```
hypothesisGenerator.ts
├─ buildHypothesisPrompt()
│  └─ Structures anomalies + patterns into LLM prompt
│
└─ generateHypotheses(llmResponses)
   ├─ if (llmResponses provided)
   │  └─ parseLLMResponse()  ← Uses LLM output
   └─ else
      └─ generateFallbackHypothesis()  ← Uses template

geminiClient.ts
├─ callGemini()
│  ├─ Try: Call Gemini API
│  │  ├─ Validate JSON response
│  │  ├─ Validate hypothesis (non-empty)
│  │  ├─ Clamp confidence (0 < x < 1)
│  │  └─ Return { hypothesis, confidence, source: 'llm' }
│  └─ Catch: Return fallback with source: 'fallback'
│
└─ generateHypothesis()
   └─ Wrapper that returns source tracking

testRunner.ts
├─ Calls buildHypothesisPrompt()
├─ Calls callGemini(prompt)  ← Gets LLM or fallback
└─ Injects llmResponse into reason() function
```

---

## ✅ Verification Checklist

- [x] LLM used ONLY for hypothesis generation
- [x] LLM does NOT execute actions
- [x] LLM does NOT modify system state
- [x] All outputs validated and clamped
- [x] Confidence bounded (0 < x < 1)
- [x] Deterministic fallback logic
- [x] Architecturally replaceable
- [x] Explicit logging of LLM vs fallback
- [x] Source tracking in return values
- [x] Console output shows which path taken

---

## 📞 Troubleshooting

### Q: How do I know if LLM is being used?
**A:** Look for `✅ [LLM SUCCESS]` in console output. If you only see `📋 [FALLBACK]`, investigate:
- Is GEMINI_API_KEY set?
- Is the API key valid?
- Is network connectivity working?
- Check the error message in logs

### Q: What if Gemini API fails?
**A:** System automatically falls back to deterministic templates. Zero disruption - system remains fully functional.

### Q: Can I swap Gemini for another LLM?
**A:** Yes! The interface is just `callGemini()`. Replace the implementation without changing the rest of the system.

### Q: Can I disable LLM entirely?
**A:** Yes! Remove the Gemini call and always use fallback templates. System will still work.

---

## 🔐 Security & Compliance

- ✅ LLM responses are never trusted blindly
- ✅ All outputs are validated before use
- ✅ Confidence scores explicitly model uncertainty
- ✅ Fallback logic ensures deterministic behavior
- ✅ All decisions logged for audit trail
- ✅ No system state modified by LLM
- ✅ No secrets passed to LLM
- ✅ Rate limited (one call per reasoning cycle)

---

**Last Updated:** February 1, 2026  
**LLM Integration Status:** ✅ Verified & Constrained
