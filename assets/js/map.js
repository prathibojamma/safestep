let map;
let marker;

function initMap(lat, lng) {
  if (map) return;

  map = L.map('map').setView([lat, lng], 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  marker = L.marker([lat, lng]).addTo(map);
}

function updateMap(lat, lng) {
  if (!map) {
    initMap(lat, lng);
    return;
  }

  marker.setLatLng([lat, lng]);
  map.setView([lat, lng], 15);
}
