// ── app.js ────────────────────────────────────────────────────────────────────

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
  const target = document.getElementById('view-' + viewId);
  if (target) target.classList.add('active');
  const navMap = { home:0, tracking:1, ai:2, contacts:3, history:4, settings:5 };
  const navBtns = document.querySelectorAll('.nav-btn');
  const idx = navMap[viewId];
  if (idx !== undefined && navBtns[idx]) navBtns[idx].classList.add('active');
  if (viewId === 'tracking') { invalidateMap && invalidateMap(); initMap && initMap(); }
  if (viewId === 'contacts') renderContacts && renderContacts();
  if (viewId === 'history')  renderHistory  && renderHistory();
}

// ── Log event ─────────────────────────────────────────────────────────────────
function logEvent(msg) {
  const feed = document.getElementById('event-log');
  if (!feed) return;
  const ph = feed.querySelector('.log-placeholder');
  if (ph) ph.remove();
  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML = '<span class="log-time">' + new Date().toLocaleTimeString() + '</span>'
                 + '<span class="log-msg">' + msg + '</span>';
  feed.prepend(item);
  while (feed.children.length > 50) feed.lastChild.remove();
}

// ── Settings ──────────────────────────────────────────────────────────────────
function saveSettings() {
  const name      = document.getElementById('user-name')?.value    || 'User';
  const countdown = document.getElementById('countdown-sec')?.value || 3;
  const voice     = document.getElementById('voice-toggle')?.checked ?? true;
  const riskAlert = document.getElementById('risk-alert-toggle')?.checked ?? true;
  localStorage.setItem('safeguard_settings', JSON.stringify({ name, countdown, voice, riskAlert }));
  logEvent('⚙️ Settings saved');
  showToast && showToast('Settings saved', 'success');
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('safeguard_settings') || '{}');
    if (s.name) { const el = document.getElementById('user-name'); if(el) el.value = s.name; }
    if (s.countdown) {
      const el = document.getElementById('countdown-sec');
      if (el) { el.value = s.countdown; document.getElementById('countdown-val').textContent = s.countdown + 's'; }
    }
    if (typeof s.voice     !== 'undefined') { const el = document.getElementById('voice-toggle');      if(el) el.checked = s.voice; }
    if (typeof s.riskAlert !== 'undefined') { const el = document.getElementById('risk-alert-toggle'); if(el) el.checked = s.riskAlert; }
  } catch {}
}

// ── Permission system ─────────────────────────────────────────────────────────
// Tracks state across async flows
let _locGranted = false;
let _micGranted = false;

