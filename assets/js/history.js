// ── history.js ────────────────────────────────────────────────────────────────
// Incident History: localStorage + Firebase persistence, render, export, clear

const HISTORY_KEY = 'safeguard_history';

// ── Load history ─────────────────────────────────────────────────────────────
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

// ── Save history ──────────────────────────────────────────────────────────────
function persistHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// ── Add a new incident ────────────────────────────────────────────────────────
function saveIncident(incident) {
  // incident = { type, timestamp, lat, lng, address, notes, riskScore }
  const history = loadHistory();
  const entry = {
    id: Date.now(),
    type:      incident.type      || 'SOS',
    timestamp: incident.timestamp || new Date().toISOString(),
    lat:       incident.lat       || null,
    lng:       incident.lng       || null,
    address:   incident.address   || 'Unknown location',
    notes:     incident.notes     || '',
    riskScore: incident.riskScore || 0,
    resolved:  incident.resolved  || false,
  };
  history.unshift(entry); // newest first
  persistHistory(history);

  // Sync to Firebase
  if (window.db && window.addDoc && window.collection) {
    try {
      window.addDoc(window.collection(window.db, 'incidents'), entry)
        .catch(() => {}); // graceful offline
    } catch (_) {}
  }

  renderHistory();
  const countEl = document.getElementById('sos-count');
  if (countEl) countEl.textContent = history.filter(h => h.type === 'SOS').length;

  return entry;
}

// ── Mark incident as resolved ─────────────────────────────────────────────────
function resolveIncident(id) {
  const history = loadHistory();
  const idx = history.findIndex(h => h.id === id);
  if (idx !== -1) {
    history[idx].resolved = true;
    history[idx].resolvedAt = new Date().toISOString();
    persistHistory(history);
    renderHistory();
  }
}

// ── Render history list ───────────────────────────────────────────────────────
function renderHistory() {
  const history = loadHistory();
  const list = document.getElementById('history-list');
  if (!list) return;

  if (history.length === 0) {
    list.innerHTML = `<div class="placeholder-text">No incidents recorded yet.</div>`;
    return;
  }

  list.innerHTML = `
    <div class="history-toolbar">
      <span class="history-count">${history.length} incident${history.length !== 1 ? 's' : ''}</span>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-xs" onclick="exportHistory()">📤 Export</button>
        <button class="btn btn-ghost btn-xs danger" onclick="clearHistory()">🗑️ Clear</button>
      </div>
    </div>
    ${history.map(h => renderHistoryItem(h)).join('')}
  `;
}

function renderHistoryItem(h) {
  const d = new Date(h.timestamp);
  const dateStr = d.toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' });
  const timeStr = d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
  const riskColor = h.riskScore >= 70 ? '#E8271A' : h.riskScore >= 40 ? '#f59e0b' : '#22c55e';
  const icon = typeIcon(h.type);
  const statusBadge = h.resolved
    ? `<span class="hist-badge resolved">✅ Resolved</span>`
    : `<span class="hist-badge active">🚨 Active</span>`;

  const mapLink = (h.lat && h.lng)
    ? `<a class="hist-map-link" href="https://maps.google.com/?q=${h.lat},${h.lng}" target="_blank" rel="noopener">📍 View on map</a>`
    : '';

  return `
    <div class="hist-item ${h.resolved ? 'hist-resolved' : ''}">
      <div class="hist-icon">${icon}</div>
      <div class="hist-body">
        <div class="hist-header">
          <span class="hist-type">${h.type}</span>
          ${statusBadge}
          <span class="hist-risk" style="color:${riskColor}">Risk: ${h.riskScore}%</span>
        </div>
        <div class="hist-addr">${escHtml2(h.address)}</div>
        ${h.notes ? `<div class="hist-notes">${escHtml2(h.notes)}</div>` : ''}
        <div class="hist-meta">
          <span>📅 ${dateStr}</span>
          <span>🕐 ${timeStr}</span>
          ${mapLink}
        </div>
      </div>
      ${!h.resolved ? `<button class="btn btn-ghost btn-xs" onclick="resolveIncident(${h.id})">Mark Safe</button>` : ''}
    </div>
  `;
}

// ── Export as JSON download ───────────────────────────────────────────────────
function exportHistory() {
  const history = loadHistory();
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `safeguard-history-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Clear all history ─────────────────────────────────────────────────────────
function clearHistory() {
  if (!confirm('Clear all incident history? This cannot be undone.')) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  const countEl = document.getElementById('sos-count');
  if (countEl) countEl.textContent = '0';
  if (typeof logEvent === 'function') logEvent('🗑️ Incident history cleared');
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function typeIcon(type) {
  const icons = { SOS:'🚨', AUDIO:'🎙️', RISK:'⚠️', MANUAL:'👆', AUTO:'🤖' };
  return icons[type] || '📋';
}

function escHtml2(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Inline CSS ────────────────────────────────────────────────────────────────
(function injectHistoryStyles() {
  if (document.getElementById('history-styles')) return;
  const style = document.createElement('style');
  style.id = 'history-styles';
  style.textContent = `
    .history-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 12px; padding-bottom: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .history-count { font-size: 13px; opacity: .6; }
    .hist-item {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .hist-item:last-child { border-bottom: none; }
    .hist-item.hist-resolved { opacity: .6; }
    .hist-icon { font-size: 24px; flex-shrink: 0; padding-top: 2px; }
    .hist-body { flex: 1; min-width: 0; }
    .hist-header { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 4px; }
    .hist-type { font-weight: 700; font-size: 14px; }
    .hist-badge { font-size: 11px; padding: 2px 8px; border-radius: 20px; font-weight: 600; }
    .hist-badge.active   { background: rgba(232,39,26,.15); color: #E8271A; }
    .hist-badge.resolved { background: rgba(34,197,94,.12); color: #22c55e; }
    .hist-risk { font-size: 12px; font-weight: 600; margin-left: auto; }
    .hist-addr { font-size: 13px; opacity: .8; margin-bottom: 4px; }
    .hist-notes { font-size: 12px; opacity: .6; font-style: italic; margin-bottom: 4px; }
    .hist-meta { display: flex; gap: 12px; font-size: 12px; opacity: .5; flex-wrap: wrap; }
    .hist-map-link { color: #60a5fa; text-decoration: none; }
    .hist-map-link:hover { text-decoration: underline; }
    .placeholder-text { opacity: .5; font-size: 14px; padding: 12px 0; }
  `;
  document.head.appendChild(style);
})();

// ── Export ────────────────────────────────────────────────────────────────────
window.saveIncident    = saveIncident;
window.resolveIncident = resolveIncident;
window.renderHistory   = renderHistory;
window.exportHistory   = exportHistory;
window.clearHistory    = clearHistory;
window.loadHistory     = loadHistory;
