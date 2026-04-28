// ── keywords.js ───────────────────────────────────────────────────────────────
// Threat keyword lists for audio monitoring and text analysis

window.THREAT_KEYWORDS = {
  critical: [
    'help me', 'call police', 'call 911', 'call 100', 'call 112',
    'i\'m being attacked', 'he\'s got a weapon', 'she has a knife',
    'stop it', 'let me go', 'leave me alone', 'get off me',
    'i\'m going to die', 'please don\'t hurt me', 'emergency',
    'rape', 'assault', 'kidnap', 'shooting', 'stabbing',
  ],
  high: [
    'help', 'sos', 'danger', 'threat', 'scared', 'afraid',
    'following me', 'being followed', 'someone is chasing',
    'i\'m lost', 'i need help', 'unsafe', 'hurting me',
    'don\'t come near', 'stay away', 'back off',
  ],
  medium: [
    'uncomfortable', 'nervous', 'worried', 'suspicious',
    'creepy', 'weird guy', 'feels wrong', 'not safe here',
    'uneasy', 'feels off', 'something\'s wrong', 'strange',
  ],
  low: [
    'alone', 'dark', 'late night', 'empty street',
    'no one around', 'deserted', 'unfamiliar area',
  ],
};

// Score a text string — returns { score:0-100, level, matches:[] }
window.scoreText = function(text) {
  if (!text) return { score: 0, level: 'none', matches: [] };
  const lower = text.toLowerCase();
  const matches = [];
  let score = 0;

  for (const [level, words] of Object.entries(window.THREAT_KEYWORDS)) {
    const weights = { critical: 40, high: 20, medium: 10, low: 5 };
    for (const word of words) {
      if (lower.includes(word)) {
        matches.push({ word, level });
        score = Math.min(100, score + (weights[level] || 5));
      }
    }
  }

  const level =
    score >= 70 ? 'critical' :
    score >= 40 ? 'high'     :
    score >= 20 ? 'medium'   :
    score > 0   ? 'low'      : 'none';

  return { score, level, matches };
};
