// ── map.js ────────────────────────────────────────────────────────────────────
// Live Map: Leaflet, GPS marker, accuracy circle, path trail, SOS pin

let _map          = null;
let _userMarker   = null;
let _accuracyCircle = null;
let _sosMarker    = null;
let _pathLine     = null;
let _pathCoords   = [];
let _mapInitialised = false;

// ── Init ──────────────────────────────────────────────────────────────────────
function initMap() {
  if (_mapInitialised) return;
  const el = document.getElementById('map');
  if (!el) return;

  _map = L.map('map', { zoomControl: true, attributionControl: true })
           .setView([20, 78], 4);   // Default: India

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(_map);

  _mapInitialised = true;

  // If GPS already has a position, render it immediately
  if (window.state && state.position) {
    updateMapPosition(state.position);
  }
}

// ── User position ─────────────────────────────────────────────────────────────
function updateMapPosition(pos) {
  if (!_map) return;
  const { lat, lng, accuracy, firstFix } = pos;

  // Pulsing dot icon
  const userIcon = L.divIcon({
    className: '',
    html: '<div class="sg-user-dot"><div class="sg-user-pulse"></div></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  if (_userMarker) {
    _userMarker.setLatLng([lat, lng]);
  } else {
    _userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
      .addTo(_map)
      .bindPopup('<b>📍 You are here</b>');
  }

  // Fly to user on first GPS fix (or whenever firstFix flag is set)
  if (firstFix || _pathCoords.length === 0) {
    _map.flyTo([lat, lng], 15, { duration: 1.4, easeLinearity: 0.25 });
  }

  // Accuracy circle
  if (_accuracyCircle) {
    _accuracyCircle.setLatLng([lat, lng]).setRadius(accuracy || 50);
  } else {
    _accuracyCircle = L.circle([lat, lng], {
      radius: accuracy || 50,
      color: '#E8271A', fillColor: '#E8271A',
      fillOpacity: 0.07, weight: 1,
    }).addTo(_map);
  }

  // Path trail
  _pathCoords.push([lat, lng]);
  if (_pathCoords.length > 300) _pathCoords.shift();

  if (_pathLine) {
    _pathLine.setLatLngs(_pathCoords);
  } else if (_pathCoords.length > 1) {
    _pathLine = L.polyline(_pathCoords, {
      color: '#E8271A', weight: 2, opacity: 0.5, dashArray: '4 6',
    }).addTo(_map);
  }

  // DOM labels
  const addrLabel = document.getElementById('map-addr-label');
  const accLabel  = document.getElementById('map-acc-label');
  if (addrLabel) addrLabel.textContent = pos.address || (lat.toFixed(5) + ', ' + lng.toFixed(5));
  if (accLabel)  accLabel.textContent  = 'GPS ±' + Math.round(accuracy || 0) + 'm';
}

// ── SOS marker ────────────────────────────────────────────────────────────────
function placeSosMarker(lat, lng, timestamp) {
  if (!_map) return;
  const sosIcon = L.divIcon({
    className: '',
    html: '<div class="sg-sos-pin">🚨</div>',
    iconSize: [36, 36], iconAnchor: [18, 36],
  });
  if (_sosMarker) _map.removeLayer(_sosMarker);
  _sosMarker = L.marker([lat, lng], { icon: sosIcon, zIndexOffset: 2000 })
    .addTo(_map)
    .bindPopup('<b>🚨 SOS Triggered</b><br>' + (timestamp || new Date().toLocaleString()))
    .openPopup();
  _map.flyTo([lat, lng], 16, { duration: 1 });
}

function centreMapOnUser() {
  if (!_map || !_userMarker) return;
  _map.flyTo(_userMarker.getLatLng(), 16, { duration: 1 });
}

function panMapTo(lat, lng, zoom) {
  if (_map) _map.setView([lat, lng], zoom || 15);
}

function invalidateMap() {
  if (_map) setTimeout(() => _map.invalidateSize(), 120);
}

// ── Map dot styles (injected once — not in CSS files, map-specific only) ──────
(function injectMapDotStyles() {
  if (document.getElementById('sg-map-styles')) return;
  const s = document.createElement('style');
  s.id = 'sg-map-styles';
  s.textContent = `
    .sg-user-dot{
      width:18px;height:18px;background:#E8271A;border-radius:50%;
      border:3px solid #fff;position:relative;
      box-shadow:0 0 0 2px rgba(232,39,26,.4);
    }
    .sg-user-pulse{
      position:absolute;inset:-6px;border-radius:50%;
      border:2px solid rgba(232,39,26,.5);
      animation:sgPulse 2s ease-out infinite;
    }
    .sg-sos-pin{font-size:28px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,.7));}
    @keyframes sgPulse{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.5);opacity:0}}
    .loc-hist-row{
      display:flex;gap:10px;align-items:center;
      padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:12px;
    }
    .loc-hist-row:last-child{border-bottom:none;}
    .loc-hist-time{opacity:.45;white-space:nowrap;}
    .loc-hist-addr{flex:1;opacity:.8;}
    .loc-hist-acc{opacity:.4;white-space:nowrap;}
    #location-history{max-height:220px;overflow-y:auto;}
  `;
  document.head.appendChild(s);
})();

window.initMap           = initMap;
window.updateMapPosition = updateMapPosition;
window.placeSosMarker    = placeSosMarker;
window.centreMapOnUser   = centreMapOnUser;
window.panMapTo          = panMapTo;
window.invalidateMap     = invalidateMap;
