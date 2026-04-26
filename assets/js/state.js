/**
 * state.js — Global application state
 * Single source of truth for all app data
 */

const state = {
  // SOS
  sosActive:      false,
  sosStartTime:   null,
  sosTimerInterval: null,
  sosCount:       0,

  // Location
  coords:         null,           // { lat, lng, accuracy, speed, heading }
  locationHistory: [],            // Array of { lat, lng, t }

  // Risk
  riskScore:      0,
  riskLevel:      'low',         // low | medium | high | critical

  // Contacts
  contacts:       [],            // Array of { name, phone, email }

  // History
  history:        [],            // Array of SOS events

  // UI
  holdInterval:   null,
  countdownSec:   3,

  // Audio
  micActive:      false,
  recognition:    null,
  vizInterval:    null,

  // User
  userName:       'User',
};
