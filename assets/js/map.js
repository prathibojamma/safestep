let map;
let marker;

window.updateMap = function(lat, lng) {
  if (!map) {
    map = L.map('map').setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    marker = L.marker([lat, lng]).addTo(map);
  } else {
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng], 15);
  }
};
