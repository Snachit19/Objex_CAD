(function () {
  "use strict";

  const DEFAULT_ZOOM_STEP_PERCENT = 10;
  const MIN_ZOOM_PERCENT = 25;
  const MAX_ZOOM_PERCENT = 250;
  const MIN_CAMERA_DISTANCE = 1;
  const MAX_CAMERA_DISTANCE = 150;

  let defaultCameraDistance = null;
  let zoomFeatureInitialized = false;

  function getCamera() {
    if (window.CADWorkspace && window.CADWorkspace.camera) {
      return window.CADWorkspace.camera;
    }

    return window.camera || null;
  }

  function getControls() {
    if (window.CADWorkspace && window.CADWorkspace.controls) {
      return window.CADWorkspace.controls;
    }

    return window.controls || null;
  }

  function setStatus(message) {
    const statusText = document.getElementById("cadStatusText");

    if (statusText) {
      statusText.textContent = message;
    }
  }

  function clampDistance(distance) {
    if (distance < MIN_CAMERA_DISTANCE) {
      return MIN_CAMERA_DISTANCE;
    }

    if (distance > MAX_CAMERA_DISTANCE) {
      return MAX_CAMERA_DISTANCE;
    }

    return distance;
  }

  function clampZoomPercent(zoomPercent) {
    const numericZoom = Number(zoomPercent);

    if (Number.isNaN(numericZoom)) {
      return 100;
    }

    if (numericZoom < MIN_ZOOM_PERCENT) {
      return MIN_ZOOM_PERCENT;
    }

    if (numericZoom > MAX_ZOOM_PERCENT) {
      return MAX_ZOOM_PERCENT;
    }

    return numericZoom;
  }

  function getTargetPoint(controls) {
    if (controls && controls.target) {
      return controls.target.clone();
    }

    return new THREE.Vector3(0, 0, 0);
  }

  function getCameraDistance(camera, target) {
    return camera.position.distanceTo(target);
  }

  function getDefaultCameraDistance(camera, target) {
    if (!defaultCameraDistance) {
      defaultCameraDistance = getCameraDistance(camera, target) || 10;
    }

    return defaultCameraDistance;
  }

  function distanceToZoomPercent(camera, target) {
    const currentDistance = getCameraDistance(camera, target);
    const baseDistance = getDefaultCameraDistance(camera, target);

    if (!currentDistance) {
      return 100;
    }

    return clampZoomPercent((baseDistance / currentDistance) * 100);
  }

  function zoomPercentToDistance(camera, target, zoomPercent) {
    const baseDistance = getDefaultCameraDistance(camera, target);
    const zoomRatio = clampZoomPercent(zoomPercent) / 100;

    return clampDistance(baseDistance / zoomRatio);
  }

  function moveCamera(camera, controls, target, newDistance) {
    const direction = new THREE.Vector3()
      .subVectors(camera.position, target)
      .normalize();

    camera.position.copy(target).add(direction.multiplyScalar(newDistance));
    camera.updateProjectionMatrix();

    if (controls) {
      controls.update();
    }
  }

  function syncZoomControls(zoomPercent) {
    const slider = document.getElementById("zoomSlider");
    const zoomLevelText = document.getElementById("zoomLevelText");
    const clampedZoom = Math.round(clampZoomPercent(zoomPercent));

    if (slider) {
      slider.value = clampedZoom;
    }

    if (zoomLevelText) {
      zoomLevelText.textContent = clampedZoom + "%";
    }
  }

  function syncZoomControlsFromCamera() {
    const camera = getCamera();
    const controls = getControls();

    if (!camera || typeof THREE === "undefined") {
      return;
    }

    const target = getTargetPoint(controls);
    syncZoomControls(distanceToZoomPercent(camera, target));
  }

  function setZoomPercent(zoomPercent, shouldUpdateStatus) {
    const camera = getCamera();
    const controls = getControls();

    if (!camera || typeof THREE === "undefined") {
      setStatus("Camera is not ready. Zoom cannot be used.");
      return;
    }

    const target = getTargetPoint(controls);
    const clampedZoom = clampZoomPercent(zoomPercent);
    const nextDistance = zoomPercentToDistance(camera, target, clampedZoom);

    moveCamera(camera, controls, target, nextDistance);
    syncZoomControls(clampedZoom);

    if (shouldUpdateStatus) {
      setStatus("Zoom set to " + Math.round(clampedZoom) + "%.");
    }
  }

  function getCurrentZoomPercent() {
    const slider = document.getElementById("zoomSlider");

    if (slider) {
      return clampZoomPercent(slider.value);
    }

    const camera = getCamera();
    const controls = getControls();

    if (!camera || typeof THREE === "undefined") {
      return 100;
    }

    return distanceToZoomPercent(camera, getTargetPoint(controls));
  }

  function zoomCADView(direction) {
    const currentZoom = getCurrentZoomPercent();
    let nextZoom = currentZoom;

    if (direction === "in") {
      nextZoom = currentZoom + DEFAULT_ZOOM_STEP_PERCENT;
    } else if (direction === "out") {
      nextZoom = currentZoom - DEFAULT_ZOOM_STEP_PERCENT;
    } else {
      setStatus("Invalid zoom direction.");
      return;
    }

    setZoomPercent(nextZoom, true);
  }

  function zoomInCADView() {
    zoomCADView("in");
  }

  function zoomOutCADView() {
    zoomCADView("out");
  }

  function connectControlChangeSync() {
    const controls = getControls();

    if (controls && typeof controls.addEventListener === "function") {
      controls.addEventListener("change", syncZoomControlsFromCamera);
    }
  }

  function initZoomFeature() {
    if (zoomFeatureInitialized) {
      return;
    }

    zoomFeatureInitialized = true;

    const zoomInBtn = document.getElementById("zoomInBtn");
    const zoomOutBtn = document.getElementById("zoomOutBtn");
    const zoomSlider = document.getElementById("zoomSlider");

    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", zoomInCADView);
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", zoomOutCADView);
    }

    if (zoomSlider) {
      zoomSlider.addEventListener("input", function () {
        setZoomPercent(zoomSlider.value, true);
      });
    }

    connectControlChangeSync();
    syncZoomControlsFromCamera();
  }

  window.zoomInCADView = zoomInCADView;
  window.zoomOutCADView = zoomOutCADView;
  window.setCADZoomPercent = setZoomPercent;
  window.syncZoomControlsFromCamera = syncZoomControlsFromCamera;

  document.addEventListener("DOMContentLoaded", function () {
    window.addEventListener("cad:ready", initZoomFeature);

    if (window.isCADSceneReady && window.isCADSceneReady()) {
      initZoomFeature();
    }
  });
})();