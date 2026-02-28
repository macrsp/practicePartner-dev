/**
 * @role renderer
 * @owns DOM element lookup and rendering of profiles, tracks, section lists, and simple status displays
 * @not-owns application state transitions, persistence, or playback rules
 * @notes Keep this file presentation-only.
 */

import { createSectionLabel, formatTime } from "./utils.js";

export const elements = {
  profileSelect: document.getElementById("profileSelect"),
  newProfile: document.getElementById("newProfile"),
  pickFolder: document.getElementById("pickFolder"),
  trackCount: document.getElementById("trackCount"),
  trackSelect: document.getElementById("trackSelect"),
  markA: document.getElementById("markA"),
  markB: document.getElementById("markB"),
  saveSection: document.getElementById("saveSection"),
  adaptivePlay: document.getElementById("adaptivePlay"),
  loopToggle: document.getElementById("loopToggle"),
  speed: document.getElementById("speed"),
  speedVal: document.getElementById("speedVal"),
  masteryDisplay: document.getElementById("masteryDisplay"),
  abDisplay: document.getElementById("abDisplay"),
  sectionSummary: document.getElementById("sectionSummary"),
  sectionList: document.getElementById("sectionList"),
  waveformMount: document.getElementById("waveformMount"),
  audio: document.getElementById("audio"),
};

export function renderProfiles(profiles, currentProfileId) {
  elements.profileSelect.innerHTML = "";

  if (!profiles.length) {
    const option = document.createElement("option");
    option.textContent = "No profiles";
    option.disabled = true;
    option.selected = true;
    elements.profileSelect.appendChild(option);
    elements.profileSelect.disabled = true;
    return;
  }

  profiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = String(profile.id);
    option.textContent = profile.name;
    elements.profileSelect.appendChild(option);
  });

  elements.profileSelect.disabled = false;
  elements.profileSelect.value = String(currentProfileId);
}

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

export function setSelectionDisplay(start, end) {
  elements.abDisplay.textContent = `A ${formatTime(start)} • B ${formatTime(end)}`;
}

export function setSpeedDisplay(value) {
  elements.speedVal.textContent = `${Number(value).toFixed(2)}×`;
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

  const currentTrackText = currentTrackName ? ` Current track: ${currentTrackName}.` : "";
  elements.sectionSummary.textContent = sections.length
    ? `Showing ${sections.length} saved section${sections.length === 1 ? "" : "s"} in this profile.${currentTrackText}`
    : `No saved sections in this profile.${currentTrackText}`;

  if (!sections.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Save a section after marking A and B, then it will appear here.";
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