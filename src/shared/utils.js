/**
 * @role utility-module
 * @owns pure helpers for formatting, sorting, normalization, and clamping
 * @not-owns DOM updates, persistence, or mutable application state
 * @notes Prefer adding only side-effect-free helpers here.
 */

import { SUPPORTED_AUDIO_EXTENSIONS } from "./constants.js";

const DAY_MS = 1000 * 60 * 60 * 24;

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function isSupportedAudioFile(name) {
  const lower = name.toLowerCase();
  return SUPPORTED_AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export function compareByName(a, b) {
  return a.name.localeCompare(b.name, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function formatTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) {
    return "—";
  }

  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds - mins * 60;
  return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
}

export function createSectionLabel(section) {
  const timeRange = `${formatTime(section.start)} → ${formatTime(section.end)}`;

  if (section.label) {
    return `${section.label} (${timeRange})`;
  }

  return timeRange;
}

export function normalizeSectionRecord(section) {
  return {
    ...section,
    label: section.label ?? null,
    playCount: section.playCount ?? 0,
    mastery: section.mastery ?? 0,
    lastPlayed: section.lastPlayed ?? 0,
    createdAt: section.createdAt ?? 0,
  };
}

export function calculateMastery(section, now = Date.now()) {
  const nextPlayCount = (section.playCount ?? 0) + 1;
  const repetitionScore = Math.min(1, nextPlayCount / 10);

  const daysSinceLastPlay = section.lastPlayed
    ? Math.max(0, (now - section.lastPlayed) / DAY_MS)
    : Infinity;

  const recencyScore = Number.isFinite(daysSinceLastPlay) ? 1 / (1 + daysSinceLastPlay) : 0;

  return Number(Math.min(1, 0.5 * repetitionScore + 0.5 * recencyScore).toFixed(2));
}

export function sortSections(a, b) {
  return (
    a.trackName.localeCompare(b.trackName, undefined, {
      numeric: true,
      sensitivity: "base",
    }) ||
    a.start - b.start ||
    a.end - b.end ||
    a.id - b.id
  );
}

export function summarizeTrackCount(count) {
  if (count === 0) {
    return "No audio files found in the selected folder.";
  }

  return `${count} track${count === 1 ? "" : "s"} loaded.`;
}