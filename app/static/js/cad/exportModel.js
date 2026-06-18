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

  function getCADObjectList() {
    return Array.isArray(window.cadObjects) ? window.cadObjects : [];
  }

  function getSelectedCADObjectForExport() {
    if (typeof window.getSelectedCADObject === "function") {
      return window.getSelectedCADObject();
    }

    return window.selectedObject || null;
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

  function isSystemObject(object) {
    if (!object) {
      return true;
    }

    if (object.userData && object.userData.systemObject) {
      return true;
    }

    if (object.isLight || object.isCamera) {
      return true;
    }

    return (
      object.name === "CADGridHelper" ||
      object.name === "CADAxesHelper" ||
      object.name === "DefaultAmbientLight" ||
      object.name === "DefaultDirectionalLight" ||
      object.type === "GridHelper" ||
      object.type === "AxesHelper" ||
      object.type === "BoxHelper"
    );
  }

  function hasExportableGeometry(object) {
    let hasGeometry = false;

    if (!object || typeof object.traverse !== "function") {
      return false;
    }

    object.traverse(function (child) {
      if (child && child.isMesh && child.geometry) {
        hasGeometry = true;
      }
    });

    return hasGeometry;
  }

  function isExportableCADObject(object) {
    if (!object || isSystemObject(object)) {
      return false;
    }

    if (object.visible === false) {
      return false;
    }

    return hasExportableGeometry(object);
  }

  function collectExportableCADObjects() {
    const objects = getCADObjectList();
    const exportableObjects = [];

    objects.forEach(function (object) {
      if (
        isExportableCADObject(object) &&
        exportableObjects.indexOf(object) === -1
      ) {
        exportableObjects.push(object);
      }
    });

    return exportableObjects;
  }

  function collectSelectedExportableObject() {
    const selectedObject = getSelectedCADObjectForExport();

    if (!isExportableCADObject(selectedObject)) {
      return [];
    }

    return [selectedObject];
  }

  function collectObjectsForExport(options) {
    const settings = options || getExportModelOptions();
    const scope = settings.scope || "all";

    if (scope === "selected") {
      return collectSelectedExportableObject();
    }

    return collectExportableCADObjects();
  }

  function getObjectCountLabel(count) {
    return count === 1 ? "1 object" : count + " objects";
  }

  function getExportModelSelection(options) {
    const settings = options || getExportModelOptions();
    const scope = settings.scope || "all";
    const format = settings.format || "glb";
    const objects = collectObjectsForExport(settings);

    return {
      scope: scope,
      format: format,
      objects: objects,
      count: objects.length,
      countLabel: getObjectCountLabel(objects.length)
    };
  }

  function getNoObjectsMessage(scope) {
    if (scope === "selected") {
      return "Select an object before exporting a 3D model.";
    }

    return "Add an object before exporting a 3D model.";
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

        const selection = getExportModelSelection(exportModelOptions);

        if (selection.count === 0) {
          setExportModelStatus(getNoObjectsMessage(selection.scope));
          return;
        }

        setExportModelStatus(
          "Ready to export " +
          selection.countLabel +
          " from " +
          getScopeLabel(selection.scope) +
          " as " +
          getFormatLabel(selection.format) +
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
    collectObjects: collectObjectsForExport,
    collectExportableObjects: collectExportableCADObjects,
    getExportSelection: getExportModelSelection,
    getExporterAvailability: getExporterAvailability,
    getOptions: getExportModelOptions,
    hasExporterForFormat: hasExporterForFormat,
    isExportableObject: isExportableCADObject,
    setStatus: setExportModelStatus
  };
})();