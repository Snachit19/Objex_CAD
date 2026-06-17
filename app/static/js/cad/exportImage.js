(function () {
  function getCADWorkspace() {
    return window.CADWorkspace || {
      scene: window.scene,
      camera: window.camera,
      renderer: window.renderer,
      controls: window.controls
    };
  }

  function getStatusElement() {
    return document.getElementById("cadStatusText");
  }

  function setExportStatus(message) {
    const statusText = getStatusElement();

    if (statusText) {
      statusText.textContent = message;
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

  function createImageFilename(options) {
    const settings = options || {};
    const baseName = sanitizeFilenamePart(
      settings.projectName || getProjectNameForFilename() || "cad-scene"
    );
    const timestamp = createTimestamp(settings.date || new Date());

    return (baseName || "cad-scene") + "-" + timestamp + ".png";
  }

  function downloadImage(dataUrl, filename) {
    const downloadLink = document.createElement("a");

    downloadLink.href = dataUrl;
    downloadLink.download = filename;
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  }

  function exportCADImage(options) {
    const settings = options || {};
    const workspace = getCADWorkspace();
    const scene = workspace.scene;
    const camera = workspace.camera;
    const renderer = workspace.renderer;
    const controls = workspace.controls;
    const filename = settings.filename || createImageFilename(settings);

    if (!scene || !camera || !renderer || !renderer.domElement) {
      setExportStatus("CAD scene is not ready for image export.");

      return {
        success: false,
        message: "CAD scene is not ready for image export."
      };
    }

    try {
      setExportStatus("Exporting image...");

      if (controls && typeof controls.update === "function") {
        controls.update();
      }

      renderer.render(scene, camera);

      const imageDataUrl = renderer.domElement.toDataURL("image/png");
      downloadImage(imageDataUrl, filename);
      setExportStatus("Image exported: " + filename);

      return {
        success: true,
        filename: filename
      };
    } catch (error) {
      console.error("Export image error:", error);
      setExportStatus("Could not export image.");

      return {
        success: false,
        message: "Could not export image."
      };
    }
  }

  window.exportCADImage = exportCADImage;
  window.createCADImageFilename = createImageFilename;
})();