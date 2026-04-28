// ── state.js ──────────────────────────────────────────────────────────────────
// Central state — all modules read/write here

window.state = {
  // GPS
  position:   null,   // { lat, lng, accuracy, speed, address }
  lastLat:    null,
  lastLng:    null,

  // SOS
  sosActive:      false,
  sosStartTime:   null,
  sosTimerHandle: null,
  sosCount:       0,

  // Risk
  riskScore:  0,
  riskLevel:  'low',   // low | medium | high | critical

  // Audio / AI
  micActive:       false,
  recognition:     null,
  audioContext:    null,
  analyserNode:    null,
  micStream:       null,

  // Settings
  settings: {
    name:        'User',
    countdown:   3,
    voice:       true,
    riskAlert:   true,
  },
};
