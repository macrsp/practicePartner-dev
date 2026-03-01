/**
 * @role renderer
 * @owns selection display, mastery display, section summary messaging, and saved-section list rendering
 * @not-owns section state transitions, persistence, or playback rules
 * @notes Keep this file presentation-only.
 */

import { elements } from "../../shared/shell-ui.js";
import { createSectionLabel, formatTime } from "../../shared/utils.js";

export function setSelectionDisplay(start, end) {
  elements.abDisplay.textContent = `A ${formatTime(start)} • B ${formatTime(end)}`;
}

export function setMasteryDisplay(value) {
  elements.masteryDisplay.textContent = Number.isFinite(value) ? value.toFixed(2) : "—";
}

export function renderSections({
  sections,
  activeSectionId,
  currentTrackName,
  onFocus,
  onPlay,
  onDelete,
}) {
  elements.sectionList.innerHTML = "";

  if (!currentTrackName) {
    elements.sectionSummary.textContent = "Select a track to view saved sections for that track.";

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Select a track to browse and manage its saved sections.";
    elements.sectionList.appendChild(empty);
    return;
  }

  elements.sectionSummary.textContent = sections.length
    ? `Showing ${sections.length} saved section${sections.length === 1 ? "" : "s"} for ${currentTrackName}.`
    : `No saved sections for ${currentTrackName} yet.`;

  if (!sections.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Drag on the waveform to select a range, then save it as a section for this track.";
    elements.sectionList.appendChild(empty);
    return;
  }

  sections.forEach((section) => {
    const row = document.createElement("div");
    row.className = "section-row";
    if (section.id === activeSectionId) {
      row.classList.add("is-active");
    }

    const main = document.createElement("div");
    main.className = "section-main";

    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = createSectionLabel(section);

    const meta = document.createElement("div");
    meta.className = "section-meta";
    meta.textContent =
      `${section.trackName} • plays ${section.playCount} • mastery ${section.mastery.toFixed(2)} • ` +
      `last played ${section.lastPlayed ? new Date(section.lastPlayed).toLocaleString() : "never"}`;

    main.appendChild(title);
    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "section-actions";

    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.textContent = "Play";
    playButton.addEventListener("click", (event) => {
      event.stopPropagation();
      onPlay(section.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      onDelete(section.id);
    });

    actions.appendChild(playButton);
    actions.appendChild(deleteButton);

    row.appendChild(main);
    row.appendChild(actions);
    row.addEventListener("click", () => onFocus(section.id));

    elements.sectionList.appendChild(row);
  });
}