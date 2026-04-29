// ── gps.js ────────────────────────────────────────────────────────────────────
// GPS: continuous tracking, reverse geocoding, map + UI sync

let _watchId      = null;
let _lastPosition = null;
let _geocodeCache = {};
let _firstFix     = true;
let _gpsStarted   = false;

// ── Start GPS watch ───────────────────────────────────────────────────────────
function startGPS() {
  if (_gpsStarted) return;   // guard against double-call
  if (!navigator.geolocation) {
    updateLocStatus('❌ GPS not supported');
    return;
  }
  _gpsStarted = true;
  updateLocStatus('📡 Getting location…');

  // Fast single fix first so map centres immediately
  navigator.geolocation.getCurrentPosition(onPosition, onGPSError, {
    enableHighAccuracy: true, timeout: 12000, maximumAge: 0,
  });

  // Then continuous watch
  _watchId = navigator.geolocation.watchPosition(onPosition, onGPSError, {
    enableHighAccuracy: true, timeout: 20000, maximumAge: 5000,
  });
}

function stopGPS() {
  if (_watchId !== null) {
    navigator.geolocation.clearWatch(_watchId);
    _watchId = null;
  }
  _gpsStarted = false;
}

// ── Position handler ──────────────────────────────────────────────────────────
async function onPosition(geo) {
  const lat      = geo.coords.latitude;
  const lng      = geo.coords.longitude;
  const accuracy = geo.coords.accuracy;
  const speed    = geo.coords.speed || 0;

  _lastPosition = { lat, lng, accuracy, speed };

  if (window.state) {
    state.position = _lastPosition;
    state.lastLat  = lat;
    state.lastLng  = lng;
  }

  // Coordinate cards
  const latEl = document.getElementById('coord-lat');
  const lngEl = document.getElementById('coord-lng');
  if (latEl) latEl.textContent = lat.toFixed(6) + '°';
  if (lngEl) lngEl.textContent = lng.toFixed(6) + '°';

  // Speed card
  const speedEl = document.getElementById('speed-val');
  const speedSt = document.getElementById('speed-status');
  const spd = speed.toFixed(1);
  if (speedEl) speedEl.innerHTML = spd + ' <span class="unit">m/s</span>';
  if (speedSt) speedSt.textContent = speed < 0.5 ? 'Stationary'
                                   : speed < 2   ? 'Walking'
                                   : speed < 6   ? 'Running'
                                   : 'Driving';

  // Accuracy card
  const accEl = document.getElementById('acc-val');
  if (accEl) accEl.innerHTML = Math.round(accuracy) + ' <span class="unit">m</span>';

  // Map — pass firstFix so it flies to location on first hit
  if (typeof updateMapPosition === 'function') {
    updateMapPosition({ lat, lng, accuracy, address: _geocodeCache[geoKey(lat,lng)] || '', firstFix: _firstFix });
  }

  if (_firstFix) {
    _firstFix = false;
    logEvent && logEvent('📍 Location acquired · ±' + Math.round(accuracy) + 'm');
  }

  // Reverse geocode (cached, only fetches when cell changes)
  const addr = await reverseGeocode(lat, lng);
  _lastPosition.address = addr;
  if (window.state) state.position.address = addr;

  const addrEl = document.getElementById('coord-addr');
  if (addrEl) addrEl.textContent = addr || (lat.toFixed(5) + ', ' + lng.toFixed(5));

  // Update map label with address
  if (typeof updateMapPosition === 'function') {
    updateMapPosition({ lat, lng, accuracy, address: addr });
  }

  updateLocStatus('📍 ' + (addr || lat.toFixed(4) + ', ' + lng.toFixed(4)));
  addLocationHistoryEntry({ lat, lng, addr, accuracy, ts: new Date() });
  calculateRisk && calculateRisk(lat, lng);
}

