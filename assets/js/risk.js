// ── risk.js ───────────────────────────────────────────────────────────────────
// Risk score: time-of-day, speed anomaly, keyword alerts, SOS history

let _riskInterval = null;

// ── Calculate risk ────────────────────────────────────────────────────────────
function calculateRisk(lat, lng) {
  let score = 0;
  const factors = [];

  // 1. Time of day (night = higher risk)
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 5) {
    score += 25;
    factors.push({ label: 'Late night hours', weight: 25, icon: '🌙' });
  } else if (hour < 7 || hour >= 21) {
    score += 12;
    factors.push({ label: 'Evening / early morning', weight: 12, icon: '🌆' });
  }

  // 2. Speed anomaly (running speed without a known route)
  const pos = window.state?.position;
  if (pos && pos.speed > 3.5) {
    score += 20;
    factors.push({ label: 'Elevated movement speed', weight: 20, icon: '🏃' });
  }

  // 3. Recent keyword hits from audio
  if (window.state?._lastKeywordScore > 0) {
    const w = Math.min(30, window.state._lastKeywordScore);
    score += w;
    factors.push({ label: 'Distress words detected', weight: w, icon: '🎙️' });
  }

  // 4. Recent SOS events in session
  const sosCount = parseInt(document.getElementById('sos-count')?.textContent || '0', 10);
  if (sosCount > 0) {
    score += Math.min(20, sosCount * 5);
    factors.push({ label: `${sosCount} SOS event(s) today`, weight: Math.min(20, sosCount * 5), icon: '🚨' });
  }

  // 5. GPS accuracy poor
  if (pos && pos.accuracy > 200) {
    score += 5;
    factors.push({ label: 'Poor GPS accuracy', weight: 5, icon: '📡' });
  }

  score = Math.min(100, Math.max(0, score));

  const level =
    score >= 70 ? 'critical' :
    score >= 50 ? 'high'     :
    score >= 25 ? 'medium'   : 'low';

  // Update state
  if (window.state) {
    state.riskScore = score;
    state.riskLevel = level;
  }

  updateRiskUI(score, level, factors);

  // Auto-alert
  const alertOn = document.getElementById('risk-alert-toggle')?.checked;
  if (alertOn && score >= 70 && window._lastRiskAlertLevel !== 'critical') {
    window._lastRiskAlertLevel = 'critical';
    showToast('⚠️ High risk detected! Stay safe.', 'error', 5000);
    vibrate([200, 100, 200]);
    logEvent(`⚠️ Risk elevated to CRITICAL (${score}%)`);
  } else if (score < 50) {
    window._lastRiskAlertLevel = null;
  }

  return { score, level, factors };
}

// ── Update risk UI ────────────────────────────────────────────────────────────
function updateRiskUI(score, level, factors) {
  // Score value
  const scoreEl = document.getElementById('risk-score-val');
  if (scoreEl) scoreEl.textContent = score;

  // Bar fill
  const barEl = document.getElementById('risk-bar');
  if (barEl) barEl.style.width = `${score}%`;

  // Badge
  const badgeEl = document.getElementById('risk-badge');
  if (badgeEl) {
    badgeEl.textContent = capitalize(level);
    badgeEl.className = `risk-badge risk-${level}`;
  }

  // Detail text
  const detailEl = document.getElementById('risk-detail');
  if (detailEl) {
    detailEl.textContent = factors.length
      ? factors.map(f => f.icon + ' ' + f.label).join(' · ')
      : 'No elevated risk factors detected';
  }

  // System status card
  const iconEl = document.getElementById('system-status-icon');
  const txtEl  = document.getElementById('system-status-txt');
  const statusMap = {
    low:      { icon: '🟢', text: 'Safe',    cls: 'green'  },
    medium:   { icon: '🟡', text: 'Caution', cls: 'yellow' },
    high:     { icon: '🟠', text: 'Alert',   cls: 'orange' },
    critical: { icon: '🔴', text: 'Danger',  cls: 'red'    },
  };
  const st = statusMap[level] || statusMap.low;
  if (iconEl) iconEl.textContent = st.icon;
  if (txtEl) { txtEl.textContent = st.text; txtEl.className = `stat-text ${st.cls}`; }

  // Factors list in AI view
  const factorsList = document.getElementById('risk-factors-list');
  if (factorsList) {
    if (factors.length === 0) {
      factorsList.innerHTML = '<div class="placeholder-text">✅ No active risk factors</div>';
    } else {
      factorsList.innerHTML = factors.map(f => `
        <div class="risk-factor-row">
          <span class="rf-icon">${f.icon}</span>
          <span class="rf-label">${f.label}</span>
          <span class="rf-weight">+${f.weight}%</span>
        </div>
      `).join('');
    }
  }
}

// ── Start periodic risk refresh ───────────────────────────────────────────────
function startRiskRefresh() {
  if (_riskInterval) clearInterval(_riskInterval);
  _riskInterval = setInterval(() => {
    const pos = window.state?.position;
    calculateRisk(pos?.lat, pos?.lng);
  }, 30000); // every 30s
}

// ── Inject styles ─────────────────────────────────────────────────────────────

window.calculateRisk  = calculateRisk;
window.startRiskRefresh = startRiskRefresh;
