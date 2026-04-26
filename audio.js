/**
 * audio.js — Audio Monitoring & Speech Recognition
 *
 * Uses Web Speech API for real-time transcription.
 * Pipes transcript to keyword detector every result event.
 * Auto-triggers SOS if distress keywords detected.
 */

/** Toggle microphone monitoring on/off */
function toggleMicMonitor() {
  if (state.micActive) {
    stopMicMonitor();
  } else {
    startAudioMonitor();
  }
}

/** Start audio monitoring */
async function startAudioMonitor() {
  if (state.micActive) return;

  try {
    // Request mic permission
    await navigator.mediaDevices.getUserMedia({ audio: true });

    state.micActive = true;
    _setMicButtonActive(true);
    addLog('ai-log', '🎙️', 'Audio monitoring active', 'Listening for distress keywords');

    // Build visualizer bars
    _buildVizBars();
    state.vizInterval = setInterval(_animateVizBars, 100);

    // Start speech recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      _startSpeechRecognition();
    } else {
      document.getElementById('ai-output').textContent =
        'Speech API not available in this browser. Use Text Analysis tab instead.';
    }

  } catch (err) {
    addLog('warn-log', '⚠️', 'Microphone denied', 'Use Text Analysis tab to test AI');
    document.getElementById('ai-output').textContent =
      'Microphone access denied. Use the Text Analysis tab to test AI threat detection.';
  }
}

/** Stop audio monitoring */
function stopMicMonitor() {
  state.micActive = false;
  clearInterval(state.vizInterval);
  state.recognition?.stop();
  state.recognition = null;

  _setMicButtonActive(false);
  document.getElementById('audio-viz').innerHTML = '';
  document.getElementById('ai-output').textContent = 'Monitoring stopped.';
  addLog('ai-log', '⏹', 'Audio monitoring stopped', '');
}

// ── Private helpers ───────────────────────────────────────────────────────────

function _startSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  state.recognition = new SR();
  state.recognition.continuous     = true;
  state.recognition.interimResults = true;
  state.recognition.lang           = 'en-US';

  state.recognition.onresult = (event) => {
    const text = Array.from(event.results)
      .map(r => r[0].transcript)
      .join(' ');

    document.getElementById('ai-output').textContent = text;

    const kw = detectKeywords(text);
    renderKeywordChips(kw.found);

    if (kw.shouldTrigger && !state.sosActive) {
      addLog('sos-log', '🚨', 'THREAT DETECTED via audio!',
        `Keywords: ${kw.found.map(k => k.kw).join(', ')}`);
      setTimeout(() => triggerSOS('keyword'), 500);
    }
  };

  state.recognition.onend = () => {
    // Auto-restart if still active
    if (state.micActive) {
      try { state.recognition.start(); } catch (_) {}
    }
  };

  state.recognition.onerror = (e) => {
    if (e.error !== 'aborted') {
      addLog('warn-log', '⚠️', `Speech error: ${e.error}`, '');
    }
  };

  state.recognition.start();
  document.getElementById('ai-output').textContent =
    'Listening… say "help" or "I need help" to test auto-SOS detection.';
}

function _setMicButtonActive(active) {
  const btn = document.getElementById('mic-btn');
  if (active) {
    btn.textContent        = '⏹ Stop Monitoring';
    btn.style.background   = 'rgba(232,39,26,.15)';
    btn.style.color        = 'var(--red)';
    btn.style.borderColor  = 'rgba(232,39,26,.3)';
  } else {
    btn.textContent        = '🎙️ Start Monitoring';
    btn.style.background   = '';
    btn.style.color        = '';
    btn.style.borderColor  = '';
  }
}

function _buildVizBars() {
  const viz = document.getElementById('audio-viz');
  viz.innerHTML = Array.from({ length: 20 }, (_, i) =>
    `<div class="viz-bar" id="vbar${i}" style="height:${Math.random() * 30 + 5}px"></div>`
  ).join('');
}

function _animateVizBars() {
  for (let i = 0; i < 20; i++) {
    const b = document.getElementById('vbar' + i);
    if (b) b.style.height = (Math.random() * 32 + 4) + 'px';
  }
}