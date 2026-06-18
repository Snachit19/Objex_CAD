(function () {
  "use strict";

  let exportModelInitialized = false;

  function getExportModelButton() {
    return document.getElementById("exportModelBtn");
  }

  function getStatusElement() {
    return document.getElementById("cadStatusText");
  }

  function setExportModelStatus(message) {
    const statusText = getStatusElement();

    if (statusText) {
      statusText.textContent = message;
    }
  }

  function handleExportModelClick(event) {
    event.stopPropagation();
    setExportModelStatus("Export 3D Model options will be added next.");
  }

  function initExportModelFeature() {
    const exportModelButton = getExportModelButton();

    if (exportModelInitialized || !exportModelButton) {
      return;
    }

    exportModelButton.addEventListener("click", handleExportModelClick);
    exportModelInitialized = true;
  }

  document.addEventListener("DOMContentLoaded", initExportModelFeature);

  window.CADModelExport = {
    init: initExportModelFeature,
    setStatus: setExportModelStatus
  };
})();