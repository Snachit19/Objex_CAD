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

  function showExportToast(message) {
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

  function createImageFilename(options) {
    const settings = options || {};
    const baseName = sanitizeFilenamePart(
      settings.projectName || getProjectNameForFilename() || "cad-scene"
    );
    const timestamp = createTimestamp(settings.date || new Date());

    return (baseName || "cad-scene") + "-" + timestamp + ".png";
  }

  function downloadImageUrl(url, filename) {
    const downloadLink = document.createElement("a");

    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  }

  function getCanvasDownloadUrl(canvas) {
    return new Promise(function (resolve, reject) {
      const objectUrlApi = window.URL || window.webkitURL;

      if (typeof canvas.toBlob === "function" && objectUrlApi) {
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error("Could not create image file."));
            return;
          }

          const objectUrl = objectUrlApi.createObjectURL(blob);

          resolve({
            url: objectUrl,
            revoke: function () {
              objectUrlApi.revokeObjectURL(objectUrl);
            }
          });
        }, "image/png");

        return;
      }

      if (typeof canvas.toDataURL === "function") {
        resolve({
          url: canvas.toDataURL("image/png"),
          revoke: null
        });
        return;
      }

      reject(new Error("Canvas image export is not supported in this browser."));
    });
  }

  async function exportCADImage(options) {
    const settings = options || {};
    const workspace = getCADWorkspace();
    const scene = workspace.scene;
    const camera = workspace.camera;
    const renderer = workspace.renderer;
    const controls = workspace.controls;
    const canvas = renderer ? renderer.domElement : null;
    const filename = settings.filename || createImageFilename(settings);

    if (!scene || !camera || !renderer || !canvas) {
      setExportStatus("CAD scene is not ready for image export.");

      return {
        success: false,
        message: "CAD scene is not ready for image export."
      };
    }

    if (!canvas.width || !canvas.height) {
      setExportStatus("CAD canvas is not ready for image export.");

      return {
        success: false,
        message: "CAD canvas is not ready for image export."
      };
    }

    try {
      setExportStatus("Exporting image...");

      if (controls && typeof controls.update === "function") {
        controls.update();
      }

      renderer.render(scene, camera);

      const imageDownload = await getCanvasDownloadUrl(canvas);

      downloadImageUrl(imageDownload.url, filename);

      if (typeof imageDownload.revoke === "function") {
        setTimeout(imageDownload.revoke, 1000);
      }

      setExportStatus("Image exported: " + filename);
      showExportToast("Image exported");

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