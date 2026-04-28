// ── app.js ────────────────────────────────────────────────────────────────────
// Bootstrap: permission prompts, clock, navigation, settings

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

  const navMap = { home: 0, tracking: 1, ai: 2, contacts: 3, history: 4, settings: 5 };
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
  item.innerHTML = '<span class="log-time">' + new Date().toLocaleTimeString() + '</span><span class="log-msg">' + msg + '</span>';
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
  showToast('Settings saved', 'success');
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('safeguard_settings') || '{}');
    if (s.name) document.getElementById('user-name').value = s.name;
    if (s.countdown) {
      const el = document.getElementById('countdown-sec');
      if (el) { el.value = s.countdown; document.getElementById('countdown-val').textContent = s.countdown + 's'; }
    }
    if (typeof s.voice     !== 'undefined') document.getElementById('voice-toggle').checked     = s.voice;
    if (typeof s.riskAlert !== 'undefined') document.getElementById('risk-alert-toggle').checked = s.riskAlert;
  } catch {}
}

// ── Permission modal ──────────────────────────────────────────────────────────
function showPermissionModal() {
  const overlay = document.createElement('div');
  overlay.id = 'perm-overlay';
  overlay.innerHTML = `
    <div id="perm-modal">
      <div class="perm-icon">🛡️</div>
      <h2 class="perm-title">SafeGuard needs access</h2>
      <p class="perm-desc">To keep you safe, SafeGuard needs two permissions:</p>

      <div class="perm-item" id="perm-loc-row">
        <div class="perm-item-icon">📍</div>
        <div class="perm-item-body">
          <div class="perm-item-title">Location</div>
          <div class="perm-item-sub">Show your position on the live map and share it during SOS</div>
        </div>
        <div class="perm-status perm-waiting" id="perm-loc-status">⏳ Waiting</div>
      </div>

      <div class="perm-item" id="perm-mic-row">
        <div class="perm-item-icon">🎙️</div>
        <div class="perm-item-body">
          <div class="perm-item-title">Microphone</div>
          <div class="perm-item-sub">Detect distress words and trigger voice SOS automatically</div>
        </div>
        <div class="perm-status perm-waiting" id="perm-mic-status">⏳ Waiting</div>
      </div>

      <button id="perm-grant-btn" class="perm-btn" onclick="requestAllPermissions()">
        Allow Permissions
      </button>
      <button class="perm-skip" onclick="skipPermissions()">
        Skip for now (some features won't work)
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
  checkExistingPermissions();
}

async function checkExistingPermissions() {
  try {
    const locPerm = await navigator.permissions.query({ name: 'geolocation' });
    updatePermStatus('loc', locPerm.state);
    locPerm.onchange = () => updatePermStatus('loc', locPerm.state);
    // If already granted, start GPS right away
    if (locPerm.state === 'granted') { startGPS(); }
  } catch {}

  try {
    const micPerm = await navigator.permissions.query({ name: 'microphone' });
    updatePermStatus('mic', micPerm.state);
    micPerm.onchange = () => updatePermStatus('mic', micPerm.state);
  } catch {}
}

function updatePermStatus(type, state) {
  const el  = document.getElementById('perm-' + type + '-status');
  const row = document.getElementById('perm-' + type + '-row');
  if (!el) return;

  const map = {
    granted: { text: '✅ Granted', cls: 'perm-granted' },
    denied:  { text: '❌ Denied',  cls: 'perm-denied'  },
    prompt:  { text: '⏳ Waiting', cls: 'perm-waiting' },
  };
  const info = map[state] || map.prompt;
  el.textContent = info.text;
  el.className   = 'perm-status ' + info.cls;
  if (row) row.style.borderColor = state === 'granted' ? 'rgba(34,197,94,.35)' : state === 'denied' ? 'rgba(232,39,26,.35)' : '';

  // Auto-dismiss when both granted
  const locOk = document.getElementById('perm-loc-status')?.textContent.includes('✅');
  const micOk = document.getElementById('perm-mic-status')?.textContent.includes('✅');
  if (locOk && micOk) setTimeout(dismissPermModal, 900);
}

async function requestAllPermissions() {
  const btn = document.getElementById('perm-grant-btn');
  if (btn) { btn.textContent = 'Requesting…'; btn.disabled = true; }
  requestLocationPermission();
  setTimeout(requestMicPermission, 700);
}

function requestLocationPermission() {
  navigator.geolocation.getCurrentPosition(
    () => {
      updatePermStatus('loc', 'granted');
      logEvent('📍 Location access granted');
      startGPS();
    },
    (err) => {
      updatePermStatus('loc', err.code === 1 ? 'denied' : 'prompt');
      if (err.code === 1) {
        logEvent('⚠️ Location denied — click 🔒 in address bar to allow');
        updateLocStatus('❌ Location denied — check browser settings');
      }
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

async function requestMicPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    updatePermStatus('mic', 'granted');
    logEvent('🎙️ Microphone access granted');
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) micBtn.disabled = false;
  } catch {
    updatePermStatus('mic', 'denied');
    logEvent('⚠️ Microphone denied — click 🔒 in address bar to allow');
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) { micBtn.textContent = '🚫 Mic blocked'; micBtn.disabled = true; micBtn.style.opacity = '0.5'; }
  }
}

function skipPermissions() {
  localStorage.setItem('sg_perms_asked', 'skip');
  dismissPermModal();
  updateLocStatus('No location access');
  logEvent('⚠️ Permissions skipped — limited functionality');
}

function dismissPermModal() {
  const overlay = document.getElementById('perm-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity .3s ease';
    setTimeout(() => overlay.remove(), 320);
  }
  renderContacts   && renderContacts();
  renderHistory    && renderHistory();
  startRiskRefresh && startRiskRefresh();
}

// ── Permission modal + log styles ─────────────────────────────────────────────
(function injectPermStyles() {
  if (document.getElementById('perm-styles')) return;
  const s = document.createElement('style');
  s.id = 'perm-styles';
  s.textContent = `
    #perm-overlay {
      position:fixed;inset:0;z-index:10000;
      background:rgba(0,0,0,.85);backdrop-filter:blur(8px);
      display:flex;align-items:center;justify-content:center;padding:20px;
    }
    #perm-modal {
      background:#13131f;border:1px solid rgba(255,255,255,.1);
      border-radius:20px;padding:32px 28px;max-width:420px;width:100%;
      text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.6);
    }
    .perm-icon{font-size:48px;margin-bottom:12px;}
    .perm-title{font-size:20px;font-weight:800;margin:0 0 8px;}
    .perm-desc{font-size:14px;opacity:.6;margin:0 0 20px;}
    .perm-item{
      display:flex;align-items:center;gap:12px;text-align:left;
      background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
      border-radius:12px;padding:14px;margin-bottom:10px;
      transition:border-color .3s;
    }
    .perm-item-icon{font-size:24px;flex-shrink:0;}
    .perm-item-body{flex:1;}
    .perm-item-title{font-weight:700;font-size:14px;}
    .perm-item-sub{font-size:12px;opacity:.55;margin-top:2px;}
    .perm-status{font-size:12px;font-weight:600;white-space:nowrap;}
    .perm-granted{color:#22c55e;}
    .perm-denied{color:#E8271A;}
    .perm-waiting{color:#f59e0b;}
    .perm-btn{
      width:100%;margin-top:16px;padding:14px;
      background:#E8271A;color:#fff;border:none;border-radius:12px;
      font-size:15px;font-weight:700;cursor:pointer;transition:.15s;
    }
    .perm-btn:hover:not(:disabled){filter:brightness(1.15);}
    .perm-btn:disabled{opacity:.6;cursor:not-allowed;}
    .perm-skip{
      display:block;width:100%;margin-top:10px;padding:10px;
      background:transparent;border:none;color:inherit;
      opacity:.4;font-size:13px;cursor:pointer;
    }
    .perm-skip:hover{opacity:.7;}
    .log-item{
      display:flex;gap:10px;font-size:13px;
      padding:6px 0;border-bottom:1px solid rgba(255,255,255,.04);
      animation:fadeSlide .3s ease;
    }
    .log-item:last-child{border-bottom:none;}
    .log-time{opacity:.45;white-space:nowrap;}
    .log-msg{flex:1;}
    @keyframes fadeSlide{
      from{opacity:0;transform:translateY(-6px);}
      to{opacity:1;transform:translateY(0);}
    }
  `;
  document.head.appendChild(s);
})();

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  startClock();
  loadSettings();
  initMap();              // render map container immediately (world view)
  showPermissionModal();  // ask for GPS + mic before anything else
  logEvent('🛡️ SafeGuard online');
});
