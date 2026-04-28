// ── gps.js ────────────────────────────────────────────────────────────────────
// GPS: continuous location tracking, reverse geocoding, risk + map sync

let _watchId      = null;
let _lastPosition = null;
let _geocodeCache = {};

// ── Start GPS watch ───────────────────────────────────────────────────────────
function startGPS() {
  if (!navigator.geolocation) {
    updateLocStatus('GPS not supported');
    return;
  }

  updateLocStatus('Locating…');

  // Single fast fix first
  navigator.geolocation.getCurrentPosition(onPosition, onGPSError, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  });

  // Then watch continuously
  _watchId = navigator.geolocation.watchPosition(onPosition, onGPSError, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 5000,
  });
}

// ── Stop GPS ──────────────────────────────────────────────────────────────────
function stopGPS() {
  if (_watchId !== null) {
    navigator.geolocation.clearWatch(_watchId);
    _watchId = null;
  }
}

// ── Position handler ──────────────────────────────────────────────────────────
async function onPosition(geo) {
  const lat = geo.coords.latitude;
  const lng = geo.coords.longitude;
  const accuracy = geo.coords.accuracy;
  const speed    = geo.coords.speed || 0;

  _lastPosition = { lat, lng, accuracy, speed };

  // Update state
  if (window.state) {
    state.position = _lastPosition;
    state.lastLat  = lat;
    state.lastLng  = lng;
  }

  // Update coordinates UI
  const latEl = document.getElementById('coord-lat');
  const lngEl = document.getElementById('coord-lng');
  if (latEl) latEl.textContent = `${lat.toFixed(5)}°`;
  if (lngEl) lngEl.textContent = `${lng.toFixed(5)}°`;

  // Speed
  const speedEl  = document.getElementById('speed-val');
  const speedSt  = document.getElementById('speed-status');
  if (speedEl) speedEl.innerHTML = `${speed.toFixed(1)} <span class="unit">m/s</span>`;
  if (speedSt) speedSt.textContent = speed < 0.5 ? 'Stationary' : speed < 2 ? 'Walking' : speed < 8 ? 'Running' : 'Driving';

  // Accuracy
  const accEl = document.getElementById('acc-val');
  if (accEl) accEl.innerHTML = `${Math.round(accuracy)} <span class="unit">m</span>`;

  // Map
  if (typeof updateMapPosition === 'function') {
    updateMapPosition({ lat, lng, accuracy, address: _geocodeCache[geoKey(lat, lng)] || '' });
  }

  // Reverse geocode (throttled — only when moved significantly)
  const addr = await reverseGeocode(lat, lng);
  _lastPosition.address = addr;
  if (window.state) state.position.address = addr;

  // Update address UI
  const addrEl = document.getElementById('coord-addr');
  if (addrEl) addrEl.textContent = addr;
  if (typeof updateMapPosition === 'function') {
    updateMapPosition({ lat, lng, accuracy, address: addr });
  }

  updateLocStatus(`📍 ${addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}`);

  // Add to location history list
  addLocationHistoryEntry({ lat, lng, addr, accuracy, ts: new Date() });

  // Trigger risk recalculation if available
  if (typeof calculateRisk === 'function') calculateRisk(lat, lng);
}

// ── GPS error ─────────────────────────────────────────────────────────────────
function onGPSError(err) {
  const msgs = {
    1: 'Location access denied. Please allow in browser settings.',
    2: 'GPS signal unavailable.',
    3: 'GPS request timed out.',
  };
  updateLocStatus(msgs[err.code] || 'GPS error');
  logEvent && logEvent(`⚠️ GPS: ${msgs[err.code] || err.message}`);
}

// ── Reverse geocode via Nominatim (free, no key needed) ───────────────────────
async function reverseGeocode(lat, lng) {
  const key = geoKey(lat, lng);
  if (_geocodeCache[key]) return _geocodeCache[key];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return '';
    const data = await res.json();
    const addr = formatAddress(data.address || {});
    _geocodeCache[key] = addr;
    return addr;
  } catch {
    return '';
  }
}

function formatAddress(a) {
  const parts = [a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village, a.country];
  return parts.filter(Boolean).join(', ');
}

function geoKey(lat, lng) {
  // Round to 3dp (~111m) for cache
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

// ── Location history list (sidebar card) ─────────────────────────────────────
const _locHistory = [];
function addLocationHistoryEntry({ lat, lng, addr, accuracy, ts }) {
  _locHistory.unshift({ lat, lng, addr, accuracy, ts });
  if (_locHistory.length > 20) _locHistory.pop();

  const el = document.getElementById('location-history');
  if (!el) return;
  el.innerHTML = _locHistory.map(h => `
    <div class="loc-hist-row">
      <div class="loc-hist-time">${h.ts.toLocaleTimeString()}</div>
      <div class="loc-hist-addr">${h.addr || `${h.lat.toFixed(5)}, ${h.lng.toFixed(5)}`}</div>
      <div class="loc-hist-acc">±${Math.round(h.accuracy)}m</div>
    </div>
  `).join('');
}

// ── Loc status label ──────────────────────────────────────────────────────────
function updateLocStatus(msg) {
  const el = document.getElementById('loc-status');
  if (el) el.textContent = msg;
}

// ── Public getter ─────────────────────────────────────────────────────────────
function getCurrentPosition() { return _lastPosition; }

// ── Inline styles ─────────────────────────────────────────────────────────────

// ── Export ────────────────────────────────────────────────────────────────────
window.startGPS          = startGPS;
window.stopGPS           = stopGPS;
window.getCurrentPosition = getCurrentPosition;
window.reverseGeocode    = reverseGeocode;
