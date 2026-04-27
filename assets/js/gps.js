/**
 * gps.js — GPS / Geolocation Service
 *
 * Uses browser Geolocation API (watchPosition for continuous updates).
 * Falls back to simulated New Delhi coordinates if permission denied.
 */

/** Start GPS tracking */
import { updateMap } from './map.js';
function initLocation() {
  if (!navigator.geolocation) {
    addLog('warn-log', '⚠️', 'Geolocation not supported', 'Using simulation');
    simulateLocation();
    return;
  }

  navigator.geolocation.watchPosition(
    onLocation,
    (err) => {
      addLog('warn-log', '⚠️', 'GPS access denied', 'Using simulation mode');
      simulateLocation();
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}

/** Simulate location (New Delhi) with slight drift */
function simulateLocation() {
  const BASE_LAT = 28.6139;
  const BASE_LNG = 77.2090;

  // Immediate first position
  onLocation({
    coords: { latitude: BASE_LAT, longitude: BASE_LNG, accuracy: 15, speed: 0, heading: 0 },
  });

  // Drift every 5 seconds
  setInterval(() => {
    onLocation({
      coords: {
        latitude:  BASE_LAT + (Math.random() - 0.5) * 0.002,
        longitude: BASE_LNG + (Math.random() - 0.5) * 0.002,
        accuracy:  15 + Math.random() * 10,
        speed:     Math.random() * 0.5,
        heading:   Math.random() * 360,
      },
    });
  }, 5000);
}

/** Handle a new position fix */
function onLocation(pos) {
  const { latitude: lat, longitude: lng, accuracy, speed, heading } = pos.coords;

  // Update state
  state.coords = { lat, lng, accuracy, speed, heading };

  // ── Home view ──────────────────────────────────────
  document.getElementById('coord-lat').textContent  = lat.toFixed(5) + '°';
  document.getElementById('coord-lng').textContent  = lng.toFixed(5) + '°';
  document.getElementById('loc-status').textContent = `±${Math.round(accuracy || 0)}m`;
  document.getElementById('coord-addr').textContent =
    `${lat.toFixed(4)}, ${lng.toFixed(4)} · ±${Math.round(accuracy || 0)}m`;

  // ── Tracking view ──────────────────────────────────
  document.getElementById('map-addr-label').textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  document.getElementById('map-acc-label').textContent  = `GPS ±${Math.round(accuracy || 0)}m`;
  document.getElementById('acc-val').innerHTML =
    `${Math.round(accuracy || 0)} <span class="unit">m</span>`;

  // Speed
  const spd = speed || 0;
  document.getElementById('speed-val').innerHTML =
    `${spd.toFixed(1)} <span class="unit">m/s</span>`;
  document.getElementById('speed-status').textContent =
    spd < 0.5 ? 'Stationary' : spd < 2 ? 'Walking' : spd < 5 ? 'Running' : 'Vehicle';

  // ── Map pin position ───────────────────────────────
  updateMapPin(lat, lng);
  updateMap(lat, lng);

  // ── Location history ───────────────────────────────
  state.locationHistory.push({ lat, lng, t: new Date() });
  if (state.locationHistory.length > 20) state.locationHistory.shift();
  renderLocationHistory();

  // ── Risk score ─────────────────────────────────────
  updateRiskScore();
}

/** Move the map pin to a lat/lng position */
function updateMapPin(lat, lng) {
  const pin = document.getElementById('map-pin');
  // Map base: lat 28.4–28.8, lng 77.0–77.5 (New Delhi region)
  const px = ((lng - 77.0) / 0.5) * 100;
  const py = ((28.8 - lat) / 0.4) * 100;
  pin.style.left      = clamp(px, 5, 95) + '%';
  pin.style.top       = clamp(py, 5, 95) + '%';
  pin.style.transform = 'translate(-50%, -100%)';
}

/** Render location history list */
function renderLocationHistory() {
  const el = document.getElementById('location-history');
  if (!state.locationHistory.length) {
    el.innerHTML = '<div style="color:var(--text3)">No data yet</div>';
    return;
  }
  el.innerHTML = state.locationHistory
    .slice()
    .reverse()
    .slice(0, 8)
    .map(p => `
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)">
        <span>${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</span>
        <span style="color:var(--text3)">${p.t.toTimeString().slice(0, 8)}</span>
      </div>`)
    .join('');
}
