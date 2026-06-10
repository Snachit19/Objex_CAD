(function () {
  "use strict";

  const DEFAULT_ZOOM_STEP = 1;
  const MIN_CAMERA_DISTANCE = 1;
  const MAX_CAMERA_DISTANCE = 150;

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

  function closeZoomDropdown() {
    const zoomMenuOptions = document.getElementById("zoomMenuOptions");
    const zoomToolBtn = document.getElementById("zoomToolBtn");

    if (zoomMenuOptions) {
      zoomMenuOptions.classList.remove("show");
    }

    if (zoomToolBtn) {
      zoomToolBtn.classList.remove("active-tool-btn");
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

  function getTargetPoint(controls) {
    if (controls && controls.target) {
      return controls.target.clone();
    }

    return new THREE.Vector3(0, 0, 0);
  }

  function getCameraDistance(camera, target) {
    return camera.position.distanceTo(target);
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

  function zoomCADView(direction) {
    const camera = getCamera();
    const controls = getControls();

    if (!camera || typeof THREE === "undefined") {
      setStatus("Camera is not ready. Zoom cannot be used.");
      return;
    }

    const target = getTargetPoint(controls);
    const currentDistance = getCameraDistance(camera, target);

    let newDistance = currentDistance;

    if (direction === "in") {
      newDistance = currentDistance - DEFAULT_ZOOM_STEP;
    } else if (direction === "out") {
      newDistance = currentDistance + DEFAULT_ZOOM_STEP;
    } else {
      setStatus("Invalid zoom direction.");
      return;
    }

    newDistance = clampDistance(newDistance);

    moveCamera(camera, controls, target, newDistance);

    if (direction === "in") {
      setStatus("Zoomed in.");
    } else {
      setStatus("Zoomed out.");
    }

    closeZoomDropdown();
  }

  function zoomInCADView() {
    zoomCADView("in");
  }

  function zoomOutCADView() {
    zoomCADView("out");
  }

  function initZoomFeature() {
    const zoomInBtn = document.getElementById("zoomInBtn");
    const zoomOutBtn = document.getElementById("zoomOutBtn");

    if (zoomInBtn) {
      zoomInBtn.addEventListener("click", zoomInCADView);
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener("click", zoomOutCADView);
    }
  }

  window.zoomInCADView = zoomInCADView;
  window.zoomOutCADView = zoomOutCADView;

  document.addEventListener("DOMContentLoaded", initZoomFeature);
})();