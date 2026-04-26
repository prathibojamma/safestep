const STATUS_STYLES = {
  active:   { bg: 'rgba(232,39,26,.15)',  icon: '🔴' },
  resolved: { bg: 'rgba(14,201,91,.15)',  icon: '✅' },
  false_alarm: { bg: 'rgba(245,181,10,.15)', icon: '🟡' },
};

/** Render the full history timeline */
function renderHistory() {
  const el = document.getElementById('history-list');

  if (!state.history.length) {
    el.innerHTML = `
      <div class="placeholder-center">
        No incidents yet.<br>Your SOS events will appear here.
      </div>`;
    return;
  }

  el.innerHTML = state.history.map(event => {
    const style   = STATUS_STYLES[event.status] || STATUS_STYLES.active;
    const method  = event.method.replace(/_/g, ' ').toUpperCase();
    const dateStr = event.time.toLocaleString();
    const dur     = event.duration ? ` · Duration: ${formatDuration(event.duration)}` : '';
    const risk    = event.riskLevel ? ` · Risk: ${event.riskLevel.toUpperCase()}` : '';

    return `
      <div class="timeline-item">
        <div class="t-dot" style="background:${style.bg}">
          ${style.icon}
        </div>
        <div class="t-content">
          <div class="t-title">SOS — ${method}</div>
          <div class="t-meta">${dateStr}${risk} · ${event.status.toUpperCase()}</div>
          <div class="t-body">📍 ${event.location}${dur}</div>
        </div>
      </div>`;
  }).join('');
}
