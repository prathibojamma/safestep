/**
 * keywords.js — AI Keyword Detection Engine
 *
 * 48 distress patterns across 3 severity tiers.
 * Runs locally — zero API calls, instant response.
 *
 * Tier 3 (Critical) → confidence +0.40 per keyword → auto-triggers SOS
 * Tier 2 (High)     → confidence +0.15 per keyword
 * Tier 1 (Medium)   → confidence +0.05 per keyword
 *
 * SOS trigger threshold: confidence >= 0.40 OR any Tier 3 keyword
 */
export function detectKeywords(text) { ... }
export function renderKeywordChips(found) { ... }
const TIER3_CRITICAL = [
  'help me', 'save me', 'call police', 'call 911', 'call 999', 'call 112',
  'let me go', 'dont touch me', 'rape', 'assault',
  'gun', 'knife', 'weapon', 'fire', 'bomb',
  'i cant breathe', 'choking', 'drowning', 'overdose',
  'attack', 'killing me', 'going to kill',
];

const TIER2_HIGH = [
  'help', 'stop', 'get away', 'leave me alone', 'please stop',
  'somebody help', 'anyone help', 'emergency',
  'ambulance', 'accident', 'crash', 'bleeding',
  'hurt', 'pain', 'injured', 'unconscious',
  'following me', 'being followed', 'stalker',
  'scared', 'afraid', 'frightened', 'danger', 'unsafe',
];

const TIER1_MEDIUM = [
  'uncomfortable', 'worried', 'anxious',
  'lost', 'alone', 'dark',
  'strange man', 'strange woman', 'threatening',
];

/**
 * Analyze text for distress keywords.
 * @param {string} text - Raw text to analyze
 * @returns {{ found: Array, maxTier: number, confidence: number, shouldTrigger: boolean }}
 */
function detectKeywords(text) {
  if (!text || !text.trim()) {
    return { found: [], maxTier: 0, confidence: 0, shouldTrigger: false };
  }

  const lower = text.toLowerCase();
  const found = [];
  let maxTier = 0;
  let score = 0;

  for (const kw of TIER3_CRITICAL) {
    if (lower.includes(kw) && !found.find(f => f.kw === kw)) {
      found.push({ kw, tier: 3 });
      maxTier = 3;
      score += 0.40;
    }
  }
  for (const kw of TIER2_HIGH) {
    if (lower.includes(kw) && !found.find(f => f.kw === kw)) {
      found.push({ kw, tier: 2 });
      maxTier = Math.max(maxTier, 2);
      score += 0.15;
    }
  }
  for (const kw of TIER1_MEDIUM) {
    if (lower.includes(kw) && !found.find(f => f.kw === kw)) {
      found.push({ kw, tier: 1 });
      maxTier = Math.max(maxTier, 1);
      score += 0.05;
    }
  }

  return {
    found,
    maxTier,
    confidence: clamp(score, 0, 1),
    shouldTrigger: score >= 0.40 || maxTier === 3,
  };
}

/** Render keyword chips into the UI */
function renderKeywordChips(found) {
  const el = document.getElementById('keyword-chips');
  el.innerHTML = found.map(k =>
    `<span class="keyword-chip">${k.tier === 3 ? '🚨' : k.tier === 2 ? '⚠️' : '•'} ${k.kw}</span>`
  ).join('');
}
