/**
 * @role renderer
 * @owns track-select rendering and track-count messaging
 * @not-owns track loading, folder permissions, playback behavior, or waveform-player controls
 * @notes Keep this file presentation-only.
 */

export function renderTracks(elements, tracks, currentTrackName) {
  elements.trackSelect.innerHTML = "";

  if (!tracks.length) {
    const option = document.createElement("option");
    option.textContent = "Pick a folder to load tracks";
    option.disabled = true;
    option.selected = true;
    elements.trackSelect.appendChild(option);
    elements.trackSelect.disabled = true;
    return;
  }

  tracks.forEach((track, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = track.name;
    if (track.name === currentTrackName) {
      option.selected = true;
    }
    elements.trackSelect.appendChild(option);
  });

  elements.trackSelect.disabled = false;
}

export function setTrackCount(elements, text) {
  elements.trackCount.textContent = text;
}