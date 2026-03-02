/**
 * @role renderer
 * @owns route-local audio element lifecycle, waveform decoding, peak caching, canvas rendering, embedded playback controls, seeking, loop state, playback-rate UI, selection display, and optional playback-bound enforcement
 * @not-owns persistence, saved-section business rules, or workspace route orchestration
 * @notes Keep redraws efficient; cache derived waveform data when possible.
 */

import { clamp, formatTime } from "./utils.js";

const COLORS = {
  background: "#f8fafc",
  waveform: "#cbd5e1",
  playedFill: "rgba(249, 115, 22, 0.12)",
  playheadLine: "#f97316",
  selectionFill: "rgba(59, 130, 246, 0.20)",
  selectionLine: "#2563eb",
  text: "#6b7280",
};

let playerInstanceCount = 0;

export function createWaveformPlayer({
  mountEl,
  initialPlaybackRate = 1,
  initialLoopEnabled = false,
  onSelectionChange,
  onPlaybackRateChange,
  onLoopChange,
  onPlaybackBoundsComplete,
}) {
  const playerId = ++playerInstanceCount;
  const speedInputId = `waveformPlayerSpeed-${playerId}`;
  const loopToggleId = `waveformPlayerLoop-${playerId}`;

  const root = document.createElement("div");
  root.className = "waveform-player";
  root.innerHTML = `
    <div class="waveform-player-toolbar">
      <div class="section-actions">
        <button type="button" class="secondary" data-player-el="playPause">Play</button>
      </div>

      <div class="small waveform-time" data-player-el="timeDisplay">0:00.00 / 0:00.00</div>
    </div>

    <div class="waveform-wrap" data-player-el="waveformMount"></div>

    <div class="waveform-player-controls">
      <div class="mastery-pill" data-player-el="abDisplay">A — • B —</div>

      <div class="waveform-player-field">
        <label for="${speedInputId}">Playback speed</label>
        <div class="waveform-player-speed-row">
          <input
            id="${speedInputId}"
            data-player-el="speed"
            type="range"
            min="0.5"
            max="1.5"
            step="0.05"
            value="${String(initialPlaybackRate)}"
            aria-label="Playback speed"
          />
          <span class="mastery-pill" data-player-el="speedVal">${Number(initialPlaybackRate).toFixed(2)}×</span>
        </div>
      </div>

      <label class="checkbox-label waveform-player-loop" for="${loopToggleId}">
        <input
          id="${loopToggleId}"
          data-player-el="loopToggle"
          type="checkbox"
          ${initialLoopEnabled ? "checked" : ""}
        />
        Loop section playback
      </label>
    </div>
  `;

  mountEl.appendChild(root);

  const playPauseButton = getRequiredElement(root, "playPause");
  const timeDisplay = getRequiredElement(root, "timeDisplay");
  const abDisplay = getRequiredElement(root, "abDisplay");
  const speedInput = getRequiredElement(root, "speed");
  const speedVal = getRequiredElement(root, "speedVal");
  const loopToggle = getRequiredElement(root, "loopToggle");
  const waveformMount = getRequiredElement(root, "waveformMount");

  const canvas = document.createElement("canvas");
  canvas.className = "waveform-canvas";
  canvas.height = 140;
  canvas.style.touchAction = "none";
  waveformMount.appendChild(canvas);

  const audio = document.createElement("audio");
  audio.preload = "metadata";
  audio.hidden = true;
  root.appendChild(audio);

  const ctx = canvas.getContext("2d");

  let objectUrl = null;
  let audioBuffer = null;
  let emptyWaveformMessage = "Pick a track to see the waveform.";
  let selection = { start: null, end: null };
  let playbackBounds = { start: null, end: null };
  let dragging = false;
  let pointerStartX = 0;
  let pointerStartTime = 0;
  let cachedPeaks = null;
  let cachedPeaksWidth = 0;
  let playbackRate = Number(initialPlaybackRate) || 1;
  let loopEnabled = Boolean(initialLoopEnabled);

  const handleResize = () => {
    resize();
  };

  const handlePlayPauseClick = () => {
    if (audio.paused) {
      void play();
      return;
    }

    pause();
  };

  const handleSpeedInput = (event) => {
    const nextValue = Number(event.target.value);
    setPlaybackRate(nextValue, { notify: true });
  };

  const handleLoopInput = (event) => {
    const enabled = Boolean(event.target.checked);
    setLoopEnabled(enabled, { notify: true });
  };

  const handleAudioTimeUpdate = () => {
    syncFromAudio();
    enforcePlaybackBounds();
  };

  const handleAudioMetadata = () => {
    syncFromAudio();
    draw();
    updateControlsDisabled();
  };

  const handleAudioPlay = () => {
    updatePlayPauseButton();
  };

  const handleAudioPause = () => {
    syncFromAudio();
    updatePlayPauseButton();
  };

  const handleAudioEnded = () => {
    syncFromAudio();
    updatePlayPauseButton();
  };

  const handleAudioSeeked = () => {
    syncFromAudio();
    enforcePlaybackBounds();
  };

  window.addEventListener("resize", handleResize);
  playPauseButton.addEventListener("click", handlePlayPauseClick);
  speedInput.addEventListener("input", handleSpeedInput);
  loopToggle.addEventListener("change", handleLoopInput);

  audio.addEventListener("timeupdate", handleAudioTimeUpdate);
  audio.addEventListener("loadedmetadata", handleAudioMetadata);
  audio.addEventListener("play", handleAudioPlay);
  audio.addEventListener("pause", handleAudioPause);
  audio.addEventListener("ended", handleAudioEnded);
  audio.addEventListener("seeked", handleAudioSeeked);

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);

  resize();
  setPlaybackRate(playbackRate);
  setLoopEnabled(loopEnabled);
  setSelection(selection);
  updateTimeDisplay();
  updatePlayPauseButton();
  updateControlsDisabled();

  function getDuration() {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      return audio.duration;
    }

    return audioBuffer?.duration ?? 0;
  }

  function getCurrentTime() {
    return Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  }

  function normalizeTime(value, duration = getDuration()) {
    if (!Number.isFinite(value)) {
      return null;
    }

    if (duration > 0) {
      return clamp(value, 0, duration);
    }

    return Math.max(0, value);
  }

  function normalizeRange(range) {
    return {
      start: normalizeTime(range?.start),
      end: normalizeTime(range?.end),
    };
  }

  function getNormalizedSelection() {
    return normalizeRange(selection);
  }

  function getNormalizedPlaybackBounds() {
    return normalizeRange(playbackBounds);
  }

  function updateControlsDisabled() {
    const hasTrack = Boolean(audio.getAttribute("src"));
    playPauseButton.disabled = !hasTrack;
  }

  function updatePlayPauseButton() {
    playPauseButton.textContent = audio.paused ? "Play" : "Pause";
  }

  function updateTimeDisplay() {
    timeDisplay.textContent = `${formatTime(getCurrentTime())} / ${formatTime(getDuration())}`;
  }

  function updateSelectionDisplay() {
    const current = getNormalizedSelection();
    abDisplay.textContent = `A ${formatTime(current.start)} • B ${formatTime(current.end)}`;
  }

  function updateSpeedDisplay() {
    speedVal.textContent = `${playbackRate.toFixed(2)}×`;
  }

  function syncFromAudio() {
    updateTimeDisplay();
    draw();
  }

  function releaseObjectUrl() {
    if (!objectUrl) {
      return;
    }

    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }

  function drawPlaceholder(message) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORS.text;
    ctx.font = "14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  }

  function xToTime(x) {
    const duration = getDuration();

    if (!duration) {
      return 0;
    }

    return (clamp(x, 0, canvas.width) / canvas.width) * duration;
  }

  function timeToX(time) {
    const duration = getDuration();

    if (!duration) {
      return 0;
    }

    return (clamp(time, 0, duration) / duration) * canvas.width;
  }

  function resize() {
    canvas.width = Math.max(320, Math.floor(waveformMount.clientWidth || 320));
    canvas.height = 140;
    draw();
  }

  function computePeaks() {
    if (!audioBuffer) {
      cachedPeaks = null;
      cachedPeaksWidth = 0;
      return null;
    }

    if (cachedPeaks && cachedPeaksWidth === canvas.width) {
      return cachedPeaks;
    }

    const channelData = audioBuffer.getChannelData(0);
    const width = canvas.width;
    const step = Math.max(1, Math.ceil(channelData.length / width));
    const peaks = new Array(width);

    for (let x = 0; x < width; x += 1) {
      let min = 1;
      let max = -1;
      const offset = x * step;

      for (let i = 0; i < step; i += 1) {
        const sample = channelData[offset + i];

        if (sample === undefined) {
          break;
        }

        if (sample < min) {
          min = sample;
        }

        if (sample > max) {
          max = sample;
        }
      }

      peaks[x] = { min, max };
    }

    cachedPeaks = peaks;
    cachedPeaksWidth = width;
    return peaks;
  }

  function draw() {
    if (!audioBuffer) {
      drawPlaceholder(emptyWaveformMessage);
      return;
    }

    const peaks = computePeaks();
    const amplitude = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = COLORS.waveform;

    for (let x = 0; x < canvas.width; x += 1) {
      const peak = peaks[x];
      ctx.fillRect(x, (1 + peak.min) * amplitude, 1, Math.max(1, (peak.max - peak.min) * amplitude));
    }

    drawPlaybackRegion();
    drawSelection();
    drawPlayhead();
  }

  function drawMarker(time, label) {
    const x = timeToX(time);

    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = COLORS.selectionLine;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = COLORS.selectionLine;
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, Math.min(canvas.width - 20, x + 4), 6);
  }

  function drawPlaybackRegion() {
    const currentTime = normalizeTime(getCurrentTime());

    if (currentTime == null) {
      return;
    }

    const x = timeToX(currentTime);

    if (x <= 0) {
      return;
    }

    ctx.fillStyle = COLORS.playedFill;
    ctx.fillRect(0, 0, x, canvas.height);
  }

  function drawPlayhead() {
    const currentTime = normalizeTime(getCurrentTime());

    if (currentTime == null) {
      return;
    }

    const x = timeToX(currentTime);

    ctx.strokeStyle = COLORS.playheadLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function drawSelection() {
    const current = getNormalizedSelection();

    if (current.start == null && current.end == null) {
      return;
    }

    if (current.start != null && current.end != null) {
      const startX = timeToX(current.start);
      const endX = timeToX(current.end);

      ctx.fillStyle = COLORS.selectionFill;
      ctx.fillRect(Math.min(startX, endX), 0, Math.abs(endX - startX), canvas.height);
    }

    if (current.start != null) {
      drawMarker(current.start, "A");
    }

    if (current.end != null) {
      drawMarker(current.end, "B");
    }
  }

  function setSelection(nextSelection, { notify = false } = {}) {
    selection = {
      start: Number.isFinite(nextSelection?.start) ? nextSelection.start : null,
      end: Number.isFinite(nextSelection?.end) ? nextSelection.end : null,
    };

    updateSelectionDisplay();
    draw();

    if (notify) {
      onSelectionChange?.({ ...getNormalizedSelection() });
    }
  }

  function setPlaybackBounds(nextBounds) {
    playbackBounds = {
      start: Number.isFinite(nextBounds?.start) ? nextBounds.start : null,
      end: Number.isFinite(nextBounds?.end) ? nextBounds.end : null,
    };
  }

  function clearPlaybackBounds() {
    setPlaybackBounds({ start: null, end: null });
  }

  function setPlaybackRate(value, { notify = false } = {}) {
    const normalized = clamp(Number(value) || 1, 0.5, 1.5);
    playbackRate = normalized;
    speedInput.value = String(normalized);
    audio.playbackRate = normalized;
    updateSpeedDisplay();

    if (notify) {
      onPlaybackRateChange?.(normalized);
    }
  }

  function setLoopEnabled(enabled, { notify = false } = {}) {
    loopEnabled = Boolean(enabled);
    loopToggle.checked = loopEnabled;

    if (notify) {
      onLoopChange?.(loopEnabled);
    }
  }

  async function loadFile(file) {
    pause();
    releaseObjectUrl();

    emptyWaveformMessage = "Loading waveform…";
    drawPlaceholder(emptyWaveformMessage);

    const nextObjectUrl = URL.createObjectURL(file);
    objectUrl = nextObjectUrl;

    const loadMetadataPromise = new Promise((resolve, reject) => {
      const handleLoadedMetadata = () => {
        cleanup();
        resolve();
      };

      const handleError = () => {
        cleanup();
        reject(audio.error || new Error(`Unable to load audio file "${file.name}".`));
      };

      const cleanup = () => {
        audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
        audio.removeEventListener("error", handleError);
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audio.addEventListener("error", handleError);

      audio.src = nextObjectUrl;
      audio.load();
    });

    const decodePromise = decodeAudioFile(file);

    const [, decodeResult] = await Promise.all([loadMetadataPromise, decodePromise]);

    audioBuffer = decodeResult.audioBuffer;
    cachedPeaks = null;
    cachedPeaksWidth = 0;
    audio.currentTime = 0;
    audio.playbackRate = playbackRate;

    emptyWaveformMessage = decodeResult.unsupported
      ? "Waveform preview is unavailable in this browser."
      : "Pick a track to see the waveform.";

    updateControlsDisabled();
    updateTimeDisplay();
    draw();
  }

  async function decodeAudioFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextCtor) {
      return {
        audioBuffer: null,
        unsupported: true,
      };
    }

    const audioContext = new AudioContextCtor();

    try {
      const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      return {
        audioBuffer: decoded,
        unsupported: false,
      };
    } finally {
      if (audioContext.close) {
        await audioContext.close();
      }
    }
  }

  function clear() {
    pause();
    releaseObjectUrl();

    audio.removeAttribute("src");
    audio.load();

    audioBuffer = null;
    emptyWaveformMessage = "Pick a track to see the waveform.";
    selection = { start: null, end: null };
    playbackBounds = { start: null, end: null };
    cachedPeaks = null;
    cachedPeaksWidth = 0;

    updateSelectionDisplay();
    updateTimeDisplay();
    updateControlsDisabled();
    updatePlayPauseButton();
    draw();
  }

  async function play() {
    if (!audio.getAttribute("src")) {
      return;
    }

    const bounds = getNormalizedPlaybackBounds();

    if (bounds.start != null && bounds.end != null) {
      const currentTime = getCurrentTime();

      if (currentTime < bounds.start || currentTime >= bounds.end) {
        audio.currentTime = bounds.start;
      }
    }

    await audio.play();
  }

  function pause() {
    audio.pause();
  }

  function seek(time) {
    const duration = getDuration();

    if (!duration) {
      return;
    }

    audio.currentTime = clamp(Number(time) || 0, 0, duration);
    syncFromAudio();
  }

  function enforcePlaybackBounds() {
    const bounds = getNormalizedPlaybackBounds();

    if (bounds.start == null || bounds.end == null) {
      return;
    }

    if (getCurrentTime() < bounds.end) {
      return;
    }

    if (loopEnabled) {
      audio.currentTime = bounds.start;
      syncFromAudio();
      return;
    }

    const wasPlaying = !audio.paused;
    pause();
    audio.currentTime = bounds.end;
    syncFromAudio();

    if (wasPlaying) {
      onPlaybackBoundsComplete?.({ ...bounds });
    }
  }

  function destroy() {
    pause();
    releaseObjectUrl();

    window.removeEventListener("resize", handleResize);
    playPauseButton.removeEventListener("click", handlePlayPauseClick);
    speedInput.removeEventListener("input", handleSpeedInput);
    loopToggle.removeEventListener("change", handleLoopInput);

    audio.removeEventListener("timeupdate", handleAudioTimeUpdate);
    audio.removeEventListener("loadedmetadata", handleAudioMetadata);
    audio.removeEventListener("play", handleAudioPlay);
    audio.removeEventListener("pause", handleAudioPause);
    audio.removeEventListener("ended", handleAudioEnded);
    audio.removeEventListener("seeked", handleAudioSeeked);

    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerup", handlePointerUp);
    canvas.removeEventListener("pointercancel", handlePointerUp);

    root.remove();
  }

  function handlePointerDown(event) {
    if (!audioBuffer) {
      return;
    }

    canvas.setPointerCapture(event.pointerId);
    dragging = false;
    pointerStartX = event.clientX;

    const rect = canvas.getBoundingClientRect();
    pointerStartTime = xToTime(event.clientX - rect.left);
  }

  function handlePointerMove(event) {
    if (!canvas.hasPointerCapture(event.pointerId) || !audioBuffer) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const nextTime = xToTime(event.clientX - rect.left);

    if (!dragging && Math.abs(event.clientX - pointerStartX) >= 4) {
      dragging = true;
    }

    if (!dragging) {
      return;
    }

    setSelection(
      {
        start: pointerStartTime,
        end: nextTime,
      },
      { notify: true },
    );
  }

  function handlePointerUp(event) {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    if (!audioBuffer) {
      dragging = false;
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const nextTime = xToTime(event.clientX - rect.left);

    if (dragging) {
      setSelection(
        {
          start: pointerStartTime,
          end: nextTime,
        },
        { notify: true },
      );
      dragging = false;
      return;
    }

    seek(nextTime);
    dragging = false;
  }

  return {
    clear,
    destroy,
    loadFile,
    play,
    pause,
    seek,
    setSelection,
    getSelection: () => ({ ...getNormalizedSelection() }),
    setPlaybackBounds,
    clearPlaybackBounds,
    setPlaybackRate,
    setLoopEnabled,
    getCurrentTime,
  };
}

function getRequiredElement(root, name) {
  const element = root.querySelector(`[data-player-el="${name}"]`);

  if (!element) {
    throw new Error(`Missing waveform player element: ${name}`);
  }

  return element;
}