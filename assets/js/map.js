// ── map.js ──────────────────────────────────────────────────────────────────
// Live Map: Leaflet integration, GPS tracking, SOS markers, location history

let _map = null;
let _userMarker = null;
let _accuracyCircle = null;
let _sosMarker = null;
let _pathLine = null;
let _pathCoords = [];
let _mapInitialised = false;

// ── Init ─────────────────────────────────────────────────────────────────────
function initMap() {
  if (_mapInitialised) return;
  const el = document.getElementById('map');
  if (!el) return;

  _map = L.map('map', {
    zoomControl: true,
    attributionControl: true,
  }).setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(_map);

  _mapInitialised = true;

  // If we already have a position stored in state, render it immediately
  if (window.state && state.position) {
    updateMapPosition(state.position);
  }
}

// ── User position marker ─────────────────────────────────────────────────────
function updateMapPosition(pos) {
  if (!_map) return;
  const { lat, lng, accuracy } = pos;

  // Pulsing user marker icon
  const userIcon = L.divIcon({
    className: '',
    html: `<div class="map-user-dot"><div class="map-user-pulse"></div></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  if (_userMarker) {
    _userMarker.setLatLng([lat, lng]);
  } else {
    _userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
      .addTo(_map)
      .bindPopup('<b>Your Location</b>');
    _map.setView([lat, lng], 15);
  }

  // Accuracy circle
  if (_accuracyCircle) {
    _accuracyCircle.setLatLng([lat, lng]).setRadius(accuracy || 50);
  } else {
    _accuracyCircle = L.circle([lat, lng], {
      radius: accuracy || 50,
      color: '#E8271A',
      fillColor: '#E8271A',
      fillOpacity: 0.08,
      weight: 1,
    }).addTo(_map);
  }

  // Update path trail
  _pathCoords.push([lat, lng]);
  if (_pathCoords.length > 200) _pathCoords.shift(); // cap at 200 points

  if (_pathLine) {
    _pathLine.setLatLngs(_pathCoords);
  } else if (_pathCoords.length > 1) {
    _pathLine = L.polyline(_pathCoords, {
      color: '#E8271A',
      weight: 2,
      opacity: 0.5,
      dashArray: '4 6',
    }).addTo(_map);
  }

  // Update DOM labels
  const addrLabel = document.getElementById('map-addr-label');
  const accLabel  = document.getElementById('map-acc-label');
  if (addrLabel) addrLabel.textContent = pos.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  if (accLabel)  accLabel.textContent  = `GPS ±${Math.round(accuracy || 0)}m`;
}

// ── SOS marker ───────────────────────────────────────────────────────────────
function placeSosMarker(lat, lng, timestamp) {
  if (!_map) return;

  const sosIcon = L.divIcon({
    className: '',
    html: `<div class="map-sos-pin">🚨</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

  if (_sosMarker) _map.removeLayer(_sosMarker);

  _sosMarker = L.marker([lat, lng], { icon: sosIcon, zIndexOffset: 2000 })
    .addTo(_map)
    .bindPopup(`<b>🚨 SOS Triggered</b><br>${timestamp || new Date().toLocaleString()}`)
    .openPopup();

  _map.setView([lat, lng], 16);
}

// ── Center on user ───────────────────────────────────────────────────────────
function centreMapOnUser() {
  if (!_map || !_userMarker) return;
  _map.setView(_userMarker.getLatLng(), 16);
}

// ── Pan to coordinates ───────────────────────────────────────────────────────
function panMapTo(lat, lng, zoom) {
  if (!_map) return;
  _map.setView([lat, lng], zoom || 15);
}

// ── Invalidate size (call when tab becomes visible) ──────────────────────────
function invalidateMap() {
  if (_map) setTimeout(() => _map.invalidateSize(), 100);
}

// ── Export to window ─────────────────────────────────────────────────────────
window.initMap          = initMap;
window.updateMapPosition = updateMapPosition;
window.placeSosMarker   = placeSosMarker;
window.centreMapOnUser  = centreMapOnUser;
window.panMapTo         = panMapTo;
window.invalidateMap    = invalidateMap;
