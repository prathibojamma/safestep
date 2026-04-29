// ── audio.js ──────────────────────────────────────────────────────────────────
// Audio monitoring: mic permission check, Web Speech API, keyword scoring, visualiser

let _recognition  = null;
let _micActive    = false;
let _audioCtx     = null;
let _analyser     = null;
let _vizFrame     = null;
let _micStream    = null;
let _micPermOk    = false;  // tracks if mic is actually granted

// ── Check mic permission before doing anything ────────────────────────────────
async function ensureMicPermission() {
  if (_micPermOk) return true;

  try {
    // Try Permissions API first (no prompt)
    const perm = await navigator.permissions.query({ name: 'microphone' });
    if (perm.state === 'denied') {
      showMicDeniedError();
      return false;
    }
    if (perm.state === 'granted') {
      _micPermOk = true;
      return true;
    }
  } catch {}

  // state is 'prompt' — request it now
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    _micPermOk = true;
    enableMicUI && enableMicUI();
    return true;
  } catch (err) {
    _micPermOk = false;
    showMicDeniedError();
    disableMicUI && disableMicUI();
    return false;
  }
}

function showMicDeniedError() {
  appendAIOutput('❌ Microphone blocked. Click 🔒 in the address bar → allow microphone → refresh.');
  showToast && showToast('Microphone access denied', 'error', 6000);
  logEvent && logEvent('❌ Microphone blocked — check browser settings');
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function toggleMicMonitor() {
  _micActive ? stopAudioMonitor() : startAudioMonitor();
}

// ── Start ─────────────────────────────────────────────────────────────────────
async function startAudioMonitor() {
  if (_micActive) return;

  // 1. Check/request mic permission first
  const ok = await ensureMicPermission();
  if (!ok) return;

  // 2. Check Speech API support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    appendAIOutput('⚠️ Speech recognition not supported. Use Chrome or Edge.');
    showToast && showToast('Speech recognition not supported', 'warning');
    return;
  }

  // 3. Start raw mic stream for visualiser
  const streamOk = await startRawMicStream();
  if (!streamOk) return;

  // 4. Start speech recognition
  _recognition = new SpeechRecognition();
  _recognition.continuous    = true;
  _recognition.interimResults = true;
  _recognition.lang          = 'en-US';

  _recognition.onstart = () => {
    _micActive = true;
    updateMicBtn(true);
    logEvent && logEvent('🎙️ Audio monitor started');
    appendAIOutput('🎙️ Listening… speak naturally. SafeGuard is monitoring for distress.');
    startVisualiser();
  };

  _recognition.onresult = (e) => {
    let interim = '';
    let finalText = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      e.results[i].isFinal ? (finalText += t) : (interim += t);
    }
    // Show interim live in output box
    if (interim) {
      const outEl = document.getElementById('ai-output');
      const lastLine = outEl?.querySelector('.ai-interim');
      if (lastLine) {
        lastLine.querySelector('.ai-interim-text').textContent = interim;
      } else if (outEl) {
        const d = document.createElement('div');
        d.className = 'ai-line ai-interim';
        d.innerHTML = '<span class="ai-ts">' + new Date().toLocaleTimeString() + '</span>'
                    + ' <span class="ai-interim-text" style="opacity:.5">' + interim + '</span>';
        outEl.appendChild(d);
        outEl.scrollTop = outEl.scrollHeight;
      }
    }
    if (finalText) {
      // Remove interim line
      document.querySelector('.ai-interim')?.remove();
      processTranscript(finalText.trim());
    }
  };

  _recognition.onerror = (e) => {
    if (e.error === 'not-allowed') {
      _micPermOk = false;
      _micActive = false;
      updateMicBtn(false);
      showMicDeniedError();
      stopRawMicStream();
    } else if (e.error === 'no-speech') {
      // Normal — just waiting
    } else if (e.error === 'network') {
      appendAIOutput('⚠️ Network error — speech recognition needs internet.');
    } else {
      appendAIOutput('⚠️ Speech error: ' + e.error);
    }
  };

  _recognition.onend = () => {
    // Auto-restart while still active (speech API stops after silence)
    if (_micActive) {
      setTimeout(() => {
        if (_micActive && _recognition) {
          try { _recognition.start(); } catch {}
        }
      }, 300);
    }
  };

  try {
    _recognition.start();
  } catch (err) {
    appendAIOutput('❌ Could not start speech recognition: ' + err.message);
    _micActive = false;
    updateMicBtn(false);
  }
}

// ── Stop ──────────────────────────────────────────────────────────────────────
function stopAudioMonitor() {
  _micActive = false;
  if (_recognition) {
    try { _recognition.stop(); } catch {}
    _recognition = null;
  }
  stopVisualiser();
  stopRawMicStream();
  updateMicBtn(false);
  logEvent && logEvent('🎙️ Audio monitor stopped');
  appendAIOutput('⏹️ Monitor stopped.');
}

