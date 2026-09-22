import { SpamAnalysisResult } from '@/types';

interface SpamRule {
  pattern: RegExp;
  word: string;
  category: string;
  weight: number; // Penalty weight
  suggestion: string;
}

const SPAM_RULES: SpamRule[] = [
  { pattern: /\bmake money\b/gi, word: 'make money', category: 'Financial Scams', weight: 15, suggestion: 'increase income / generate revenue' },
  { pattern: /\b100% free\b/gi, word: '100% free', category: 'Aggressive Sales', weight: 15, suggestion: 'complimentary / at no cost' },
  { pattern: /\bclick (here|below|now)\b/gi, word: 'click here/below', category: 'Spam CTA', weight: 10, suggestion: 'view details / access guide' },
  { pattern: /\bguaranteed (income|results|profit)\b/gi, word: 'guaranteed income', category: 'Overpromise', weight: 20, suggestion: 'proven strategies / consistent results' },
  { pattern: /\bcash bonus\b/gi, word: 'cash bonus', category: 'Financial Scams', weight: 15, suggestion: 'exclusive reward / added bonus' },
  { pattern: /\bno risk\b/gi, word: 'no risk', category: 'Overpromise', weight: 10, suggestion: 'risk-managed / safe' },
  { pattern: /\bact now\b/gi, word: 'act now', category: 'High Pressure Urgency', weight: 10, suggestion: 'limited time opportunity' },
  { pattern: /\blimited time\b/gi, word: 'limited time', category: 'High Pressure Urgency', weight: 5, suggestion: 'special period offer' },
  { pattern: /\bdouble your (income|sales|money)\b/gi, word: 'double your income', category: 'Overpromise', weight: 20, suggestion: 'significantly scale your results' },
  { pattern: /\bfree money\b/gi, word: 'free money', category: 'Financial Scams', weight: 25, suggestion: 'unclaimed reward' },
  { pattern: /\bearn \$[0-9]+/gi, word: 'earn $', category: 'Financial Scams', weight: 15, suggestion: 'monetize your channel' },
  { pattern: /\bpassively earn\b/gi, word: 'passively earn', category: 'Financial Scams', weight: 15, suggestion: 'automated revenue streams' },
  { pattern: /\bcongratulations you won\b/gi, word: 'congratulations you won', category: 'Phishing', weight: 30, suggestion: 'special invitation inside' },
  { pattern: /\bbuy direct\b/gi, word: 'buy direct', category: 'Aggressive Sales', weight: 8, suggestion: 'order directly' },
];

export function analyzeSpamKeywords(subject: string, bodyHtml: string): SpamAnalysisResult {
  const fullText = `${subject} ${bodyHtml.replace(/<[^>]*>?/gm, '')}`;
  const detected: { word: string; category: string; suggestion: string }[] = [];
  let totalPenalty = 0;

  for (const rule of SPAM_RULES) {
    if (rule.pattern.test(fullText)) {
      detected.push({
        word: rule.word,
        category: rule.category,
        suggestion: rule.suggestion,
      });
      totalPenalty += rule.weight;
    }
  }

  const score = Math.max(0, 100 - totalPenalty);

  let rating: 'Excellent' | 'Good' | 'Moderate Risk' | 'High Spam Risk' = 'Excellent';
  if (score >= 90) rating = 'Excellent';
  else if (score >= 75) rating = 'Good';
  else if (score >= 55) rating = 'Moderate Risk';
  else rating = 'High Spam Risk';

  return {
    score,
    rating,
    detectedWords: detected,
  };
}
