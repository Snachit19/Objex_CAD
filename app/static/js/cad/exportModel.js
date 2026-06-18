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
    const objectUrlApi = window.URL || window.webkitURL;

    if (!objectUrlApi || typeof objectUrlApi.createObjectURL !== "function") {
      throw new Error("File download is not supported in this browser.");
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

  async function exportGLBModel(exportBundle) {
    const glbData = await parseGLBScene(exportBundle.scene);
    const glbBlob = new Blob([glbData], {
      type: "model/gltf-binary"
    });

    downloadBlob(glbBlob, "cad-model.glb");

    return {
      success: true,
      filename: "cad-model.glb"
    };
  }

  async function exportModelFromSelection(options) {
    const settings = options || getExportModelOptions();
    const selection = getExportModelSelection(settings);
    let exportBundle = null;

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

    if (settings.format !== "glb") {
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

      setExportModelStatus("Exporting GLB model...");

      const result = await exportGLBModel(exportBundle);

      setExportModelStatus("GLB model exported: " + result.filename);

      return result;
    } catch (error) {
      console.error("Export model error:", error);

      return {
        success: false,
        message: "Could not export GLB model."
      };
    } finally {
      if (exportBundle) {
        disposeExportSceneBundle(exportBundle);
      }
    }
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
      confirmButton.addEventListener("click", async function () {
        confirmButton.disabled = true;

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
    getExportSelection: getExportModelSelection,
    getExporterAvailability: getExporterAvailability,
    getOptions: getExportModelOptions,
    hasExporterForFormat: hasExporterForFormat,
    isExportableObject: isExportableCADObject,
    cloneObjectForExport: cloneObjectForExport,
    exportGLBModel: exportGLBModel,
    exportModel: exportModelFromSelection,
    setStatus: setExportModelStatus
  };
})();