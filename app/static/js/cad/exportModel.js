(function () {
  "use strict";

  let exportModelInitialized = false;
  const SUPPORTED_EXPORT_SCOPES = ["all", "selected"];
  const SUPPORTED_EXPORT_FORMATS = ["glb", "gltf", "obj"];

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

  function normaliseExportScope(scope) {
    const value = String(scope || "all").toLowerCase();

    return SUPPORTED_EXPORT_SCOPES.indexOf(value) !== -1 ? value : "";
  }

  function normaliseExportFormat(format) {
    const value = String(format || "glb").toLowerCase();

    return SUPPORTED_EXPORT_FORMATS.indexOf(value) !== -1 ? value : "";
  }

  function showExportModelToast(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message, 3200);
    }
  }

  function padDatePart(value) {
    return String(value).padStart(2, "0");
  }

  function createTimestamp(date) {
    return [
      date.getFullYear(),
      padDatePart(date.getMonth() + 1),
      padDatePart(date.getDate())
    ].join("-") + "_" + [
      padDatePart(date.getHours()),
      padDatePart(date.getMinutes()),
      padDatePart(date.getSeconds())
    ].join("-");
  }

  function sanitizeFilenamePart(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getProjectNameForFilename() {
    const projectNameText = document.getElementById("projectNameText");
    const projectName = projectNameText
      ? projectNameText.textContent
      : "";

    if (!projectName || projectName === "Loading...") {
      return "";
    }

    return projectName;
  }

  function createModelFilename(options) {
    const settings = options || {};
    const format = normaliseExportFormat(settings.format) || "glb";
    const baseName = sanitizeFilenamePart(
      settings.projectName || getProjectNameForFilename() || "cad"
    );
    const timestamp = createTimestamp(settings.date || new Date());

    return (baseName || "cad") + "-model-" + timestamp + "." + format;
  }

  function getExportModelOptions() {
    return {
      scope: normaliseExportScope(exportModelOptions.scope) || "all",
      format: normaliseExportFormat(exportModelOptions.format) || "glb"
    };
  }

  function getScopeLabel(scope) {
    const exportScope = normaliseExportScope(scope);

    return exportScope === "selected" ? "selected object" : "all objects";
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
    const exportFormat = normaliseExportFormat(format);

    if (!exportFormat) {
      return false;
    }

    const availability = getExporterAvailability();

    return Boolean(availability[exportFormat]);
  }

  function getMissingExporterMessage(format) {
    const exportFormat = normaliseExportFormat(format);

    if (!exportFormat) {
      return "Unsupported model export format.";
    }

    if (exportFormat === "obj") {
      return "OBJ exporter is not loaded.";
    }

    return "GLTF exporter is not loaded.";
  }

  function validateExportOptions(options) {
    const settings = Object.assign({}, getExportModelOptions(), options || {});
    const scope = normaliseExportScope(settings.scope);
    const format = normaliseExportFormat(settings.format);

    if (!scope) {
      return {
        valid: false,
        message: "Unsupported model export scope."
      };
    }

    if (!format) {
      return {
        valid: false,
        message: "Unsupported model export format."
      };
    }

    return {
      valid: true,
      options: Object.assign({}, settings, {
        scope: scope,
        format: format
      })
    };
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
    const scope = normaliseExportScope(settings.scope) || "all";

    if (scope === "selected") {
      return collectSelectedExportableObject();
    }

    return collectExportableCADObjects();
  }

  function getObjectCountLabel(count) {
    return count === 1 ? "1 object" : count + " objects";
  }

  function getExportModelSelection(options) {
    const settings = Object.assign({}, getExportModelOptions(), options || {});
    const scope = normaliseExportScope(settings.scope) || "all";
    const format = normaliseExportFormat(settings.format) || "glb";
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

  function isFileDownloadSupported() {
    const objectUrlApi = typeof window !== "undefined"
      ? window.URL || window.webkitURL
      : null;

    return (
      typeof Blob === "function" &&
      typeof document !== "undefined" &&
      Boolean(document.body) &&
      Boolean(objectUrlApi && typeof objectUrlApi.createObjectURL === "function")
    );
  }

  function getFileDownloadSupportMessage() {
    return "File download is not supported in this browser.";
  }

  function clonePlainValue(value) {
    if (value === null || value === undefined) {
      return value;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function cloneMaterialForExport(material) {
    if (Array.isArray(material)) {
      return material.map(cloneMaterialForExport);
    }

    if (material && typeof material.clone === "function") {
      return material.clone();
    }

    return material;
  }

  function prepareMeshCloneForExport(meshClone) {
    if (!meshClone || !meshClone.isMesh) {
      return;
    }

    if (meshClone.geometry && typeof meshClone.geometry.clone === "function") {
      meshClone.geometry = meshClone.geometry.clone();
    }

    meshClone.material = cloneMaterialForExport(meshClone.material);
    meshClone.userData = clonePlainValue(meshClone.userData || {});
  }

  function prepareObjectCloneForExport(objectClone) {
    if (!objectClone || typeof objectClone.traverse !== "function") {
      return objectClone;
    }

    objectClone.traverse(function (child) {
      child.userData = clonePlainValue(child.userData || {});
      prepareMeshCloneForExport(child);
    });

    return objectClone;
  }

  function cloneObjectForExport(object) {
    if (!object || typeof object.clone !== "function") {
      return null;
    }

    const objectClone = object.clone(true);

    objectClone.name = object.name || "CAD Object";
    objectClone.userData = clonePlainValue(object.userData || {});
    objectClone.userData.exportSourceId =
      object.userData && object.userData.id ? object.userData.id : "";
    objectClone.userData.exportSourceName = object.name || "";

    return prepareObjectCloneForExport(objectClone);
  }

  function createTemporaryExportScene(name) {
    if (!window.THREE || typeof window.THREE.Scene !== "function") {
      return null;
    }

    const exportScene = new THREE.Scene();

    exportScene.name = name || "CADModelExportScene";
    exportScene.userData = {
      temporaryExportScene: true
    };

    return exportScene;
  }

  function createExportSceneBundle(options) {
    const selection = getExportModelSelection(options);
    const exportScene = createTemporaryExportScene();
    const clonedObjects = [];

    if (!exportScene) {
      return {
        scene: null,
        objects: [],
        sourceObjects: selection.objects,
        selection: selection,
        count: 0
      };
    }

    selection.objects.forEach(function (object) {
      const objectClone = cloneObjectForExport(object);

      if (objectClone) {
        exportScene.add(objectClone);
        clonedObjects.push(objectClone);
      }
    });

    return {
      scene: exportScene,
      objects: clonedObjects,
      sourceObjects: selection.objects,
      selection: selection,
      count: clonedObjects.length
    };
  }

  function disposeMaterialClone(material) {
    if (Array.isArray(material)) {
      material.forEach(disposeMaterialClone);
      return;
    }

    if (material && typeof material.dispose === "function") {
      material.dispose();
    }
  }

  function disposeExportSceneBundle(bundle) {
    if (!bundle || !bundle.scene || typeof bundle.scene.traverse !== "function") {
      return;
    }

    bundle.scene.traverse(function (child) {
      if (!child || !child.isMesh) {
        return;
      }

      if (child.geometry && typeof child.geometry.dispose === "function") {
        child.geometry.dispose();
      }

      disposeMaterialClone(child.material);
    });
  }

  function downloadBlob(blob, filename) {
    const objectUrlApi = typeof window !== "undefined"
      ? window.URL || window.webkitURL
      : null;

    if (typeof Blob !== "function") {
      throw new Error("File creation is not supported in this browser.");
    }

    if (!objectUrlApi || typeof objectUrlApi.createObjectURL !== "function") {
      throw new Error("File download is not supported in this browser.");
    }

    if (typeof document === "undefined" || !document.body) {
      throw new Error("Document body is not ready for file download.");
    }

    const downloadUrl = objectUrlApi.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = filename;
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    setTimeout(function () {
      objectUrlApi.revokeObjectURL(downloadUrl);
    }, 1000);
  }

  function parseGLBScene(exportScene) {
    return new Promise(function (resolve, reject) {
      if (!window.THREE || typeof THREE.GLTFExporter !== "function") {
        reject(new Error("GLTF exporter is not loaded."));
        return;
      }

      const exporter = new THREE.GLTFExporter();

      try {
        exporter.parse(
          exportScene,
          function (result) {
            if (!(result instanceof ArrayBuffer)) {
              reject(new Error("GLB export did not return binary data."));
              return;
            }

            resolve(result);
          },
          {
            binary: true,
            onlyVisible: true,
            truncateDrawRange: true
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  function parseGLTFScene(exportScene) {
    return new Promise(function (resolve, reject) {
      if (!window.THREE || typeof THREE.GLTFExporter !== "function") {
        reject(new Error("GLTF exporter is not loaded."));
        return;
      }

      const exporter = new THREE.GLTFExporter();

      try {
        exporter.parse(
          exportScene,
          function (result) {
            if (!result || result instanceof ArrayBuffer) {
              reject(new Error("GLTF export did not return JSON data."));
              return;
            }

            resolve(result);
          },
          {
            binary: false,
            onlyVisible: true,
            truncateDrawRange: true
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  function parseOBJScene(exportScene) {
    if (!window.THREE || typeof THREE.OBJExporter !== "function") {
      throw new Error("OBJ exporter is not loaded.");
    }

    const exporter = new THREE.OBJExporter();
    const objText = exporter.parse(exportScene);

    if (typeof objText !== "string" || objText.trim() === "") {
      throw new Error("OBJ export did not return text data.");
    }

    return objText;
  }

  async function exportGLBModel(exportBundle, filename) {
    const exportFilename = filename || createModelFilename({ format: "glb" });
    const glbData = await parseGLBScene(exportBundle.scene);
    const glbBlob = new Blob([glbData], {
      type: "model/gltf-binary"
    });

    downloadBlob(glbBlob, exportFilename);

    return {
      success: true,
      filename: exportFilename
    };
  }

  async function exportGLTFModel(exportBundle, filename) {
    const exportFilename = filename || createModelFilename({ format: "gltf" });
    const gltfData = await parseGLTFScene(exportBundle.scene);
    const gltfBlob = new Blob([JSON.stringify(gltfData, null, 2)], {
      type: "model/gltf+json"
    });

    downloadBlob(gltfBlob, exportFilename);

    return {
      success: true,
      filename: exportFilename
    };
  }

  async function exportOBJModel(exportBundle, filename) {
    const exportFilename = filename || createModelFilename({ format: "obj" });
    const objData = parseOBJScene(exportBundle.scene);
    const objBlob = new Blob([objData], {
      type: "text/plain"
    });

    downloadBlob(objBlob, exportFilename);

    return {
      success: true,
      filename: exportFilename
    };
  }

  async function exportPreparedModelByFormat(exportBundle, format, filename) {
    if (format === "glb") {
      return exportGLBModel(exportBundle, filename);
    }

    if (format === "gltf") {
      return exportGLTFModel(exportBundle, filename);
    }

    if (format === "obj") {
      return exportOBJModel(exportBundle, filename);
    }

    return {
      success: false,
      message: getFormatLabel(format) + " export will be connected next."
    };
  }

  async function exportModelFromSelection(options) {
    const validation = validateExportOptions(options);

    if (!validation.valid) {
      return {
        success: false,
        message: validation.message
      };
    }

    const settings = validation.options;

    const selection = getExportModelSelection(settings);
    const filename = settings.filename || createModelFilename(settings);
    let exportBundle = null;

    if (!isFileDownloadSupported()) {
      return {
        success: false,
        message: getFileDownloadSupportMessage()
      };
    }

    if (!hasExporterForFormat(settings.format)) {
      return {
        success: false,
        message: getMissingExporterMessage(settings.format)
      };
    }

    if (selection.count === 0) {
      return {
        success: false,
        message: getNoObjectsMessage(selection.scope)
      };
    }

    if (
      settings.format !== "glb" &&
      settings.format !== "gltf" &&
      settings.format !== "obj"
    ) {
      return {
        success: false,
        message: getFormatLabel(settings.format) + " export will be connected next."
      };
    }

    try {
      exportBundle = createExportSceneBundle(settings);

      if (!exportBundle.scene || exportBundle.count === 0) {
        return {
          success: false,
          message: "Could not prepare the 3D model export scene."
        };
      }

      setExportModelStatus(
        "Exporting " +
        getFormatLabel(settings.format) +
        " model (" +
        selection.countLabel +
        ")..."
      );

      const result = await exportPreparedModelByFormat(exportBundle, settings.format, filename);

      if (result.success) {
        setExportModelStatus("Model exported: " + result.filename);
        showExportModelToast("Model exported");
      }

      return result;
    } catch (error) {
      console.error("Export model error:", error);

      return {
        success: false,
        message: "Could not export " + getFormatLabel(settings.format) + " model."
      };
    } finally {
      if (exportBundle) {
        disposeExportSceneBundle(exportBundle);
      }
    }
  }

  function syncScopeButtons() {
    const menu = getExportModelMenu();
    const activeScope = normaliseExportScope(exportModelOptions.scope) || "all";

    if (!menu) {
      return;
    }

    menu.querySelectorAll("[data-export-model-scope]").forEach(function (button) {
      const isActive = button.getAttribute("data-export-model-scope") === activeScope;

      button.classList.toggle("active-export-model-option", isActive);
      button.setAttribute("aria-checked", String(isActive));
    });
  }

  function syncConfirmButtonAvailability() {
    const confirmButton = getConfirmButton();
    const exportFormat = normaliseExportFormat(exportModelOptions.format);
    const canExportFormat = Boolean(exportFormat && hasExporterForFormat(exportFormat));

    if (!confirmButton) {
      return;
    }

    confirmButton.disabled = !canExportFormat;
    confirmButton.setAttribute("aria-disabled", String(!canExportFormat));
  }

  function syncFormatAvailability() {
    const formatSelect = getFormatSelect();

    if (!formatSelect) {
      syncConfirmButtonAvailability();
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

    exportModelOptions.format = normaliseExportFormat(formatSelect.value) || exportModelOptions.format;
    syncConfirmButtonAvailability();
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
          exportModelOptions.scope =
            normaliseExportScope(button.getAttribute("data-export-model-scope")) || "all";
          syncScopeButtons();
        });
      });
    }

    if (formatSelect) {
      exportModelOptions.format =
        normaliseExportFormat(formatSelect.value) || exportModelOptions.format;

      formatSelect.addEventListener("change", function () {
        const nextFormat = normaliseExportFormat(formatSelect.value);

        if (!nextFormat) {
          setExportModelStatus("Unsupported model export format.");
          syncFormatAvailability();
          return;
        }

        if (!hasExporterForFormat(nextFormat)) {
          setExportModelStatus(getMissingExporterMessage(nextFormat));
          syncFormatAvailability();
          return;
        }

        exportModelOptions.format = nextFormat;
      });
    }

    if (confirmButton) {
      confirmButton.addEventListener("click", async function () {
        confirmButton.disabled = true;
        confirmButton.setAttribute("aria-disabled", "true");

        let result;

        try {
          result = await exportModelFromSelection(exportModelOptions);
        } catch (error) {
          console.error("Export model click error:", error);

          result = {
            success: false,
            message: "Could not export 3D model."
          };
        } finally {
          confirmButton.disabled = false;
          confirmButton.setAttribute("aria-disabled", "false");
          syncConfirmButtonAvailability();
        }

        if (!result.success) {
          setExportModelStatus(result.message || "Could not export 3D model.");
          return;
        }

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
    createExportSceneBundle: createExportSceneBundle,
    disposeExportSceneBundle: disposeExportSceneBundle,
    createFilename: createModelFilename,
    getExportSelection: getExportModelSelection,
    getExporterAvailability: getExporterAvailability,
    getOptions: getExportModelOptions,
    hasExporterForFormat: hasExporterForFormat,
    isDownloadSupported: isFileDownloadSupported,
    isExportableObject: isExportableCADObject,
    cloneObjectForExport: cloneObjectForExport,
    exportGLBModel: exportGLBModel,
    exportGLTFModel: exportGLTFModel,
    exportOBJModel: exportOBJModel,
    exportModel: exportModelFromSelection,
    validateOptions: validateExportOptions,
    setStatus: setExportModelStatus
  };
})();