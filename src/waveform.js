import { clamp } from "./utils.js";

const COLORS = {
  background: "#f8fafc",
  waveform: "#cbd5e1",
  selectionFill: "rgba(59, 130, 246, 0.20)",
  selectionLine: "#2563eb",
  text: "#6b7280",
};

export function createWaveform({ mountEl, onSelectionChange }) {
  const canvas = document.createElement("canvas");
  canvas.className = "waveform-canvas";
  canvas.height = 140;
  canvas.style.touchAction = "none";
  mountEl.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  let audioBuffer = null;
  let selection = { start: null, end: null };
  let dragging = false;

  function resize() {
    canvas.width = Math.max(320, Math.floor(mountEl.clientWidth || 320));
    canvas.height = 140;
    draw();
  }

  window.addEventListener("resize", resize);

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerUp);

  resize();

  function getDuration() {
    return audioBuffer?.duration ?? 0;
  }

  function getNormalizedSelection() {
    const duration = getDuration();
    return {
      start: Number.isFinite(selection.start) ? clamp(selection.start, 0, duration) : null,
      end: Number.isFinite(selection.end) ? clamp(selection.end, 0, duration) : null,
    };
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

  function draw() {
    if (!audioBuffer) {
      drawPlaceholder("Pick a track to see the waveform.");
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const channelData = audioBuffer.getChannelData(0);
    const step = Math.max(1, Math.ceil(channelData.length / canvas.width));
    const amplitude = canvas.height / 2;

    ctx.fillStyle = COLORS.waveform;

    for (let x = 0; x < canvas.width; x += 1) {
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

      ctx.fillRect(x, (1 + min) * amplitude, 1, Math.max(1, (max - min) * amplitude));
    }

    drawSelection();
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

    draw();

    if (notify) {
      onSelectionChange?.({ ...getNormalizedSelection() });
    }
  }

  async function loadFile(file) {
    drawPlaceholder("Loading waveform…");

    const arrayBuffer = await file.arrayBuffer();
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextCtor) {
      audioBuffer = null;
      drawPlaceholder("Waveform preview is unavailable in this browser.");
      return;
    }

    const audioContext = new AudioContextCtor();

    try {
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      if (audioContext.close) {
        await audioContext.close();
      }
    }

    draw();
  }

  function clear() {
    audioBuffer = null;
    selection = { start: null, end: null };
    draw();
  }

  function handlePointerDown(event) {
    if (!audioBuffer) {
      return;
    }

    canvas.setPointerCapture(event.pointerId);
    dragging = true;

    const rect = canvas.getBoundingClientRect();
    const time = xToTime(event.clientX - rect.left);

    setSelection({ start: time, end: time }, { notify: true });
  }

  function handlePointerMove(event) {
    if (!dragging || !audioBuffer) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const time = xToTime(event.clientX - rect.left);

    setSelection({ start: selection.start, end: time }, { notify: true });
  }

  function handlePointerUp(event) {
    if (dragging && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    dragging = false;
  }

  return {
    clear,
    loadFile,
    setSelection,
    getSelection: () => ({ ...getNormalizedSelection() }),
  };
}
