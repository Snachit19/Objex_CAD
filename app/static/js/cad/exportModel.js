(function () {
  "use strict";

  let exportModelInitialized = false;
  const exportModelOptions = {
    scope: "all",
    format: "glb"
  };

  function getExportModelButton() {
    return document.getElementById("exportModelBtn");
  }

  function getExportModelMenu() {
    return document.getElementById("exportModelMenuOptions");
  }

  function getFormatSelect() {
    return document.getElementById("exportModelFormatSelect");
  }

  function getConfirmButton() {
    return document.getElementById("exportModelConfirmBtn");
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

  function getExportModelOptions() {
    return {
      scope: exportModelOptions.scope,
      format: exportModelOptions.format
    };
  }

  function getScopeLabel(scope) {
    return scope === "selected" ? "selected object" : "all objects";
  }

  function getFormatLabel(format) {
    return String(format || "glb").toUpperCase();
  }

  function getExporterAvailability() {
    const three = window.THREE || {};
    const hasGLTFExporter = typeof three.GLTFExporter === "function";

    return {
      glb: hasGLTFExporter,
      gltf: hasGLTFExporter,
      obj: typeof three.OBJExporter === "function"
    };
  }

  function hasExporterForFormat(format) {
    const availability = getExporterAvailability();

    return Boolean(availability[format]);
  }

  function getMissingExporterMessage(format) {
    if (format === "obj") {
      return "OBJ exporter is not loaded.";
    }

    return "GLTF exporter is not loaded.";
  }

  function syncScopeButtons() {
    const menu = getExportModelMenu();

    if (!menu) {
      return;
    }

    menu.querySelectorAll("[data-export-model-scope]").forEach(function (button) {
      const isActive = button.getAttribute("data-export-model-scope") === exportModelOptions.scope;

      button.classList.toggle("active-export-model-option", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function syncFormatAvailability() {
    const formatSelect = getFormatSelect();

    if (!formatSelect) {
      return;
    }

    const availability = getExporterAvailability();
    let firstAvailableFormat = "";

    Array.prototype.forEach.call(formatSelect.options, function (option) {
      const isAvailable = Boolean(availability[option.value]);

      option.disabled = !isAvailable;
      option.textContent = getFormatLabel(option.value) + (isAvailable ? "" : " (unavailable)");

      if (!firstAvailableFormat && isAvailable) {
        firstAvailableFormat = option.value;
      }
    });

    if (!availability[formatSelect.value] && firstAvailableFormat) {
      formatSelect.value = firstAvailableFormat;
    }

    exportModelOptions.format = formatSelect.value || exportModelOptions.format;
  }

  function closeExportModelMenu() {
    const exportModelButton = getExportModelButton();
    const exportModelMenu = getExportModelMenu();

    if (exportModelMenu) {
      exportModelMenu.classList.remove("show");
    }

    if (exportModelButton) {
      exportModelButton.classList.remove("active-tool-btn");
      exportModelButton.setAttribute("aria-expanded", "false");
    }
  }

  function openExportModelMenu() {
    const exportModelButton = getExportModelButton();
    const exportModelMenu = getExportModelMenu();

    if (!exportModelMenu || !exportModelButton) {
      return;
    }

    if (typeof window.closeCADDropdownMenus === "function") {
      window.closeCADDropdownMenus();
    }

    if (typeof window.hideCADToolPanels === "function") {
      window.hideCADToolPanels();
    }

    syncFormatAvailability();

    exportModelMenu.classList.add("show");
    exportModelButton.classList.add("active-tool-btn");
    exportModelButton.setAttribute("aria-expanded", "true");
  }

  function handleExportModelClick(event) {
    event.stopPropagation();

    const exportModelMenu = getExportModelMenu();

    if (!exportModelMenu) {
      setExportModelStatus("Export 3D Model options will be added next.");
      return;
    }

    const isOpen = exportModelMenu.classList.contains("show");

    if (isOpen) {
      closeExportModelMenu();
      return;
    }

    openExportModelMenu();
  }

  function handleDocumentClick(event) {
    const exportModelButton = getExportModelButton();
    const exportModelMenu = getExportModelMenu();
    const target = event.target;

    if (
      (exportModelButton && exportModelButton.contains(target)) ||
      (exportModelMenu && exportModelMenu.contains(target))
    ) {
      return;
    }

    closeExportModelMenu();
  }

  function initExportModelFeature() {
    const exportModelButton = getExportModelButton();
    const exportModelMenu = getExportModelMenu();
    const formatSelect = getFormatSelect();
    const confirmButton = getConfirmButton();

    if (exportModelInitialized || !exportModelButton) {
      return;
    }

    exportModelButton.addEventListener("click", handleExportModelClick);

    if (exportModelMenu) {
      exportModelMenu.addEventListener("click", function (event) {
        event.stopPropagation();
      });

      exportModelMenu.querySelectorAll("[data-export-model-scope]").forEach(function (button) {
        button.addEventListener("click", function () {
          exportModelOptions.scope = button.getAttribute("data-export-model-scope") || "all";
          syncScopeButtons();
        });
      });
    }

    if (formatSelect) {
      exportModelOptions.format = formatSelect.value || exportModelOptions.format;

      formatSelect.addEventListener("change", function () {
        const nextFormat = formatSelect.value || "glb";

        if (!hasExporterForFormat(nextFormat)) {
          setExportModelStatus(getMissingExporterMessage(nextFormat));
          syncFormatAvailability();
          return;
        }

        exportModelOptions.format = nextFormat;
      });
    }

    if (confirmButton) {
      confirmButton.addEventListener("click", function () {
        if (!hasExporterForFormat(exportModelOptions.format)) {
          setExportModelStatus(getMissingExporterMessage(exportModelOptions.format));
          return;
        }

        setExportModelStatus(
          "Export " +
          getScopeLabel(exportModelOptions.scope) +
          " as " +
          getFormatLabel(exportModelOptions.format) +
          " will be connected next."
        );
        closeExportModelMenu();
      });
    }

    document.addEventListener("click", handleDocumentClick, true);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeExportModelMenu();
      }
    });

    syncScopeButtons();
    syncFormatAvailability();
    exportModelInitialized = true;
  }

  document.addEventListener("DOMContentLoaded", initExportModelFeature);

  window.CADModelExport = {
    init: initExportModelFeature,
    closeMenu: closeExportModelMenu,
    getExporterAvailability: getExporterAvailability,
    getOptions: getExportModelOptions,
    hasExporterForFormat: hasExporterForFormat,
    setStatus: setExportModelStatus
  };
})();