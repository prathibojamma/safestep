// ── utils.js ──────────────────────────────────────────────────────────────────
// Shared utility functions

// ── Time formatting ───────────────────────────────────────────────────────────
function formatDuration(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── String helpers ────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function capitalize(str) {
  return str ? str[0].toUpperCase() + str.slice(1).toLowerCase() : '';
}

// ── Geo helpers ───────────────────────────────────────────────────────────────
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // metres
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function toRad(d) { return d * Math.PI / 180; }

// ── Clipboard ─────────────────────────────────────────────────────────────────
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ── Vibration ─────────────────────────────────────────────────────────────────
function vibrate(pattern) {
  try { navigator.vibrate && navigator.vibrate(pattern); } catch {}
}

// ── Toast notification ────────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      display:flex; flex-direction:column; gap:8px; z-index:9999; pointer-events:none;
    `;
    document.body.appendChild(container);
  }

  const colors = { info:'#3b82f6', success:'#22c55e', warning:'#f59e0b', error:'#E8271A' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    background:${colors[type] || colors.info}; color:#fff;
    padding:10px 20px; border-radius:10px; font-size:14px; font-weight:600;
    box-shadow:0 4px 20px rgba(0,0,0,.4); pointer-events:auto;
    animation:toastIn .25s ease;
  `;
  toast.textContent = msg;

  if (!document.getElementById('toast-styles')) {
    const s = document.createElement('style');
    s.id = 'toast-styles';
    s.textContent = `
      @keyframes toastIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      @keyframes toastOut{ to{opacity:0;transform:translateY(10px)} }
    `;
    document.head.appendChild(s);
  }

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut .25s ease forwards';
    setTimeout(() => toast.remove(), 260);
  }, duration);
}

// ── Exports ───────────────────────────────────────────────────────────────────
window.formatDuration    = formatDuration;
window.timeAgo           = timeAgo;
window.escHtml           = escHtml;
window.capitalize        = capitalize;
window.haversineDistance = haversineDistance;
window.copyToClipboard   = copyToClipboard;
window.vibrate           = vibrate;
window.showToast         = showToast;
