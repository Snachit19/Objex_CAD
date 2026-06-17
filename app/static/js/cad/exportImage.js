(function () {
  function getCADWorkspace() {
    return window.CADWorkspace || {
      scene: window.scene,
      camera: window.camera,
      renderer: window.renderer,
      controls: window.controls
    };
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
    const filename = settings.filename || "cad-scene.png";

    if (!scene || !camera || !renderer || !renderer.domElement) {
      return {
        success: false,
        message: "CAD scene is not ready for image export."
      };
    }

    try {
      if (controls && typeof controls.update === "function") {
        controls.update();
      }

      renderer.render(scene, camera);

      const imageDataUrl = renderer.domElement.toDataURL("image/png");
      downloadImage(imageDataUrl, filename);

      return {
        success: true,
        filename: filename
      };
    } catch (error) {
      console.error("Export image error:", error);

      return {
        success: false,
        message: "Could not export image."
      };
    }
  }

  window.exportCADImage = exportCADImage;
})();