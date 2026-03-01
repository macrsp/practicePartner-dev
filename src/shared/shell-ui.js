/**
 * @role renderer-support
 * @owns DOM element lookup shared across feature renderers and bootstrap wiring
 * @not-owns feature rendering logic, application state transitions, or persistence
 * @notes Keep this file limited to shell-level element access.
 */

function getElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }

  return element;
}

export const elements = {
  profileSelect: getElement("profileSelect"),
  newProfile: getElement("newProfile"),

  pickFolder: getElement("pickFolder"),
  trackCount: getElement("trackCount"),
  trackSelect: getElement("trackSelect"),

  saveSection: getElement("saveSection"),
  adaptivePlay: getElement("adaptivePlay"),
  loopToggle: getElement("loopToggle"),

  speed: getElement("speed"),
  speedVal: getElement("speedVal"),

  masteryDisplay: getElement("masteryDisplay"),
  abDisplay: getElement("abDisplay"),

  sectionSummary: getElement("sectionSummary"),
  sectionList: getElement("sectionList"),

  waveformMount: getElement("waveformMount"),
  audio: getElement("audio"),
};