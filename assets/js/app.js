// ── app.js ────────────────────────────────────────────────────────────────────
// Bootstrap: init all modules, clock, navigation, SOS updates

// ── Clock ─────────────────────────────────────────────────────────────────────
function startClock() {
  function tick() {
    const el = document.getElementById('clock');
    if (el) el.textContent = new Date().toLocaleTimeString();
  }
  tick();
  setInterval(tick, 1000);
}

// ── View navigation ───────────────────────────────────────────────────────────
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const target = document.getElementById(`view-${viewId}`);
  if (target) target.classList.add('active');

  // Highlight correct nav button
  const navMap = { home: 0, tracking: 1, ai: 2, contacts: 3, history: 4, settings: 5 };
  const navBtns = document.querySelectorAll('.nav-btn');
  const idx = navMap[viewId];
  if (idx !== undefined && navBtns[idx]) navBtns[idx].classList.add('active');

  // Map needs invalidation when it becomes visible
  if (viewId === 'tracking') {
    invalidateMap && invalidateMap();
    initMap && initMap();
  }
  if (viewId === 'contacts') renderContacts && renderContacts();
  if (viewId === 'history')  renderHistory  && renderHistory();
}

// ── Log event to activity feed ────────────────────────────────────────────────
function logEvent(msg) {
  const feed = document.getElementById('event-log');
  if (!feed) return;

  // Remove placeholder
  const ph = feed.querySelector('.log-placeholder');
  if (ph) ph.remove();

  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML = `
    <span class="log-time">${new Date().toLocaleTimeString()}</span>
    <span class="log-msg">${msg}</span>
  `;
  feed.prepend(item);

  // Cap at 50 entries
  while (feed.children.length > 50) feed.lastChild.remove();
}

// ── Settings persistence ──────────────────────────────────────────────────────
function saveSettings() {
  const name      = document.getElementById('user-name')?.value     || 'User';
  const countdown = document.getElementById('countdown-sec')?.value  || 3;
  const voice     = document.getElementById('voice-toggle')?.checked ?? true;
  const riskAlert = document.getElementById('risk-alert-toggle')?.checked ?? true;

  localStorage.setItem('safeguard_settings', JSON.stringify({ name, countdown, voice, riskAlert }));
  logEvent('⚙️ Settings saved');
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('safeguard_settings') || '{}');
    if (s.name)      document.getElementById('user-name').value = s.name;
    if (s.countdown) {
      const el = document.getElementById('countdown-sec');
      if (el) { el.value = s.countdown; document.getElementById('countdown-val').textContent = s.countdown + 's'; }
    }
    if (typeof s.voice     !== 'undefined') document.getElementById('voice-toggle').checked     = s.voice;
    if (typeof s.riskAlert !== 'undefined') document.getElementById('risk-alert-toggle').checked = s.riskAlert;
  } catch {}
}

// ── Inject activity-log styles ────────────────────────────────────────────────
(function injectAppStyles() {
  if (document.getElementById('app-base-styles')) return;
  const style = document.createElement('style');
  style.id = 'app-base-styles';
  style.textContent = `
    .log-item {
      display: flex; gap: 10px; font-size: 13px;
      padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
      animation: fadeSlide .3s ease;
    }
    .log-item:last-child { border-bottom: none; }
    .log-time { opacity: .45; white-space: nowrap; }
    .log-msg  { flex: 1; }
    @keyframes fadeSlide {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    #map { background: #1a1a2e; }
    .map-label { font-size: 13px; opacity: .7; margin-top: 8px; }
    .map-acc   { font-size: 12px; opacity: .45; margin-top: 2px; }
    .section-title { font-size: 16px; font-weight: 700; margin-bottom: 14px; }
    .placeholder-text { opacity: .5; font-size: 14px; padding: 8px 0; }
    .full-width { width: 100%; }
    .form-stack { display: flex; flex-direction: column; gap: 10px; }
    .form-stack input, .form-stack textarea {
      background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12);
      border-radius: 8px; padding: 10px 14px; color: inherit; font-size: 14px;
      outline: none; transition: border .2s;
    }
    .form-stack input:focus, .form-stack textarea:focus {
      border-color: rgba(232,39,26,.5);
    }
    .form-row { display: flex; gap: 10px; }
    .btn { cursor: pointer; border: none; border-radius: 8px; font-weight: 600; transition: .15s; }
    .btn-red   { background: #E8271A; color: #fff; padding: 10px 20px; }
    .btn-ghost { background: rgba(255,255,255,.08); color: inherit; padding: 8px 16px; }
    .btn-green { background: #16a34a; color: #fff; padding: 8px 16px; }
    .btn-purple{ background: #7c3aed; color: #fff; padding: 8px 16px; }
    .btn-sm    { padding: 8px 14px; font-size: 13px; }
    .btn:hover { filter: brightness(1.15); }
  `;
  document.head.appendChild(style);
})();

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  loadSettings();
  renderContacts && renderContacts();
  renderHistory  && renderHistory();
  initMap        && initMap();
  startGPS       && startGPS();
  logEvent('🛡️ SafeGuard online');
});
