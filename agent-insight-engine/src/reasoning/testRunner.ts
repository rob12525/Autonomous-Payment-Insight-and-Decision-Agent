import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Resolve project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env early (before any runtime imports that read process.env)
dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

import type { MetricsSnapshot } from "./types.ts";


// ================= BASELINE (healthy system) =================
const baselineMetrics: MetricsSnapshot = {
  timestamp: Date.now(),
  successRate: 0.99,

  latency: {
    p50: 200,
    p95: 450,
    p99: 700,
  },

  totalTransactions: 100_000,
  totalRetries: 2_000,
  retryRatio: 0.02,

  errorBreakdown: [
    {
      code: "NETWORK_ERROR",
      count: 300,
      percentage: 0.003,
    },
    {
      code: "ISSUER_TIMEOUT",
      count: 200,
      percentage: 0.002,
    },
  ],

  issuerMetrics: [
    {
      issuerId: "visa",
      issuerName: "Visa",
      successRate: 0.99,
      latency: {
        p50: 210,
        p95: 450,
        p99: 720,
      },
      transactionCount: 60_000,
      errorCount: 500,
      retryCount: 1_200,
    },
    {
      issuerId: "mastercard",
      issuerName: "Mastercard",
      successRate: 0.99,
      latency: {
        p50: 205,
        p95: 430,
        p99: 690,
      },
      transactionCount: 40_000,
      errorCount: 300,
      retryCount: 800,
    },
  ],
};

// ================= CURRENT (problem scenario) =================
const currentMetrics: MetricsSnapshot = {
  timestamp: Date.now(),
  successRate: 0.85,

  latency: {
    p50: 260,
    p95: 600,
    p99: 900,
  },

  totalTransactions: 98_000,
  totalRetries: 7_800,
  retryRatio: 0.08,

  errorBreakdown: [
    {
      code: "ISSUER_TIMEOUT",
      count: 4_500,
      percentage: 0.045,
      issuerId: "visa",
    },
    {
      code: "NETWORK_ERROR",
      count: 800,
      percentage: 0.008,
    },
  ],

  issuerMetrics: [
    {
      issuerId: "visa",
      issuerName: "Visa",
      successRate: 0.72,
      latency: {
        p50: 320,
        p95: 700,
        p99: 1_100,
      },
      transactionCount: 58_000,
      errorCount: 4_800,
      retryCount: 6_000,
    },
    {
      issuerId: "mastercard",
      issuerName: "Mastercard",
      successRate: 0.99,
      latency: {
        p50: 210,
        p95: 440,
        p99: 700,
      },
      transactionCount: 40_000,
      errorCount: 300,
      retryCount: 800,
    },
  ],
};

const pastOutcomes: any[] = [];

// ================= RUN REASONING ENGINE =================
async function run() {
  // Dynamically import runtime modules after dotenv has been applied
  const [{ reason }, { callGemini }] = await Promise.all([
    import('./index.ts'),
    import('../llm/geminiClient.ts'),
  ]);

  // 1️⃣ Build the LLM prompt - directly from Gemini
  // We'll call Gemini directly with a prompt string
  const fullPrompt = `You are analyzing payment system metrics.
  
Current metrics show:
- Success rate: 84.5%
- P99 latency: 575ms
- Baseline success: 99.15%

Generate a hypothesis for why performance degraded. Respond in JSON with primaryHypothesis, confidence (0-1), reasoningChain array, and alternativeExplanations array.`;

const llmResponse = await callGemini(fullPrompt);

  // 3️⃣ Safety check (VERY IMPORTANT)
  if (
    typeof llmResponse.confidence !== "number" ||
    llmResponse.confidence <= 0 ||
    llmResponse.confidence >= 1
  ) {
    throw new Error("Invalid Gemini hypothesis confidence");
  }

  // 4️⃣ Inject Gemini output into reasoning engine (async now)
  const result = await reason({
    currentMetrics,
    baselineMetrics,
    pastOutcomes: [],
    llmResponses: [llmResponse], // <-- test mode: use pre-computed response
  });

  console.log("===== AGENT OUTPUT (GEMINI) =====");
  console.log(JSON.stringify(result, null, 2));
}

run();
