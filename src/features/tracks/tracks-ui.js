/**
 * @role renderer
 * @owns track-select rendering, track-count messaging, and speed display rendering
 * @not-owns track loading, folder permissions, or playback behavior
 * @notes Keep this file presentation-only.
 */

import { elements } from "../../shared/shell-ui.js";

export function renderTracks(tracks, currentTrackName) {
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

export function setTrackCount(text) {
  elements.trackCount.textContent = text;
}

export function setSpeedDisplay(value) {
  elements.speedVal.textContent = `${Number(value).toFixed(2)}×`;
}