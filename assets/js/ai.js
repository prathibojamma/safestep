

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL   = 'claude-sonnet-4-20250514';

// ── Text Threat Analysis ──────────────────────────────────────────────────────

async function analyzeText() {
  const text = document.getElementById('analyze-input').value.trim();
  if (!text) return;

  const out = document.getElementById('analyze-output');

  // Local keyword scan first (instant)
  const kw = detectKeywords(text);

  // Show loading
  out.innerHTML = `<div class="ai-output ai-typing">Analysing with Claude AI…</div>`;

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: 1000,
        system: `You are SafeGuard's AI threat analysis engine. Analyze text for distress signals, threats, or emergency indicators.
Return ONLY a valid JSON object — no markdown, no explanation:
{
  "threat_level": "none|low|medium|high|critical",
  "distress_keywords": [],
  "confidence": 0.0,
  "should_trigger_sos": false,
  "analysis": "1-2 sentence analysis",
  "recommendation": "what the person should do"
}`,
        messages: [{ role: 'user', content: `Analyze this text for distress signals:\n\n"${text}"` }],
      }),
    });

    const data  = await response.json();
    const raw   = data.content?.[0]?.text || '{}';
    let result;

    try {
      result = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      result = null;
    }

    if (result && result.threat_level) {
      _renderAIAnalysisResult(out, result);
    } else {
      _renderLocalAnalysis(out, kw);
    }

  } catch (err) {
    // API unavailable — use local detection
    _renderLocalAnalysis(out, kw);
  }
}

// ── Incident Report Generation ────────────────────────────────────────────────

async function generateReport() {
  const out   = document.getElementById('report-output');
  const event = state.history[0];

  if (!event) {
    out.innerHTML = `<div style="font-size:13px;color:var(--text3)">
      No SOS events recorded yet. Trigger an SOS first.
    </div>`;
    return;
  }

  out.innerHTML = `<div class="ai-output ai-typing">Generating incident report…</div>`;

  const userName = document.getElementById('user-name').value || 'User';
  const duration = formatDuration(event.duration);

  const prompt = `Write a professional 3-4 sentence emergency incident report for first responders.

Incident details:
- Person: ${userName}
- Trigger method: ${event.method}
- Date/Time: ${event.time.toLocaleString()}
- Location: ${event.location}
- Duration: ${duration}
- Risk level: ${event.riskLevel || 'unknown'}
- Status: ${event.status}

Be factual, concise, and professional. Include: what happened, when, where, duration, and resolution status.`;

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      CLAUDE_MODEL,
        max_tokens: 1000,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    const data    = await response.json();
    const summary = data.content?.[0]?.text?.trim() || '';

    if (summary) {
      out.innerHTML = _buildReportCard(summary, 'Claude AI');
      addLog('ai-log', '✨', 'AI incident report generated', '');
    } else {
      _renderTemplateReport(out, event, userName, duration);
    }

  } catch (err) {
    _renderTemplateReport(out, event, userName, duration);
  }
}

// ── Private renderers ─────────────────────────────────────────────────────────

const THREAT_COLORS = {
  none:     'var(--green)',
  low:      'var(--green)',
  medium:   'var(--amber)',
  high:     'var(--orange)',
  critical: 'var(--red)',
};

function _renderAIAnalysisResult(out, result) {
  const color = THREAT_COLORS[result.threat_level] || 'var(--text)';
  const chips = (result.distress_keywords || [])
    .map(k => `<span class="keyword-chip">🔍 ${k}</span>`)
    .join('');

  out.innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px;font-size:13px;margin-top:10px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="font-family:var(--font-h);font-size:15px;font-weight:700;color:${color}">
          Threat: ${result.threat_level?.toUpperCase()}
        </span>
        <span style="font-size:11px;color:var(--text3)">
          Confidence: ${Math.round((result.confidence || 0) * 100)}%
        </span>
      </div>

      <div style="color:var(--text2);margin-bottom:10px;line-height:1.6">
        ${result.analysis || ''}
      </div>

      ${chips ? `<div style="margin-bottom:10px">${chips}</div>` : ''}

      <div style="background:rgba(124,92,252,.08);border:1px solid rgba(124,92,252,.2);
                  border-radius:8px;padding:10px;font-size:12px;color:var(--purple-lt)">
        💡 ${result.recommendation || 'Stay safe and aware of your surroundings.'}
      </div>

      ${result.should_trigger_sos ? `
        <button class="btn btn-red btn-sm" style="margin-top:12px;width:100%"
          onclick="triggerSOS('keyword')">
          🚨 Trigger SOS Now
        </button>` : ''}
    </div>`;

  if (result.should_trigger_sos) {
    addLog('sos-log', '🚨', 'AI recommends SOS trigger', 'High threat detected in text');
  }
}

function _renderLocalAnalysis(out, kw) {
  const level = kw.maxTier === 3 ? 'critical' :
                kw.maxTier === 2 ? 'high' :
                kw.found.length  ? 'medium' : 'none';
  const color = THREAT_COLORS[level];

  out.innerHTML = `
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;
                padding:12px;font-size:13px;margin-top:10px">
      <div style="color:${color};font-weight:600;margin-bottom:8px">
        Threat: ${level.toUpperCase()}
        <span style="font-size:10px;color:var(--text3);margin-left:6px">(local analysis)</span>
      </div>
      <div style="color:var(--text2)">
        ${kw.found.length
          ? `Found ${kw.found.length} distress signal(s): <strong>${kw.found.map(k => k.kw).join(', ')}</strong>`
          : 'No distress keywords detected in this text.'}
      </div>
      ${kw.shouldTrigger ? `
        <button class="btn btn-red btn-sm" style="margin-top:10px;width:100%"
          onclick="triggerSOS('keyword')">
          🚨 Trigger SOS
        </button>` : ''}
    </div>`;
}

function _renderTemplateReport(out, event, userName, duration) {
  const summary = `Emergency SOS triggered by ${userName} via ${event.method.replace('_',' ')} ` +
    `on ${event.time.toLocaleString()} at coordinates ${event.location}. ` +
    `The incident lasted ${duration} with a risk level of ${event.riskLevel?.toUpperCase() || 'UNKNOWN'}. ` +
    `Event status: ${event.status?.toUpperCase()}.`;

  out.innerHTML = _buildReportCard(summary, 'Template (AI unavailable)');
}

function _buildReportCard(summary, generatedBy) {
  return `
    <div style="background:linear-gradient(135deg,rgba(124,92,252,.08),rgba(60,52,137,.04));
                border:1px solid rgba(124,92,252,.2);border-radius:10px;padding:16px;
                font-size:13px;line-height:1.7;margin-top:10px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;
                  color:var(--purple-lt);margin-bottom:10px;font-weight:600">
        ✨ AI Incident Report
      </div>
      ${summary}
      <div style="margin-top:12px;font-size:11px;color:var(--text3)">
        Generated by ${generatedBy} · ${new Date().toLocaleString()}
      </div>
    </div>`;
}
