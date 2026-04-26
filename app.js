document.addEventListener('DOMContentLoaded', () => {

  // ── Clock ─────────────────────────────────────────
  startClock();

  // ── Build placeholder audio visualizer ────────────
  buildVizPlaceholder();

  // ── Initial renders ───────────────────────────────
  renderContacts();
  renderHistory();

  // ── Start GPS ─────────────────────────────────────
  initLocation();

  // ── Startup log messages ──────────────────────────
  setTimeout(() => addLog('loc-log', '🛡️', 'SafeGuard ready', 'All systems online'), 300);
  setTimeout(() => addLog('ai-log',  '🤖', 'AI threat engine loaded', '48 distress patterns active'), 800);
  setTimeout(() => addLog('loc-log', '📡', 'Requesting GPS permission', 'High-accuracy mode'), 1200);

  // ── Prevent accidental page close during SOS ──────
  window.addEventListener('beforeunload', (e) => {
    if (state.sosActive) {
      e.preventDefault();
      e.returnValue = 'SOS is active! Are you sure you want to leave?';
    }
  });

});
