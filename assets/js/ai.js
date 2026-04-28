// ── ai.js ─────────────────────────────────────────────────────────────────────
// AI: text threat analysis + incident report via Anthropic claude-sonnet-4-20250514

const AI_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const AI_MODEL    = 'claude-sonnet-4-20250514';

// ── Switch AI tab ─────────────────────────────────────────────────────────────
function switchAITab(tab, btn) {
  ['monitor','analyze','report'].forEach(t => {
    const el = document.getElementById(`ai-tab-${t}`);
    if (el) el.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

// ── Analyze text ──────────────────────────────────────────────────────────────
async function analyzeText() {
  const input = document.getElementById('analyze-input');
  const output = document.getElementById('analyze-output');
  if (!input || !output) return;

  const text = input.value.trim();
  if (!text) { showToast('Please enter text to analyze', 'warning'); return; }

  output.innerHTML = '<div class="ai-loading">🤖 Analyzing…</div>';

  // Quick local keyword check first
  const quick = window.scoreText(text);

  // Then call Claude for deeper analysis
  try {
    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1000,
        system: `You are SafeGuard's AI safety analyzer. A user has submitted text that may contain distress signals.
Analyze it for:
1. Threat level: none / low / medium / high / critical
2. Key distress indicators found
3. Recommended action for the user
4. Brief reasoning

Respond ONLY as valid JSON:
{
  "level": "low",
  "score": 35,
  "indicators": ["phrase1", "phrase2"],
  "action": "Brief recommended action",
  "reasoning": "One sentence explanation"
}`,
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!response.ok) throw new Error(`API ${response.status}`);
    const data = await response.json();
    const raw  = data.content?.find(b => b.type === 'text')?.text || '{}';

    let result;
    try {
      result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      result = { level: quick.level, score: quick.score, indicators: quick.matches.map(m=>m.word), action: 'Review the situation carefully.', reasoning: 'Local analysis used.' };
    }

    renderAnalysisResult(result, text);

  } catch (err) {
    // Fallback to local keyword analysis
    renderAnalysisResult({
      level:      quick.level,
      score:      quick.score,
      indicators: quick.matches.map(m => m.word),
      action:     quick.level === 'critical' ? 'Trigger SOS immediately!' :
                  quick.level === 'high'     ? 'Stay alert and move to safety.' :
                                               'No immediate action required.',
      reasoning:  'AI unavailable — local keyword analysis used.',
    }, text);
  }
}

function renderAnalysisResult(result, originalText) {
  const output = document.getElementById('analyze-output');
  if (!output) return;

  const colors = { none:'#22c55e', low:'#60a5fa', medium:'#f59e0b', high:'#f97316', critical:'#E8271A' };
  const color  = colors[result.level] || '#60a5fa';
  const icons  = { none:'✅', low:'🔵', medium:'🟡', high:'🟠', critical:'🚨' };

  output.innerHTML = `
    <div class="analyze-result">
      <div class="ar-header">
        <span class="ar-icon">${icons[result.level] || '🔍'}</span>
        <span class="ar-level" style="color:${color}">${(result.level || 'none').toUpperCase()}</span>
        <span class="ar-score" style="color:${color}">${result.score || 0}% risk</span>
      </div>
      ${result.indicators?.length ? `
        <div class="ar-section">
          <div class="ar-label">Indicators detected</div>
          <div class="ar-chips">
            ${result.indicators.map(i => `<span class="kw-chip" style="border-color:${color};color:${color}">${escHtml(i)}</span>`).join('')}
          </div>
        </div>` : ''}
      <div class="ar-section">
        <div class="ar-label">Recommended action</div>
        <div class="ar-action">${escHtml(result.action || '')}</div>
      </div>
      <div class="ar-reasoning">${escHtml(result.reasoning || '')}</div>
      ${(result.level === 'critical' || result.level === 'high') ? `
        <button class="btn btn-red btn-sm" style="margin-top:10px;width:100%"
          onclick="triggerSOS('ai-analysis')">🚨 Trigger SOS Now</button>` : ''}
    </div>
  `;
}

// ── Generate incident report ──────────────────────────────────────────────────
async function generateReport() {
  const output = document.getElementById('report-output');
  if (!output) return;

  const history = loadHistory ? loadHistory() : [];
  const latest  = history.find(h => h.type === 'SOS');

  if (!latest) {
    output.innerHTML = '<div class="ar-reasoning">No SOS events found in history.</div>';
    return;
  }

  output.innerHTML = '<div class="ai-loading">✨ Generating report…</div>';

  const pos  = state?.position || {};
  const prompt = `Generate a brief emergency incident report for:
- Event: ${latest.type} triggered at ${latest.timestamp}
- Location: ${latest.address || `${latest.lat}, ${latest.lng}`}
- Risk score at time: ${latest.riskScore}%
- Notes: ${latest.notes || 'none'}
- Duration: ${latest.resolvedAt ? 'Resolved' : 'Ongoing'}

Format as a clear 3-section report: Incident Summary, Location Details, Recommended Follow-up Actions.`;

  try {
    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`API ${response.status}`);
    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    output.innerHTML = `<div class="report-text">${escHtml(text).replace(/\n/g,'<br>')}</div>`;

  } catch {
    output.innerHTML = `
      <div class="report-text">
        <strong>Incident Summary</strong><br>
        SOS triggered on ${new Date(latest.timestamp).toLocaleString()}.<br><br>
        <strong>Location</strong><br>
        ${escHtml(latest.address || 'Unknown')}<br><br>
        <strong>Follow-up</strong><br>
        Review incident with relevant authorities if needed. Ensure all emergency contacts are informed.
      </div>
    `;
  }
}

// ── Inject styles ─────────────────────────────────────────────────────────────
(function injectAIStyles() {
  if (document.getElementById('ai-styles')) return;
  const s = document.createElement('style');
  s.id = 'ai-styles';
  s.textContent = `
    .ai-loading { opacity:.6; font-size:14px; padding:12px 0; }
    .ai-tab-desc { font-size:13px; opacity:.6; margin-bottom:10px; }
    .analyze-textarea {
      width:100%; min-height:90px; resize:vertical;
      background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
      border-radius:10px; padding:12px; color:inherit; font-size:14px;
      outline:none; margin-bottom:10px; box-sizing:border-box;
    }
    .analyze-result { margin-top:14px; }
    .ar-header { display:flex; align-items:center; gap:10px; margin-bottom:12px; }
    .ar-icon   { font-size:24px; }
    .ar-level  { font-size:18px; font-weight:800; }
    .ar-score  { font-size:14px; font-weight:600; opacity:.8; }
    .ar-section { margin-bottom:10px; }
    .ar-label   { font-size:11px; opacity:.5; text-transform:uppercase; letter-spacing:.06em; margin-bottom:4px; }
    .ar-action  { font-size:14px; font-weight:600; }
    .ar-chips   { display:flex; flex-wrap:wrap; gap:6px; }
    .ar-reasoning { font-size:12px; opacity:.5; margin-top:6px; }
    .report-text { font-size:14px; line-height:1.7; }
    .tabs-wrap { margin-bottom:16px; }
    .tabs { display:flex; gap:4px; background:rgba(255,255,255,.05); border-radius:10px; padding:4px; }
    .tab {
      flex:1; padding:8px; border:none; background:transparent;
      color:inherit; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;
      transition:.15s;
    }
    .tab.active { background:rgba(232,39,26,.2); color:#E8271A; }
    .tab:hover:not(.active) { background:rgba(255,255,255,.08); }
  `;
  document.head.appendChild(s);
})();

window.switchAITab    = switchAITab;
window.analyzeText    = analyzeText;
window.generateReport = generateReport;
