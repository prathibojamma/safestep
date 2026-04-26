/**
 * utils.js — Shared utilities
 */

/** Format seconds as MM:SS */
function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/** Format duration in human-readable form */
function formatDuration(seconds) {
  if (!seconds) return 'Unknown';
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/** Clamp a number between min and max */
function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

/** Get current time string */
function nowTime() {
  return new Date().toLocaleTimeString();
}

/** Get current datetime string */
function nowDateTime() {
  return new Date().toLocaleString();
}

/** Add event log item */
function addLog(type, icon, text, sub) {
  const log = document.getElementById('event-log');

  // Remove placeholder
  const ph = log.querySelector('.log-placeholder');
  if (ph) ph.remove();

  const item = document.createElement('div');
  item.className = `log-item ${type}`;
  item.innerHTML = `
    <div class="log-icon">${icon}</div>
    <div>
      <div class="log-text">${text}</div>
      <div class="log-time">${sub ? sub + ' · ' : ''}${nowTime()}</div>
    </div>`;
  log.insertBefore(item, log.firstChild);

  // Keep only 30 items
  while (log.children.length > 30) log.removeChild(log.lastChild);
}

/** Show a view by id */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + id).classList.add('active');
  const idx = ['home','tracking','ai','contacts','history','settings'].indexOf(id);
  document.querySelectorAll('.nav-btn')[idx + 1]?.classList.add('active');
}

/** Update clock every second */
function startClock() {
  function tick() {
    document.getElementById('clock').textContent =
      new Date().toTimeString().slice(0, 8);
  }
  tick();
  setInterval(tick, 1000);
}

/** Switch AI sub-tab */
function switchAITab(tab, btn) {
  ['monitor', 'analyze', 'report'].forEach(t => {
    document.getElementById('ai-tab-' + t).style.display = t === tab ? 'block' : 'none';
  });
  btn.closest('.tabs').querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/** Save settings */
function saveSettings() {
  state.userName     = document.getElementById('user-name').value || 'User';
  state.countdownSec = parseInt(document.getElementById('countdown-sec').value) || 3;
  addLog('loc-log', '⚙️', 'Settings saved', '');
}

/** Show add contact form */
function showAddContact() {
  document.getElementById('add-contact-form').style.display = 'block';
}