// ── Process transcript ────────────────────────────────────────────────────────
function processTranscript(text) {
  if (!text) return;

  const result = window.scoreText ? window.scoreText(text) : { score: 0, level: 'none', matches: [] };

  // Risk colour
  const colours = { none:'#888', low:'#60a5fa', medium:'#f59e0b', high:'#f97316', critical:'#E8271A' };
  const col = colours[result.level] || '#888';
  appendAIOutput(
    '📝 <span style="opacity:.8">"' + text + '"</span>'
    + ' → <span style="color:' + col + ';font-weight:700">' + result.level.toUpperCase()
    + ' (' + result.score + '%)</span>'
  );

  if (window.state) state._lastKeywordScore = result.score;

  renderKeywordChips(result.matches);
  calculateRisk && calculateRisk();

  const voiceOn = document.getElementById('voice-toggle')?.checked;

  if (result.level === 'critical') {
    logEvent && logEvent('🚨 Critical phrase: "' + text + '"');
    showToast && showToast('🚨 Distress detected — triggering SOS', 'error', 6000);
    vibrate && vibrate([400, 100, 400, 100, 400]);
    if (voiceOn) {
      triggerSOS && triggerSOS('voice');
    } else {
      // Even without voice SOS, flash a strong warning
      showToast && showToast('⚠️ Enable Voice SOS in settings to auto-trigger', 'warning', 5000);
    }
  } else if (result.level === 'high') {
    logEvent && logEvent('⚠️ High-risk phrase: "' + text + '"');
    showToast && showToast('⚠️ Distress phrase detected', 'warning', 4000);
    vibrate && vibrate([200, 100, 200]);
  }
}

// ── Keyword chips ─────────────────────────────────────────────────────────────
function renderKeywordChips(matches) {
  const el = document.getElementById('keyword-chips');
  if (!el) return;
  if (!matches || !matches.length) { el.innerHTML = ''; return; }
  const cols = { critical:'#E8271A', high:'#f97316', medium:'#f59e0b', low:'#60a5fa' };
  el.innerHTML = matches.map(m =>
    '<span class="kw-chip" style="border-color:' + (cols[m.level]||'#888')
    + ';color:' + (cols[m.level]||'#888') + '">' + m.word + '</span>'
  ).join('');
}

// ── AI output log ─────────────────────────────────────────────────────────────
function appendAIOutput(html) {
  const el = document.getElementById('ai-output');
  if (!el) return;
  // Clear placeholder text on first real entry
  if (el.dataset.placeholder) {
    el.innerHTML = '';
    delete el.dataset.placeholder;
  }
  const line = document.createElement('div');
  line.className = 'ai-line';
  line.innerHTML = '<span class="ai-ts">' + new Date().toLocaleTimeString() + '</span> ' + html;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

// ── Raw mic stream for visualiser ─────────────────────────────────────────────
async function startRawMicStream() {
  try {
    _micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    _audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
    _analyser  = _audioCtx.createAnalyser();
    _analyser.fftSize = 64;
    const src = _audioCtx.createMediaStreamSource(_micStream);
    src.connect(_analyser);
    return true;
  } catch (err) {
    _micPermOk = false;
    showMicDeniedError();
    return false;
  }
}

function stopRawMicStream() {
  if (_vizFrame) { cancelAnimationFrame(_vizFrame); _vizFrame = null; }
  if (_micStream) { _micStream.getTracks().forEach(t => t.stop()); _micStream = null; }
  if (_audioCtx)  { try { _audioCtx.close(); } catch {} _audioCtx = null; }
  _analyser = null;
  const el = document.getElementById('audio-viz');
  if (el) el.innerHTML = '';
}

// ── Visualiser ────────────────────────────────────────────────────────────────
function startVisualiser() {
  const container = document.getElementById('audio-viz');
  if (!container) return;
  container.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.width  = 160;
  canvas.height = 44;
  canvas.style.cssText = 'display:block;border-radius:8px;background:rgba(255,255,255,.04);';
  container.appendChild(canvas);
  drawVisualiser(canvas);
}

function drawVisualiser(canvas) {
  if (!_analyser || !canvas) return;
  const ctx  = canvas.getContext('2d');
  const data = new Uint8Array(_analyser.frequencyBinCount);

  function frame() {
    _vizFrame = requestAnimationFrame(frame);
    _analyser.getByteFrequencyData(data);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barW = (canvas.width / data.length) - 1;
    data.forEach((v, i) => {
      const h    = (v / 255) * canvas.height;
      const alpha = 0.5 + (v / 255) * 0.5;
      ctx.fillStyle = 'rgba(232,39,26,' + alpha + ')';
      ctx.fillRect(i * (barW + 1), canvas.height - h, barW, h);
    });
  }
  frame();
}

function stopVisualiser() {
  if (_vizFrame) { cancelAnimationFrame(_vizFrame); _vizFrame = null; }
  const el = document.getElementById('audio-viz');
  if (el) el.innerHTML = '';
}

// ── Mic button ────────────────────────────────────────────────────────────────
function updateMicBtn(active) {
  const btn = document.getElementById('mic-btn');
  if (!btn) return;
  if (active) {
    btn.textContent = '⏹️ Stop Monitoring';
    btn.style.background = '#E8271A';
    btn.style.color = '#fff';
  } else {
    btn.textContent = '🎙️ Start Monitoring';
    btn.style.background = '';
    btn.style.color = '';
  }
}

// ── Voice SOS (called from home screen quick action) ──────────────────────────
async function triggerVoiceSOS() {
  // Start monitoring first if not already
  if (!_micActive) {
    await startAudioMonitor();
  }
  // Immediately trigger SOS as well
  triggerSOS && triggerSOS('voice');
}

// ── Exports ───────────────────────────────────────────────────────────────────
window.toggleMicMonitor  = toggleMicMonitor;
window.startAudioMonitor = startAudioMonitor;
window.stopAudioMonitor  = stopAudioMonitor;
window.triggerVoiceSOS   = triggerVoiceSOS;
window.appendAIOutput    = appendAIOutput;