// ── GPS error ─────────────────────────────────────────────────────────────────
function onGPSError(err) {
  const msgs = {
    1: '❌ Location denied — allow in browser settings',
    2: '⚠️ GPS signal unavailable',
    3: '⏱️ GPS timed out — retrying',
  };
  const msg = msgs[err.code] || '⚠️ GPS error';
  updateLocStatus(msg);
  // Only log once per type
  if (err.code !== 3) logEvent && logEvent(msg);
  // For timeout, try again without high-accuracy
  if (err.code === 3 && _watchId !== null) {
    navigator.geolocation.getCurrentPosition(onPosition, () => {}, {
      enableHighAccuracy: false, timeout: 20000, maximumAge: 30000,
    });
  }
}

// ── Reverse geocode via Nominatim (free, no key) ──────────────────────────────
async function reverseGeocode(lat, lng) {
  const key = geoKey(lat, lng);
  if (_geocodeCache[key]) return _geocodeCache[key];
  try {
    const res = await fetch(
      'https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lng + '&format=json&zoom=16',
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'SafeGuard/1.0' } }
    );
    if (!res.ok) return '';
    const data = await res.json();
    const a    = data.address || {};
    const addr = [a.road, a.suburb || a.neighbourhood, a.city || a.town || a.village, a.country]
                   .filter(Boolean).join(', ');
    _geocodeCache[key] = addr;
    return addr;
  } catch { return ''; }
}

function geoKey(lat, lng) {
  return lat.toFixed(3) + ',' + lng.toFixed(3);
}

// ── Location history list ─────────────────────────────────────────────────────
const _locHistory = [];
function addLocationHistoryEntry({ lat, lng, addr, accuracy, ts }) {
  // Only add if moved more than ~50m from last entry
  const last = _locHistory[0];
  if (last) {
    const d = haversineDistance ? haversineDistance(last.lat, last.lng, lat, lng) : 999;
    if (d < 30) return;
  }

  _locHistory.unshift({ lat, lng, addr, accuracy, ts });
  if (_locHistory.length > 30) _locHistory.pop();

  const el = document.getElementById('location-history');
  if (!el) return;
  if (_locHistory.length === 0) {
    el.innerHTML = '<div style="opacity:.4;font-size:13px;padding:8px 0">No location history yet</div>';
    return;
  }
  el.innerHTML = _locHistory.map(h =>
    '<div class="loc-hist-row">'
    + '<span class="loc-hist-time">' + h.ts.toLocaleTimeString() + '</span>'
    + '<span class="loc-hist-addr">' + (h.addr || h.lat.toFixed(5) + ', ' + h.lng.toFixed(5)) + '</span>'
    + '<span class="loc-hist-acc">±' + Math.round(h.accuracy) + 'm</span>'
    + '</div>'
  ).join('');
}

// ── Status bar ────────────────────────────────────────────────────────────────
function updateLocStatus(msg) {
  const el = document.getElementById('loc-status');
  if (el) el.textContent = msg;
}

function getCurrentPosition() { return _lastPosition; }

// ── Inject loc-history styles (map-adjacent, not in CSS files) ─────────────────
(function injectLocStyles() {
  if (document.getElementById('gps-loc-styles')) return;
  const s = document.createElement('style');
  s.id = 'gps-loc-styles';
  s.textContent = `
    .loc-hist-row{display:flex;gap:10px;align-items:center;padding:7px 0;
      border-bottom:1px solid rgba(255,255,255,.05);font-size:12px;}
    .loc-hist-row:last-child{border-bottom:none;}
    .loc-hist-time{opacity:.4;white-space:nowrap;min-width:65px;}
    .loc-hist-addr{flex:1;opacity:.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .loc-hist-acc{opacity:.4;white-space:nowrap;}
    #location-history{max-height:200px;overflow-y:auto;}
  `;
  document.head.appendChild(s);
})();

// ── Exports ───────────────────────────────────────────────────────────────────
window.startGPS           = startGPS;
window.stopGPS            = stopGPS;
window.getCurrentPosition = getCurrentPosition;
window.reverseGeocode     = reverseGeocode;
window.updateLocStatus    = updateLocStatus;
