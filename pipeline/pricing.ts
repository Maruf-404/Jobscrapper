// Gemini pricing calculations and cost tracking
// PRD Section 6

import { env } from './env';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CostCalculation {
  inputCostUSD: number;
  outputCostUSD: number;
  totalCostUSD: number;
}

export function calculateCost(tokens: TokenUsage): CostCalculation {
  const priceInPerMillion = env.priceInPerM;
  const priceOutPerMillion = env.priceOutPerM;

  const inputCostUSD = (tokens.inputTokens / 1_000_000) * priceInPerMillion;
  const outputCostUSD = (tokens.outputTokens / 1_000_000) * priceOutPerMillion;
  const totalCostUSD = inputCostUSD + outputCostUSD;

  return {
    inputCostUSD,
    outputCostUSD,
    totalCostUSD,
  };
}

export function estimateCostPerThousandPosts(
  avgInputTokensPerPost: number,
  avgOutputTokensPerPost: number
): number {
  const sample1000 = {
    inputTokens: avgInputTokensPerPost * 1000,
    outputTokens: avgOutputTokensPerPost * 1000,
  };
  return calculateCost(sample1000).totalCostUSD;
}
