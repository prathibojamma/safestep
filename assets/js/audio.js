// ── audio.js ──────────────────────────────────────────────────────────────────
// Audio monitoring: Web Speech API transcript, keyword scoring, visualiser

let _recognition   = null;
let _micActive     = false;
let _audioCtx      = null;
let _analyser      = null;
let _vizFrame      = null;
let _micStream     = null;

// ── Toggle mic ────────────────────────────────────────────────────────────────
function toggleMicMonitor() {
  _micActive ? stopAudioMonitor() : startAudioMonitor();
}

function startAudioMonitor() {
  if (_micActive) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Speech recognition not supported in this browser', 'warning');
    appendAIOutput('⚠️ Speech recognition not supported. Try Chrome or Edge.');
    return;
  }

  _recognition = new SpeechRecognition();
  _recognition.continuous   = true;
  _recognition.interimResults = true;
  _recognition.lang         = 'en-US';

  _recognition.onstart = () => {
    _micActive = true;
    updateMicBtn(true);
    logEvent('🎙️ Audio monitor started');
    appendAIOutput('🎙️ Listening… speak naturally.');
    startVisualiser();
  };

  _recognition.onresult = (e) => {
    let interim = '';
    let final_  = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      e.results[i].isFinal ? (final_ += t) : (interim += t);
    }

    if (final_) {
      processTranscript(final_.trim());
    }

    const outEl = document.getElementById('ai-output');
    if (outEl && interim) outEl.textContent = `[…] ${interim}`;
  };

  _recognition.onerror = (e) => {
    if (e.error === 'not-allowed') {
      showToast('Microphone access denied', 'error');
      appendAIOutput('❌ Mic access denied — please allow microphone in browser settings.');
    } else if (e.error !== 'no-speech') {
      appendAIOutput(`⚠️ Speech error: ${e.error}`);
    }
  };

  _recognition.onend = () => {
    // Auto-restart unless manually stopped
    if (_micActive) {
      setTimeout(() => _recognition && _recognition.start(), 500);
    }
  };

  _recognition.start();
  startRawMicStream(); // for visualiser
}

function stopAudioMonitor() {
  _micActive = false;
  if (_recognition) { _recognition.stop(); _recognition = null; }
  stopVisualiser();
  stopRawMicStream();
  updateMicBtn(false);
  logEvent('🎙️ Audio monitor stopped');
}

// ── Process transcript ────────────────────────────────────────────────────────
function processTranscript(text) {
  if (!text) return;
  const result = window.scoreText(text);

  appendAIOutput(`📝 "${text}" → Risk: ${result.score}% (${result.level})`);

  // Update state for risk module
  if (window.state) state._lastKeywordScore = result.score;

  // Highlight matched keywords
  renderKeywordChips(result.matches);

  // Check voice activation setting
  const voiceOn = document.getElementById('voice-toggle')?.checked;

  if (result.level === 'critical') {
    logEvent(`🚨 Critical keyword detected: "${text}"`);
    showToast('🚨 Distress detected!', 'error', 6000);
    vibrate([400, 100, 400]);
    if (voiceOn) triggerSOS('voice');
  } else if (result.level === 'high') {
    logEvent(`⚠️ High-risk phrase: "${text}"`);
    showToast('⚠️ Distress phrase detected', 'warning', 4000);
  }

  calculateRisk && calculateRisk();
}

// ── Keyword chips ─────────────────────────────────────────────────────────────
function renderKeywordChips(matches) {
  const el = document.getElementById('keyword-chips');
  if (!el || !matches.length) return;

  const colors = { critical:'#E8271A', high:'#f97316', medium:'#f59e0b', low:'#60a5fa' };
  el.innerHTML = matches.map(m => `
    <span class="kw-chip" style="border-color:${colors[m.level]};color:${colors[m.level]}">
      ${m.word}
    </span>
  `).join('');
}

// ── AI output log ─────────────────────────────────────────────────────────────
function appendAIOutput(text) {
  const el = document.getElementById('ai-output');
  if (!el) return;
  const line = document.createElement('div');
  line.className = 'ai-line';
  line.innerHTML = `<span class="ai-ts">${new Date().toLocaleTimeString()}</span> ${escHtml(text)}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ── Mic visualiser (canvas bars) ─────────────────────────────────────────────
function startRawMicStream() {
  navigator.mediaDevices?.getUserMedia({ audio: true }).then(stream => {
    _micStream = stream;
    _audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
    _analyser  = _audioCtx.createAnalyser();
    _analyser.fftSize = 64;
    const src = _audioCtx.createMediaStreamSource(stream);
    src.connect(_analyser);
    drawVisualiser();
  }).catch(() => {}); // silently fail if denied
}

function stopRawMicStream() {
  cancelAnimationFrame(_vizFrame);
  _vizFrame = null;
  if (_micStream) { _micStream.getTracks().forEach(t => t.stop()); _micStream = null; }
  if (_audioCtx)  { _audioCtx.close(); _audioCtx = null; }
  const el = document.getElementById('audio-viz');
  if (el) el.innerHTML = '';
}

function startVisualiser() {
  // Ensure container has canvas
  const container = document.getElementById('audio-viz');
  if (!container) return;
  if (!container.querySelector('canvas')) {
    const canvas = document.createElement('canvas');
    canvas.width = 120; canvas.height = 40;
    canvas.style.cssText = 'display:block;border-radius:6px;background:rgba(255,255,255,.04)';
    container.appendChild(canvas);
  }
}

function drawVisualiser() {
  if (!_analyser) return;
  const container = document.getElementById('audio-viz');
  const canvas    = container?.querySelector('canvas');
  if (!canvas) return;

  const ctx  = canvas.getContext('2d');
  const data = new Uint8Array(_analyser.frequencyBinCount);

  function frame() {
    _vizFrame = requestAnimationFrame(frame);
    _analyser.getByteFrequencyData(data);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barW = canvas.width / data.length;
    data.forEach((v, i) => {
      const h = (v / 255) * canvas.height;
      const hue = 0; // red
      ctx.fillStyle = `hsl(${hue},80%,${40 + (v/255)*30}%)`;
      ctx.fillRect(i * barW, canvas.height - h, barW - 1, h);
    });
  }
  frame();
}

// ── Mic button state ──────────────────────────────────────────────────────────
function updateMicBtn(active) {
  const btn = document.getElementById('mic-btn');
  if (!btn) return;
  btn.textContent = active ? '⏹️ Stop Monitoring' : '🎙️ Start Monitoring';
  btn.style.background = active ? '#E8271A' : '';
}

// ── Inject styles ─────────────────────────────────────────────────────────────

window.toggleMicMonitor  = toggleMicMonitor;
window.startAudioMonitor = startAudioMonitor;
window.stopAudioMonitor  = stopAudioMonitor;
