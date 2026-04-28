// ── ui.js ─────────────────────────────────────────────────────────────────────
// UI helpers: SOS button visual states, banner, active bar, misc polish

(function injectUIStyles() {
  if (document.getElementById('ui-styles')) return;
  const s = document.createElement('style');
  s.id = 'ui-styles';
  s.textContent = `
    /* ── SOS banner ── */
    #sos-banner {
      display: none;
      position: fixed; top: 0; left: 0; right: 0;
      background: #E8271A; color: #fff;
      text-align: center; font-weight: 700; font-size: 13px;
      padding: 10px; z-index: 9000;
      letter-spacing: .06em; animation: bannerPulse 1s ease-in-out infinite;
    }
    #sos-banner.active { display: block; }
    @keyframes bannerPulse {
      0%,100% { opacity:1; } 50% { opacity:.75; }
    }

    /* ── SOS button triggered state ── */
    #sos-btn.sos-triggered {
      background: radial-gradient(circle, #ff4a3d, #E8271A) !important;
      box-shadow: 0 0 0 12px rgba(232,39,26,.3), 0 0 40px rgba(232,39,26,.5) !important;
    }

    /* ── Active SOS bar ── */
    #sos-active-bar {
      background: rgba(232,39,26,.12);
      border: 1px solid rgba(232,39,26,.3);
      border-radius: 14px; padding: 14px 18px; margin-bottom: 14px;
    }
    .sos-active-header {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    }
    .sos-active-indicator {
      width: 12px; height: 12px; border-radius: 50%; background: #E8271A;
      animation: sosDot 1s ease-in-out infinite; flex-shrink: 0;
    }
    @keyframes sosDot { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
    .sos-active-title { font-weight: 800; font-size: 15px; color: #E8271A; }
    .sos-active-sub   { font-size: 12px; opacity: .7; }
    .sos-active-timer {
      font-family: monospace; font-size: 18px; font-weight: 700;
      background: rgba(0,0,0,.2); padding: 4px 12px; border-radius: 8px;
    }

    /* ── Sidebar ── */
    #sidebar {
      width: 60px; background: rgba(10,10,20,.95);
      display: flex; flex-direction: column; align-items: center;
      padding: 16px 0; gap: 4px; border-right: 1px solid rgba(255,255,255,.07);
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 100;
    }
    .sidebar-logo { font-size: 24px; margin-bottom: 12px; }
    .sidebar-spacer { flex: 1; }
    .nav-btn {
      width: 44px; height: 44px; border: none; background: transparent;
      border-radius: 12px; cursor: pointer; font-size: 20px;
      color: inherit; transition: .15s; display: flex;
      align-items: center; justify-content: center;
    }
    .nav-btn:hover  { background: rgba(255,255,255,.08); }
    .nav-btn.active { background: rgba(232,39,26,.15); }

    /* ── Topbar ── */
    #topbar {
      height: 56px; padding: 0 20px;
      display: flex; align-items: center; gap: 14px;
      border-bottom: 1px solid rgba(255,255,255,.07);
      background: rgba(10,10,20,.9); backdrop-filter: blur(12px);
      position: sticky; top: 0; z-index: 50;
    }
    .logo { font-size: 18px; font-weight: 800; letter-spacing: .06em; }
    .logo span { color: #E8271A; }
    .topbar-right { margin-left: auto; }
    .time-display { font-family: monospace; font-size: 15px; opacity: .7; }
    .status-pill {
      display: flex; align-items: center; gap: 6px;
      background: rgba(255,255,255,.06); padding: 4px 12px;
      border-radius: 20px; font-size: 12px;
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #22c55e;
      animation: statusPulse 2s ease-in-out infinite;
    }
    @keyframes statusPulse { 0%,100%{opacity:1} 50%{opacity:.4} }

    /* ── Layout ── */
    #app   { display: flex; height: 100vh; overflow: hidden; }
    #main  { flex: 1; margin-left: 60px; display: flex; flex-direction: column; overflow: hidden; }
    #content { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .view  { display: none; flex-direction: column; gap: 16px; }
    .view.active { display: flex; }

    /* ── Cards ── */
    .card {
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 16px; padding: 18px;
    }
    .card-sm { padding: 14px; }
    .card-label { font-size: 11px; opacity: .5; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
    .card-value { font-size: 32px; font-weight: 800; line-height: 1; }
    .card-value-sm { font-size: 24px; }
    .card-sub   { font-size: 12px; opacity: .55; margin-top: 6px; }
    .unit       { font-size: 14px; font-weight: 400; opacity: .6; }

    /* ── Grids ── */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
    @media (max-width: 600px) {
      .grid-2, .grid-3 { grid-template-columns: 1fr; }
    }

    /* ── Coord row ── */
    .coord-row { display: flex; gap: 12px; margin: 6px 0; }
    .coord-box { flex:1; background:rgba(255,255,255,.05); border-radius:8px; padding:8px 10px; }
    .coord-label{ font-size:10px; opacity:.5; letter-spacing:.06em; }
    .coord-val  { font-size:16px; font-weight:700; font-family:monospace; }

    /* ── Stat card ── */
    .stat-icon { font-size: 22px; margin: 4px 0; }
    .stat-text { font-size: 14px; font-weight: 700; }

    /* ── SOS section ── */
    #sos-section { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 20px 0; }
    .sos-ring    { position: relative; width: 200px; height: 200px; }
    .sos-ring-anim {
      position: absolute; inset: 0; border-radius: 50%;
      border: 2px solid rgba(232,39,26,.2);
      animation: ringExpand 2.5s ease-out infinite;
    }
    .sos-ring-anim:nth-child(2) { animation-delay: .8s; }
    .sos-ring-anim:nth-child(3) { animation-delay: 1.6s; }
    @keyframes ringExpand {
      0%   { transform: scale(.6); opacity: .8; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    #countdown-ring { position: absolute; inset: 0; }
    #sos-btn {
      position: absolute; inset: 14px;
      border-radius: 50%; border: none; cursor: pointer;
      background: radial-gradient(circle at 35% 35%, #ff6b57, #E8271A);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      box-shadow: 0 4px 30px rgba(232,39,26,.4);
      transition: .2s; user-select: none; -webkit-user-select: none;
    }
    #sos-btn:active { transform: scale(.96); }
    .sos-icon  { font-size: 28px; }
    .sos-label { font-size: 26px; font-weight: 900; letter-spacing: .04em; color: #fff; }
    .sos-hint  { font-size: 10px; letter-spacing: .1em; opacity: .8; color: #fff; }
    .sos-quick-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

    /* ── Event log ── */
    #event-log { max-height: 200px; overflow-y: auto; }
    .log-placeholder { opacity: .4; font-size: 13px; }

    /* ── Settings ── */
    .field-label { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
    .field-sub   { font-size: 12px; opacity: .5; }
    .form-field  { display: flex; flex-direction: column; }
    .slider-row  { display: flex; align-items: center; gap: 12px; }
    .slider-val  { font-size: 14px; font-weight: 700; min-width: 28px; }
    input[type=range] { flex: 1; accent-color: #E8271A; }
    .toggle-row  { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 0; }
    .toggle      { width: 44px; height: 24px; accent-color: #E8271A; cursor: pointer; }
    .stack-info  { font-size: 12px; opacity: .5; line-height: 2; }

    /* ── Map active-bar ── */
    #map-pulse-el { display: none; }

    /* ── Body base ── */
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0; padding: 0;
      background: #0a0a14; color: #e8e8f0;
      font-family: 'DM Sans', sans-serif;
      min-height: 100vh; overflow-x: hidden;
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.15); border-radius: 2px; }
  `;
  document.head.appendChild(s);
})();

// No window exports needed — pure CSS injection
