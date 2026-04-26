/**
 * risk.js — Context-Aware Risk Scoring Engine
 *
 * Multi-factor risk assessment:
 *   Time of day    → 0–25 points
 *   Location type  → 0–25 points (simplified)
 *   Speed anomaly  → 0–10 points
 *   SOS active     → 0–20 points
 *   Base           → 5 points
 *
 * Output: score (0–100), level (low/medium/high/critical)
 */

const RISK_COLORS = {
  low:      'var(--green)',
  medium:   'var(--amber)',
  high:     'var(--orange)',
  critical: 'var(--red)',
};

const RISK_ICONS = {
  low:      '🟢',
  medium:   '🟡',
  high:     '🟠',
  critical: '🔴',
};

const RISK_DESCRIPTIONS = {
  low:      'No immediate threats detected',
  medium:   'Moderate risk — stay aware of surroundings',
  high:     'Multiple risk factors active — stay alert',
  critical: '🚨 High risk detected — consider triggering SOS',
};

/**
 * Compute risk score from current context.
 * @returns {{ score: number, level: string }}
 */
function computeRiskScore() {
  const hour = new Date().getHours();
  let score = 5; // base

  // Time factor
  if      (hour >= 0  && hour < 5)  score += 25; // deep night
  else if (hour >= 22)               score += 20; // late night
  else if (hour >= 19)               score += 12; // evening

  // Location isolation (simplified — no geofencing needed)
  score += 10;

  // Speed anomaly (running speed in a non-vehicle context)
  if (state.coords && (state.coords.speed || 0) > 3) score += 10;

  // SOS active
  if (state.sosActive) score += 20;

  score = clamp(score, 0, 100);

  let level;
  if      (score >= 75) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 25) level = 'medium';
  else                  level = 'low';

  return { score, level };
}

/** Update all risk UI elements */
function updateRiskScore() {
  if (!state.coords) return;

  const { score, level } = computeRiskScore();
  state.riskScore = score;
  state.riskLevel = level;

  // Score value
  document.getElementById('risk-score-val').textContent = Math.round(score);

  // Progress bar
  const bar = document.getElementById('risk-bar');
  bar.style.width      = score + '%';
  bar.style.background = RISK_COLORS[level];

  // Badge
  const badge = document.getElementById('risk-badge');
  badge.textContent = level.toUpperCase();
  badge.className   = `risk-badge risk-${level}`;

  // Description
  document.getElementById('risk-detail').textContent = RISK_DESCRIPTIONS[level];

  // Status icon (home card)
  document.getElementById('system-status-icon').textContent = RISK_ICONS[level];
  document.getElementById('system-status-txt').textContent  =
    level.charAt(0).toUpperCase() + level.slice(1);
  document.getElementById('system-status-txt').style.color  = RISK_COLORS[level];

  // Topbar status text
  if ((level === 'critical' || level === 'high') &&
      document.getElementById('risk-alert-toggle').checked) {
    document.getElementById('status-text').textContent = '⚠️ High risk detected';
  } else {
    document.getElementById('status-text').textContent = 'System online';
  }

  renderRiskFactors();
}

/** Render risk factor breakdown table */
function renderRiskFactors() {
  const hour = new Date().getHours();
  const spd  = state.coords?.speed || 0;

  const factors = [
    {
      label: 'Time of day',
      value: hour >= 0 && hour < 5 ? 'Deep night' :
             hour >= 22             ? 'Late night'  :
             hour >= 19             ? 'Evening'     : 'Daytime',
      risk:  (hour >= 0 && hour < 5) || hour >= 22 ? 'high' :
             hour >= 19 ? 'medium' : 'low',
    },
    { label: 'Location type',  value: 'Semi-isolated',           risk: 'medium' },
    { label: 'Speed anomaly',  value: spd > 3 ? 'DETECTED' : 'None', risk: spd > 3 ? 'high' : 'low' },
    { label: 'SOS active',     value: state.sosActive ? 'YES' : 'No', risk: state.sosActive ? 'critical' : 'low' },
    { label: 'Overall score',  value: Math.round(state.riskScore) + '/100', risk: state.riskLevel },
  ];

  document.getElementById('risk-factors-list').innerHTML = factors.map(f => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:12px;color:var(--text2)">${f.label}</span>
      <span style="font-size:12px;font-weight:500;color:${RISK_COLORS[f.risk]}">${f.value}</span>
    </div>`
  ).join('');
}