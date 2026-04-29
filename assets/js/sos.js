// ── sos.js ────────────────────────────────────────────────────────────────────
// SOS: hold-to-trigger countdown, active state, SMS notify, resolve

let _holdTimer    = null;
let _arcInterval  = null;
let _sosElapsed   = 0;
let _sosElInterval = null;

// ── Hold start ────────────────────────────────────────────────────────────────
function startSOSHold(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  if (state.sosActive) return;

  const countdownSec = parseInt(document.getElementById('countdown-sec')?.value || '3', 10);

  // Immediate SOS if countdown = 0
  if (countdownSec === 0) { triggerSOS('manual'); return; }

  vibrate && vibrate(40);

  const arc         = document.getElementById('countdown-arc');
  const label       = document.getElementById('sos-label');
  const hint        = document.getElementById('sos-hint');
  const circumference = 578; // 2π × 92
  let elapsed = 0;
  const tickMs = 40;
  const totalTicks = (countdownSec * 1000) / tickMs;

  if (arc) arc.style.strokeDashoffset = String(circumference);

  _arcInterval = setInterval(() => {
    elapsed++;
    const progress = elapsed / totalTicks;
    const remaining = Math.ceil(countdownSec - (elapsed * tickMs / 1000));

    if (arc)   arc.style.strokeDashoffset = String(circumference * (1 - progress));
    if (label) label.textContent = remaining > 0 ? String(remaining) : '🚨';
    if (hint)  hint.textContent  = 'KEEP HOLDING…';

    if (elapsed >= totalTicks) {
      clearInterval(_arcInterval);
      _arcInterval = null;
      triggerSOS('manual');
    }
  }, tickMs);
}

// ── Hold cancel (finger lifted before timer ends) ────────────────────────────
function cancelSOSHold() {
  if (_arcInterval) { clearInterval(_arcInterval); _arcInterval = null; }
  if (_holdTimer)   { clearTimeout(_holdTimer);    _holdTimer   = null; }

  if (!state.sosActive) {
    const arc   = document.getElementById('countdown-arc');
    const label = document.getElementById('sos-label');
    const hint  = document.getElementById('sos-hint');
    if (arc)   arc.style.strokeDashoffset = '578';
    if (label) label.textContent = 'SOS';
    if (hint)  hint.textContent  = 'HOLD TO TRIGGER';
  }
}

// ── Trigger SOS ───────────────────────────────────────────────────────────────
function triggerSOS(source) {
  if (state.sosActive) return;
  source = source || 'manual';

  state.sosActive    = true;
  state.sosStartTime = Date.now();

  vibrate && vibrate([300, 100, 300, 100, 600]);

  // Banner
  const banner = document.getElementById('sos-banner');
  if (banner) banner.classList.add('active');

  // Active bar in tracking view
  const bar = document.getElementById('sos-active-bar');
  if (bar) bar.style.display = 'block';

  // SOS button
  const btn   = document.getElementById('sos-btn');
  const label = document.getElementById('sos-label');
  const hint  = document.getElementById('sos-hint');
  const arc   = document.getElementById('countdown-arc');
  if (btn)   btn.classList.add('sos-triggered');
  if (label) label.textContent = '🚨';
  if (hint)  hint.textContent  = 'SOS ACTIVE';
  if (arc)   arc.style.strokeDashoffset = '0';

  // SOS elapsed timer
  _sosElapsed = 0;
  _sosElInterval = setInterval(() => {
    _sosElapsed++;
    const timerEl = document.getElementById('sos-timer');
    if (timerEl) timerEl.textContent = formatDuration(_sosElapsed);
  }, 1000);

  // Current position
  const pos  = (window.state && state.position) || {};
  const lat  = pos.lat   || null;
  const lng  = pos.lng   || null;
  const addr = pos.address || 'Unknown location';

  // Drop SOS pin on map
  if (lat && lng) placeSosMarker && placeSosMarker(lat, lng, new Date().toLocaleString());

  // Save incident to history
  saveIncident && saveIncident({
    type: 'SOS', lat, lng, address: addr,
    riskScore: (window.state && state.riskScore) || 0,
    notes: 'Triggered via ' + source,
  });

  // Update SOS count badge
  const countEl = document.getElementById('sos-count');
  if (countEl) countEl.textContent = String(parseInt(countEl.textContent || '0', 10) + 1);

  logEvent && logEvent('🚨 SOS ACTIVE · source: ' + source + ' · ' + addr);
  showToast && showToast('🚨 SOS active — contacts notified', 'error', 8000);

  // Notify contacts via SMS
  notifyContacts(lat, lng, addr);

  // Switch to tracking view so user sees live map
  showView && showView('tracking');
}

// ── SMS contacts ──────────────────────────────────────────────────────────────
function notifyContacts(lat, lng, addr) {
  const contacts = getEmergencyContacts ? getEmergencyContacts() : [];
  if (!contacts.length) {
    logEvent && logEvent('⚠️ No emergency contacts — add some in Contacts tab');
    showToast && showToast('Add emergency contacts for SMS alerts', 'warning', 6000);
    return;
  }

  const name     = document.getElementById('user-name')?.value || 'Someone';
  const mapsLink = (lat && lng) ? ' Map: https://maps.google.com/?q=' + lat + ',' + lng : '';
  const body     = encodeURIComponent(
    '🚨 EMERGENCY from SafeGuard!\n'
    + name + ' triggered an SOS alert.\n'
    + (addr ? 'Location: ' + addr : '')
    + mapsLink
  );

  contacts.forEach((c, i) => {
    setTimeout(() => {
      const a    = document.createElement('a');
      a.href     = 'sms:' + encodeURIComponent(c.phone) + '?body=' + body;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 1500);
    }, i * 1200);
  });

  logEvent && logEvent('📱 SMS queued for ' + contacts.length + ' contact(s)');
}

// ── Resolve SOS ───────────────────────────────────────────────────────────────
function resolveSOS() {
  if (!state.sosActive) return;

  state.sosActive = false;
  if (_sosElInterval) { clearInterval(_sosElInterval); _sosElInterval = null; }

  const banner = document.getElementById('sos-banner');
  if (banner) banner.classList.remove('active');
  const bar = document.getElementById('sos-active-bar');
  if (bar) bar.style.display = 'none';

  const btn   = document.getElementById('sos-btn');
  const arc   = document.getElementById('countdown-arc');
  const label = document.getElementById('sos-label');
  const hint  = document.getElementById('sos-hint');
  if (btn)   btn.classList.remove('sos-triggered');
  if (arc)   arc.style.strokeDashoffset = '578';
  if (label) label.textContent = 'SOS';
  if (hint)  hint.textContent  = 'HOLD TO TRIGGER';

  // Mark latest active incident resolved
  const history = loadHistory ? loadHistory() : [];
  const latest  = history.find(h => h.type === 'SOS' && !h.resolved);
  if (latest) resolveIncident && resolveIncident(latest.id);

  logEvent  && logEvent('✅ SOS resolved — marked safe');
  showToast && showToast('✅ You are safe — SOS cancelled', 'success', 4000);
  vibrate   && vibrate([80, 50, 80]);
}

// ── Exports ───────────────────────────────────────────────────────────────────
window.startSOSHold  = startSOSHold;
window.cancelSOSHold = cancelSOSHold;
window.triggerSOS    = triggerSOS;
window.resolveSOS    = resolveSOS;
