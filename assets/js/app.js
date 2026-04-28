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
