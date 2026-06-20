(function () {
  "use strict";

  const SETTINGS_KEY = "objexCADSettings";

  const DEFAULT_SETTINGS = {
    compactDashboard: false,
    recentPreview: true,
    defaultLandingPage: "/dashboard",
    showGrid: true,
    showAxes: true,
    gridSize: 40,
    gridDivisions: 40,
    axesSize: 5,
    zoomLevel: "100",
    defaultProjectDescription: "",
    saveReminder: true,
    confirmDelete: true
  };

  function cloneSettings(settings) {
    return Object.assign({}, DEFAULT_SETTINGS, settings || {});
  }

  function loadSettings() {
    try {
      const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY));
      return cloneSettings(savedSettings);
    } catch (error) {
      return cloneSettings();
    }
  }

  function saveSettings(settings) {
    const nextSettings = cloneSettings(settings);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
    return nextSettings;
  }

  function resetSettings() {
    localStorage.removeItem(SETTINGS_KEY);
    return cloneSettings();
  }

  function getNumberSetting(key, fallback, min, max) {
    const settings = loadSettings();
    const numericValue = Number(settings[key]);
    let value = Number.isFinite(numericValue) ? numericValue : fallback;

    if (Number.isFinite(Number(min))) {
      value = Math.max(value, Number(min));
    }

    if (Number.isFinite(Number(max))) {
      value = Math.min(value, Number(max));
    }

    return value;
  }

  function getLandingPage() {
    const settings = loadSettings();
    const allowedPages = ["/dashboard", "/projects", "/help"];

    return allowedPages.indexOf(settings.defaultLandingPage) !== -1
      ? settings.defaultLandingPage
      : DEFAULT_SETTINGS.defaultLandingPage;
  }

  function applyDocumentPreferences() {
    const settings = loadSettings();

    document.body.classList.toggle("compact-dashboard", Boolean(settings.compactDashboard));
    document.body.classList.toggle("dashboard-preview-hidden", !settings.recentPreview);
  }

  window.ObjexCADSettings = {
    key: SETTINGS_KEY,
    defaults: DEFAULT_SETTINGS,
    load: loadSettings,
    save: saveSettings,
    reset: resetSettings,
    number: getNumberSetting,
    landingPage: getLandingPage,
    applyDocumentPreferences: applyDocumentPreferences
  };

  document.addEventListener("DOMContentLoaded", applyDocumentPreferences);
})();
