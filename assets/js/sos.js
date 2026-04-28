// ── sos.js ────────────────────────────────────────────────────────────────────
// SOS: hold-to-trigger with countdown, active SOS state, timer, resolve

let _holdTimer    = null;
let _holdStart    = null;
let _arcInterval  = null;
let _sosElapsed   = 0;
let _sosElInterval = null;

// ── Hold start ────────────────────────────────────────────────────────────────
function startSOSHold(e) {
  if (e) e.preventDefault();
  if (state.sosActive) return;

  const countdownSec = parseInt(document.getElementById('countdown-sec')?.value || '3', 10);
  if (countdownSec === 0) { triggerSOS('manual'); return; }

  _holdStart = Date.now();
  vibrate(50);

  // Animate the SVG arc
  const arc = document.getElementById('countdown-arc');
  const circumference = 578; // 2π × 92
  let elapsed = 0;
  const step = 50; // ms
  const steps = (countdownSec * 1000) / step;

  _arcInterval = setInterval(() => {
    elapsed++;
    const progress = elapsed / steps;
    if (arc) arc.style.strokeDashoffset = circumference * (1 - progress);

    const label = document.getElementById('sos-label');
    const hint  = document.getElementById('sos-hint');
    if (label) label.textContent = Math.ceil(countdownSec - (elapsed * step / 1000));
    if (hint)  hint.textContent  = 'KEEP HOLDING…';

    if (elapsed >= steps) {
      clearInterval(_arcInterval);
      triggerSOS('manual');
    }
  }, step);

  _holdTimer = setTimeout(() => {}, countdownSec * 1000);
}

// ── Hold cancel ───────────────────────────────────────────────────────────────
function cancelSOSHold() {
  if (_arcInterval) clearInterval(_arcInterval);
  if (_holdTimer)   clearTimeout(_holdTimer);
  _arcInterval = null;
  _holdTimer   = null;

  if (!state.sosActive) {
    // Reset arc and label
    const arc = document.getElementById('countdown-arc');
    if (arc) arc.style.strokeDashoffset = '578';
    const label = document.getElementById('sos-label');
    const hint  = document.getElementById('sos-hint');
    if (label) label.textContent = 'SOS';
    if (hint)  hint.textContent  = 'HOLD TO TRIGGER';
  }
}

// ── Trigger SOS ───────────────────────────────────────────────────────────────
function triggerSOS(source) {
  if (state.sosActive) return;

  state.sosActive    = true;
  state.sosStartTime = Date.now();
  source = source || 'manual';

  vibrate([300, 100, 300, 100, 300]);

  // Banner
  const banner = document.getElementById('sos-banner');
  if (banner) banner.classList.add('active');

  // Active bar in tracking view
  const bar = document.getElementById('sos-active-bar');
  if (bar) bar.style.display = 'block';

  // SOS button style
  const btn = document.getElementById('sos-btn');
  if (btn) btn.classList.add('sos-triggered');

  const label = document.getElementById('sos-label');
  const hint  = document.getElementById('sos-hint');
  if (label) label.textContent = '🚨';
  if (hint)  hint.textContent  = 'SOS ACTIVE';

  // Start elapsed timer
  _sosElapsed = 0;
  _sosElInterval = setInterval(() => {
    _sosElapsed++;
    const timerEl = document.getElementById('sos-timer');
    if (timerEl) timerEl.textContent = formatDuration(_sosElapsed);
  }, 1000);

  // Get current position
  const pos = state.position || {};
  const lat  = pos.lat  || null;
  const lng  = pos.lng  || null;
  const addr = pos.address || 'Unknown location';

  // Drop map marker
  if (lat && lng) placeSosMarker && placeSosMarker(lat, lng, new Date().toLocaleString());

  // Save to incident history
  const incident = saveIncident && saveIncident({
    type:      'SOS',
    lat, lng, address: addr,
    riskScore: state.riskScore || 0,
    notes:     `Triggered via ${source}`,
  });

  logEvent(`🚨 SOS TRIGGERED (${source}) — ${addr}`);
  showToast('🚨 SOS ACTIVE — Contacts notified', 'error', 8000);

  // SMS all emergency contacts via sms: links (browser fallback)
  notifyContacts(lat, lng, addr);

  // Navigate to tracking view to show live map
  showView('tracking');
}

// ── Notify contacts via SMS link ──────────────────────────────────────────────
function notifyContacts(lat, lng, addr) {
  const contacts = getEmergencyContacts ? getEmergencyContacts() : [];
  if (contacts.length === 0) {
    logEvent('⚠️ No emergency contacts to notify');
    return;
  }

  const mapsLink = (lat && lng) ? `https://maps.google.com/?q=${lat},${lng}` : '';
  const msg = encodeURIComponent(
    `🚨 EMERGENCY ALERT from SafeGuard!\n` +
    `${document.getElementById('user-name')?.value || 'Someone'} has triggered an SOS.\n` +
    (addr ? `Location: ${addr}\n` : '') +
    (mapsLink ? `Map: ${mapsLink}` : '')
  );

  contacts.forEach((c, i) => {
    // Open SMS links sequentially with small delay
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = `sms:${encodeURIComponent(c.phone)}?body=${msg}`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 1000);
    }, i * 1500);
  });

  logEvent(`📱 SMS alert queued for ${contacts.length} contact(s)`);
}

// ── Resolve SOS ───────────────────────────────────────────────────────────────
function resolveSOS() {
  if (!state.sosActive) return;

  state.sosActive = false;
  clearInterval(_sosElInterval);

  // Hide banner & bar
  const banner = document.getElementById('sos-banner');
  if (banner) banner.classList.remove('active');
  const bar = document.getElementById('sos-active-bar');
  if (bar) bar.style.display = 'none';

  // Reset button
  const btn = document.getElementById('sos-btn');
  if (btn) btn.classList.remove('sos-triggered');
  const arc = document.getElementById('countdown-arc');
  if (arc) arc.style.strokeDashoffset = '578';
  const label = document.getElementById('sos-label');
  const hint  = document.getElementById('sos-hint');
  if (label) label.textContent = 'SOS';
  if (hint)  hint.textContent  = 'HOLD TO TRIGGER';

  // Mark latest SOS incident resolved
  const history = loadHistory ? loadHistory() : [];
  const latest  = history.find(h => h.type === 'SOS' && !h.resolved);
  if (latest) resolveIncident && resolveIncident(latest.id);

  logEvent('✅ SOS resolved — marked safe');
  showToast('✅ You are marked safe', 'success', 4000);
  vibrate([100, 50, 100]);
}

// ── Voice SOS (placeholder — wired in audio.js) ───────────────────────────────
function triggerVoiceSOS() {
  triggerSOS('voice');
}

window.startSOSHold  = startSOSHold;
window.cancelSOSHold = cancelSOSHold;
window.triggerSOS    = triggerSOS;
window.resolveSOS    = resolveSOS;
window.triggerVoiceSOS = triggerVoiceSOS;
