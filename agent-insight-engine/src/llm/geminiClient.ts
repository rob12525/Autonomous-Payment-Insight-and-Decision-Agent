/**
 * Gemini LLM Client
 * Handles calls to Google's Gemini API for AI reasoning
 *
 * CRITICAL CONSTRAINTS:
 * ✅ LLM used ONLY for hypothesis generation
 * ✅ No execution or system control
 * ✅ Deterministic fallback exists
 * ✅ Confidence always bounded (0 < c < 1)
 * ✅ Architecturally replaceable
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

if (!apiKey) {
  console.warn("⚠️ GEMINI_API_KEY not set. LLM will use fallback templates.");
}

const client = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Call Gemini API to generate hypothesis and confidence
 */
export async function callGemini(
  prompt: string
): Promise<{
  primaryHypothesis: string;
  confidence: number;
  reasoningChain: Array<{ observation: string; inference: string }>;
  alternativeExplanations: Array<{
    hypothesis: string;
    whyLessLikely: string;
    confidence: number;
  }>;
  source: "llm" | "fallback";
}> {
  // ---------------- FALLBACK: NO API KEY ----------------
  if (!client || !apiKey) {
    console.log("📋 [FALLBACK] Using template (no Gemini API key)");
    return {
      primaryHypothesis:
        "Pattern detected in payment behavior. Recommend review before processing.",
      confidence: 0.72,
      reasoningChain: [
        {
          observation: "No API key configured",
          inference: "Using deterministic fallback template",
        },
      ],
      alternativeExplanations: [
        {
          hypothesis: "Configure GEMINI_API_KEY for AI-powered reasoning",
          whyLessLikely: "Fallback templates lack LLM insights",
          confidence: 0.3,
        },
      ],
      source: "fallback",
    };
  }

  try {
    const model = client.getGenerativeModel({ model: MODEL_NAME });

    console.log("🤖 [LLM] Calling Gemini API...");
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // ---------------- SAFE JSON EXTRACTION ----------------
    const firstBrace = responseText.indexOf("{");
    const lastBrace = responseText.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON object found in Gemini response");
    }

    const parsed = JSON.parse(
      responseText.slice(firstBrace, lastBrace + 1)
    );

    // ---------------- VALIDATION ----------------
    const primaryHypothesis =
      parsed.primaryHypothesis || parsed.hypothesis;

    if (
      !primaryHypothesis ||
      typeof primaryHypothesis !== "string" ||
      primaryHypothesis.trim().length === 0
    ) {
      console.warn("⚠️ [FALLBACK] Empty hypothesis from Gemini");
      return {
        primaryHypothesis:
          "Gemini generated an empty hypothesis. Using fallback.",
        confidence: 0.6,
        reasoningChain: [
          {
            observation: "LLM response missing hypothesis",
            inference: "Fallback engaged",
          },
        ],
        alternativeExplanations: [],
        source: "fallback",
      };
    }

    // ---------------- CONFIDENCE CONSTRAINT ----------------
    let confidence = Number(parsed.confidence);

    if (!Number.isFinite(confidence)) {
      console.warn("⚠️ [CONSTRAINT] Invalid confidence, defaulting to 0.5");
      confidence = 0.5;
    }

    confidence = Math.min(0.99, Math.max(0.01, confidence));

    console.log("✅ [LLM SUCCESS] Hypothesis generated with confidence:", confidence);

    return {
      primaryHypothesis,
      confidence,
      reasoningChain:
        parsed.reasoningChain ??
        [{ observation: "LLM analysis completed", inference: "Hypothesis generated" }],
      alternativeExplanations: parsed.alternativeExplanations ?? [],
      source: "llm",
    };
  } catch (error) {
    console.error("❌ [FALLBACK] Gemini API Error:", error);
    return {
      primaryHypothesis:
        "Anomaly detected in transaction pattern. Recommend human review.",
      confidence: 0.68,
      reasoningChain: [
        {
          observation: "Gemini API error occurred",
          inference: "Falling back to deterministic template",
        },
      ],
      alternativeExplanations: [
        {
          hypothesis: "Network or API failure",
          whyLessLikely: "Fallback path is reliable",
          confidence: 0.4,
        },
      ],
      source: "fallback",
    };
  }
}

/**
 * Build hypothesis generation prompt for Gemini
 */
export function buildHypothesisPrompt(
  patterns: string[],
  metrics: Record<string, number>
): string {
  const metricsStr = Object.entries(metrics)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  return `
You are an AI analyzing payment transaction patterns.

Detected Patterns:
${patterns.join(", ")}

Current Metrics:
${metricsStr}

Generate a hypothesis explaining the observed behavior.

Respond ONLY in valid JSON:
{
  "primaryHypothesis": "Concise hypothesis statement",
  "confidence": 0.65,
  "reasoningChain": [
    { "observation": "Observed fact", "inference": "Logical inference" }
  ],
  "alternativeExplanations": [
    {
      "hypothesis": "Alternative explanation",
      "whyLessLikely": "Reason it is less likely",
      "confidence": 0.3
    }
  ]
}

Rules:
- Confidence must be between 0 and 1 (not absolute).
- Be concise.
`;
}

/**
 * Generate hypothesis using Gemini or fallback
 */
export async function generateHypothesis(
  patterns: string[],
  metrics: Record<string, number>
) {
  const prompt = buildHypothesisPrompt(patterns, metrics);
  return callGemini(prompt);
}