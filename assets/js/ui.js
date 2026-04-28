// ── ui.js ─────────────────────────────────────────────────────────────────────
// UI helpers: SOS button visual states, banner, active bar, misc polish
function startClock() {
  function tick() {
    const el = document.getElementById('clock');
    if (el) el.textContent = new Date().toTimeString().slice(0, 8);
  }
  tick();
  setInterval(tick, 1000);
}

/** Switch AI sub-tabs */
function switchAITab(tabName, btn) {
  ['monitor', 'analyze', 'report'].forEach(t => {
    const el = document.getElementById('ai-tab-' + t);
    if (el) el.style.display = (t === tabName) ? 'block' : 'none';
  });
  btn.closest('.tabs')
    .querySelectorAll('.tab')
    .forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/** Show a view by ID and highlight its nav button */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const view = document.getElementById('view-' + id);
  if (view) view.classList.add('active');

  const order = ['home', 'tracking', 'ai', 'contacts', 'history', 'settings'];
  const idx   = order.indexOf(id);
  const btns  = document.querySelectorAll('.nav-btn');
  if (btns[idx + 1]) btns[idx + 1].classList.add('active'); // +1 skips logo
}

/** Save settings from form inputs */
function saveSettings() {
  state.userName     = document.getElementById('user-name').value.trim() || 'User';
  state.countdownSec = parseInt(document.getElementById('countdown-sec').value) || 3;
  addLog('loc-log', '⚙️', 'Settings saved', `Name: ${state.userName} · Countdown: ${state.countdownSec}s`);
}

/** Show add-contact form */
function showAddContact() {
  const form = document.getElementById('add-contact-form');
  if (form) form.style.display = 'block';
}

/** Build initial audio viz placeholder bars */
function buildVizPlaceholder() {
  const viz = document.getElementById('audio-viz');
  if (!viz) return;
  viz.innerHTML = Array.from({ length: 20 }, () =>
    `<div class="viz-bar" style="height:3px;opacity:0.3"></div>`
  ).join('');
}
