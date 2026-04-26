/**
 * sos.js — SOS State Machine
 *
 * States: IDLE → COUNTDOWN → ACTIVE → RESOLVED
 *
 * Trigger methods:
 *   manual  — hold button
 *   voice   — voice command button
 *   keyword — AI audio detection
 */

// ── Hold-to-Trigger ───────────────────────────────────────────────────────────

function startSOSHold() {
  if (state.sosActive) { resolveSOS(); return; }

  let progress = 0;
  const totalMs = (state.countdownSec || 3) * 1000;
  const arc = document.getElementById('countdown-arc');
  const CIRCUMFERENCE = 578;

  state.holdInterval = setInterval(() => {
    progress += 50;
    const frac = progress / totalMs;
    arc.style.strokeDashoffset = CIRCUMFERENCE * (1 - frac);
    document.getElementById('sos-hint').textContent =
      `${Math.ceil((totalMs - progress) / 1000)}s — KEEP HOLDING`;

    if (progress >= totalMs) {
      clearInterval(state.holdInterval);
      state.holdInterval = null;
      arc.style.strokeDashoffset = 0;
      triggerSOS('manual');
    }
  }, 50);
}

function cancelSOSHold() {
  if (state.holdInterval) {
    clearInterval(state.holdInterval);
    state.holdInterval = null;
  }
  document.getElementById('countdown-arc').style.strokeDashoffset = '578';
  if (!state.sosActive) {
    document.getElementById('sos-hint').textContent = 'HOLD TO TRIGGER';
  }
}

// ── Trigger SOS ──────────────────────────────────────────────────────────────

function triggerSOS(method = 'manual') {
  if (state.sosActive) return;

  state.sosActive    = true;
  state.sosStartTime = Date.now();
  state.sosCount++;

  document.getElementById('sos-count').textContent = state.sosCount;

  // Button UI
  const btn = document.getElementById('sos-btn');
  btn.classList.add('active-sos');
  document.getElementById('sos-label').textContent = 'ACTIVE';
  document.getElementById('sos-hint').textContent  = 'TAP TO RESOLVE';

  // Banner + tracking bar
  document.getElementById('sos-banner').style.display      = 'block';
  document.getElementById('sos-active-bar').style.display  = 'block';
  document.getElementById('map-pulse-el').style.display    = 'block';

  // Elapsed timer
  state.sosTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - state.sosStartTime) / 1000);
    document.getElementById('sos-timer').textContent = formatTime(elapsed);
  }, 1000);

  // Logs
  addLog('sos-log', '🚨', 'SOS Triggered', `Method: ${method}`);
  addLog('sos-log', '📱', 'Contacts notified', 'SMS + Push via n8n dispatched');
  addLog('loc-log', '📍', 'Live GPS broadcasting', 'Real-time tracking active');

  // Per-contact notifications
  state.contacts.forEach(c =>
    addLog('sos-log', '👤', `Notifying ${c.name}`, c.phone || c.email || 'via app')
  );

  // Record in history
  state.history.unshift({
    id:        Date.now(),
    method,
    time:      new Date(),
    location:  state.coords
      ? `${state.coords.lat.toFixed(4)}, ${state.coords.lng.toFixed(4)}`
      : 'Unknown',
    riskLevel: state.riskLevel,
    status:    'active',
  });

  renderHistory();
  updateRiskScore();

  // Switch to tracking view
  showView('tracking');
}

// ── Resolve SOS ───────────────────────────────────────────────────────────────

function resolveSOS() {
  if (!state.sosActive) return;

  const duration = Math.floor((Date.now() - state.sosStartTime) / 1000);
  state.sosActive = false;

  clearInterval(state.sosTimerInterval);

  // Button UI
  const btn = document.getElementById('sos-btn');
  btn.classList.remove('active-sos');
  document.getElementById('sos-label').textContent = 'SOS';
  document.getElementById('sos-hint').textContent  = 'HOLD TO TRIGGER';

  // Banner + tracking bar
  document.getElementById('sos-banner').style.display      = 'none';
  document.getElementById('sos-active-bar').style.display  = 'none';
  document.getElementById('map-pulse-el').style.display    = 'none';
  document.getElementById('countdown-arc').style.strokeDashoffset = '578';

  // Logs
  addLog('loc-log', '✅', 'SOS Resolved', `Duration: ${formatDuration(duration)}`);
  addLog('ai-log',  '🤖', 'AI generating incident summary', 'View in History tab');

  // Update history record
  if (state.history[0]) {
    state.history[0].status   = 'resolved';
    state.history[0].duration = duration;
  }

  renderHistory();
  updateRiskScore();
}