function showPermissionModal() {
  // Build overlay
  const overlay = document.createElement('div');
  overlay.id = 'perm-overlay';
  overlay.innerHTML = `
    <div id="perm-modal">
      <div class="perm-shield">🛡️</div>
      <div class="perm-title">SafeGuard needs permissions</div>
      <div class="perm-desc">These are required for the app to protect you.</div>

      <div class="perm-item" id="perm-loc-row">
        <div class="perm-item-icon">📍</div>
        <div class="perm-item-body">
          <div class="perm-item-title">Location Access</div>
          <div class="perm-item-sub">Live map, SOS broadcast, risk assessment</div>
        </div>
        <div class="perm-badge perm-waiting" id="perm-loc-badge">Waiting</div>
      </div>

      <div class="perm-item" id="perm-mic-row">
        <div class="perm-item-icon">🎙️</div>
        <div class="perm-item-body">
          <div class="perm-item-title">Microphone Access</div>
          <div class="perm-item-sub">Voice SOS trigger, audio threat detection</div>
        </div>
        <div class="perm-badge perm-waiting" id="perm-mic-badge">Waiting</div>
      </div>

      <div id="perm-denied-msg" class="perm-denied-msg" style="display:none"></div>

      <button id="perm-allow-btn" class="perm-allow-btn" onclick="grantPermissions()">
        Allow Access
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  // Check if already granted and act immediately
  checkPermStates();
}

async function checkPermStates() {
  let locState = 'prompt', micState = 'prompt';

  try {
    const r = await navigator.permissions.query({ name: 'geolocation' });
    locState = r.state;
    r.onchange = () => { locState = r.state; handlePermChange('loc', r.state); };
  } catch {}

  try {
    const r = await navigator.permissions.query({ name: 'microphone' });
    micState = r.state;
    r.onchange = () => { micState = r.state; handlePermChange('mic', r.state); };
  } catch {}

  setPermBadge('loc', locState);
  setPermBadge('mic', micState);

  // Already granted — start everything, dismiss after short delay
  if (locState === 'granted') { _locGranted = true; startGPS(); }
  if (micState === 'granted') { _micGranted = true; }

  if (locState === 'granted' && micState === 'granted') {
    setTimeout(dismissPermModal, 600);
    return;
  }

  // Previously denied — show instructions, no button
  if (locState === 'denied' || micState === 'denied') {
    showDeniedInstructions(locState === 'denied', micState === 'denied');
    return;
  }

  // Needs prompt — auto-request immediately (no extra button click needed)
  // Small timeout so the modal renders visually first
  setTimeout(grantPermissions, 400);
}

async function grantPermissions() {
  const btn = document.getElementById('perm-allow-btn');
  if (btn) { btn.textContent = 'Requesting…'; btn.disabled = true; }

  // Location
  await new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        _locGranted = true;
        setPermBadge('loc', 'granted');
        logEvent('📍 Location granted');
        startGPS();
        resolve();
      },
      err => {
        setPermBadge('loc', err.code === 1 ? 'denied' : 'prompt');
        if (err.code === 1) {
          logEvent('❌ Location denied');
          updateLocStatus('❌ Location denied');
        }
        resolve();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });

  // Microphone — small gap so browser doesn't stack two prompts
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop()); // release test stream
    _micGranted = true;
    setPermBadge('mic', 'granted');
    logEvent('🎙️ Microphone granted');
  } catch (err) {
    _micGranted = false;
    setPermBadge('mic', 'denied');
    logEvent('❌ Microphone denied');
    disableMicUI();
  }

  // Show denied instructions if anything failed
  const locDenied = document.getElementById('perm-loc-badge')?.classList.contains('perm-denied');
  const micDenied = document.getElementById('perm-mic-badge')?.classList.contains('perm-denied');

  if (locDenied || micDenied) {
    showDeniedInstructions(locDenied, micDenied);
    // Allow dismiss after showing instructions
    const btn2 = document.getElementById('perm-allow-btn');
    if (btn2) {
      btn2.textContent = 'Continue anyway';
      btn2.disabled = false;
      btn2.onclick = dismissPermModal;
    }
    return;
  }

  // All good
  setTimeout(dismissPermModal, 700);
}

function handlePermChange(type, state) {
  setPermBadge(type, state);
  if (type === 'loc' && state === 'granted' && !_locGranted) {
    _locGranted = true;
    startGPS();
    logEvent('📍 Location re-granted');
  }
  if (type === 'mic' && state === 'granted') {
    _micGranted = true;
    enableMicUI();
    logEvent('🎙️ Microphone re-granted');
  }
}

function setPermBadge(type, state) {
  const badge = document.getElementById('perm-' + type + '-badge');
  const row   = document.getElementById('perm-' + type + '-row');
  if (!badge) return;

  badge.className = 'perm-badge';
  if (state === 'granted') {
    badge.classList.add('perm-granted');
    badge.textContent = '✅ Granted';
    if (row) row.style.borderColor = 'rgba(34,197,94,.4)';
  } else if (state === 'denied') {
    badge.classList.add('perm-denied');
    badge.textContent = '❌ Denied';
    if (row) row.style.borderColor = 'rgba(232,39,26,.4)';
  } else {
    badge.classList.add('perm-waiting');
    badge.textContent = '⏳ Waiting';
  }
}

function showDeniedInstructions(locDenied, micDenied) {
  const msg = document.getElementById('perm-denied-msg');
  if (!msg) return;

  const isChrome  = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
  const isFirefox = /Firefox/.test(navigator.userAgent);
  const isSafari  = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  let fix = '';
  if (isChrome)  fix = 'Click the 🔒 lock icon in the address bar → Site settings → Allow';
  if (isFirefox) fix = 'Click the 🔒 lock icon → Permissions → Allow';
  if (isSafari)  fix = 'Safari → Settings for this Website → Allow';
  if (!fix)      fix = 'Open browser settings → Site permissions → Allow for this site';

  const denied = [locDenied && 'Location', micDenied && 'Microphone'].filter(Boolean).join(' & ');
  msg.style.display = 'block';
  msg.innerHTML = `<strong>⚠️ ${denied} blocked</strong><br>${fix}<br>Then refresh the page.`;

  const btn = document.getElementById('perm-allow-btn');
  if (btn) {
    btn.textContent = 'Continue with limited access';
    btn.disabled = false;
    btn.onclick = dismissPermModal;
  }
}

function disableMicUI() {
  const btn = document.getElementById('mic-btn');
  if (!btn) return;
  btn.textContent = '🚫 Microphone blocked';
  btn.disabled = true;
  btn.style.opacity = '0.4';
  btn.title = 'Allow microphone in browser settings and refresh';
}

function enableMicUI() {
  const btn = document.getElementById('mic-btn');
  if (!btn) return;
  btn.textContent = '🎙️ Start Monitoring';
  btn.disabled = false;
  btn.style.opacity = '1';
}

function dismissPermModal() {
  const overlay = document.getElementById('perm-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity .25s';
    setTimeout(() => overlay.remove(), 260);
  }
  renderContacts   && renderContacts();
  renderHistory    && renderHistory();
  startRiskRefresh && startRiskRefresh();
}

// Expose for manual retry button
window.grantPermissions = grantPermissions;

// ── Permission modal styles ────────────────────────────────────────────────────
(function injectPermStyles() {
  if (document.getElementById('perm-styles')) return;
  const s = document.createElement('style');
  s.id = 'perm-styles';
  s.textContent = `
    #perm-overlay {
      position:fixed;inset:0;z-index:10000;
      background:rgba(0,0,0,.88);backdrop-filter:blur(10px);
      display:flex;align-items:center;justify-content:center;padding:20px;
    }
    #perm-modal {
      background:#111118;border:1px solid rgba(255,255,255,.1);
      border-radius:22px;padding:36px 28px;max-width:400px;width:100%;
      text-align:center;box-shadow:0 24px 80px rgba(0,0,0,.7);
    }
    .perm-shield { font-size:52px; margin-bottom:14px; }
    .perm-title  { font-size:19px;font-weight:800;margin-bottom:6px; }
    .perm-desc   { font-size:13px;opacity:.55;margin-bottom:22px; }
    .perm-item {
      display:flex;align-items:center;gap:14px;text-align:left;
      background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);
      border-radius:14px;padding:16px;margin-bottom:12px;transition:border-color .3s;
    }
    .perm-item-icon  { font-size:26px;flex-shrink:0; }
    .perm-item-body  { flex:1; }
    .perm-item-title { font-weight:700;font-size:14px;margin-bottom:3px; }
    .perm-item-sub   { font-size:12px;opacity:.5; }
    .perm-badge      { font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap; }
    .perm-waiting    { background:rgba(245,158,11,.15);color:#f59e0b; }
    .perm-granted    { background:rgba(34,197,94,.15); color:#22c55e; }
    .perm-denied     { background:rgba(232,39,26,.15); color:#E8271A; }
    .perm-denied-msg {
      background:rgba(232,39,26,.08);border:1px solid rgba(232,39,26,.2);
      border-radius:10px;padding:12px;font-size:12px;line-height:1.6;
      text-align:left;margin-bottom:14px;color:#ffb3b0;
    }
    .perm-allow-btn {
      width:100%;margin-top:6px;padding:15px;
      background:#E8271A;color:#fff;border:none;border-radius:14px;
      font-size:15px;font-weight:700;cursor:pointer;letter-spacing:.02em;
      transition:filter .15s;
    }
    .perm-allow-btn:hover:not(:disabled) { filter:brightness(1.15); }
    .perm-allow-btn:disabled { opacity:.5;cursor:not-allowed; }
    .log-item {
      display:flex;gap:10px;font-size:13px;
      padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);
      animation:fadeSlide .25s ease;
    }
    .log-item:last-child { border-bottom:none; }
    .log-time { opacity:.4;white-space:nowrap; }
    .log-msg  { flex:1; }
    @keyframes fadeSlide {
      from{opacity:0;transform:translateY(-5px);}
      to  {opacity:1;transform:translateY(0);}
    }
  `;
  document.head.appendChild(s);
})();

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  loadSettings();
  initMap();
  showPermissionModal();
  logEvent('🛡️ SafeGuard online');
});

// ── Exports ───────────────────────────────────────────────────────────────────
window.logEvent         = logEvent;
window.showView         = showView;
window.saveSettings     = saveSettings;
window.dismissPermModal = dismissPermModal;
window.disableMicUI     = disableMicUI;
window.enableMicUI      = enableMicUI;
