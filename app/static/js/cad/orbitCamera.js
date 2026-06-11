(function () {
  "use strict";

  const DEFAULT_ORBIT_STEP = 15;
  const MIN_POLAR_ANGLE = 0.15;
  const MAX_POLAR_ANGLE = Math.PI - 0.15;

  let orbitCameraInitialized = false;
  let autoOrbitEnabled = false;

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

  function getOrbitStep() {
    const input = document.getElementById("orbitStepInput");

    if (!input) {
      return DEFAULT_ORBIT_STEP;
    }

    const value = Number(input.value);

    if (Number.isNaN(value) || value <= 0) {
      return DEFAULT_ORBIT_STEP;
    }

    return value;
  }

  function degreeToRadian(degree) {
    return degree * Math.PI / 180;
  }

  function getTargetPoint(controls) {
    if (controls && controls.target) {
      return controls.target.clone();
    }

    return new THREE.Vector3(0, 0, 0);
  }

  function orbitCamera(horizontalAngle, verticalAngle) {
    const camera = getCamera();
    const controls = getControls();

    if (!camera || typeof THREE === "undefined") {
      setStatus("Camera is not ready. Orbit cannot be used.");
      return;
    }

    const target = getTargetPoint(controls);
    const offset = new THREE.Vector3().subVectors(camera.position, target);

    const spherical = new THREE.Spherical();
    spherical.setFromVector3(offset);

    spherical.theta += horizontalAngle;
    spherical.phi += verticalAngle;

    spherical.phi = Math.max(
      MIN_POLAR_ANGLE,
      Math.min(MAX_POLAR_ANGLE, spherical.phi)
    );

    const newPosition = new THREE.Vector3().setFromSpherical(spherical);

    camera.position.copy(target).add(newPosition);
    camera.lookAt(target);
    camera.updateProjectionMatrix();

    if (controls) {
      controls.target.copy(target);
      controls.update();
    }
  }

  function orbitLeft() {
    const step = degreeToRadian(getOrbitStep());
    orbitCamera(-step, 0);
    setStatus("Camera orbited left.");
  }

  function orbitRight() {
    const step = degreeToRadian(getOrbitStep());
    orbitCamera(step, 0);
    setStatus("Camera orbited right.");
  }

  function orbitUp() {
    const step = degreeToRadian(getOrbitStep());
    orbitCamera(0, -step);
    setStatus("Camera orbited up.");
  }

  function orbitDown() {
    const step = degreeToRadian(getOrbitStep());
    orbitCamera(0, step);
    setStatus("Camera orbited down.");
  }

  function resetOrbitCameraView() {
    if (typeof window.resetCADCameraView !== "function") {
      setStatus("Reset camera function is not available.");
      return;
    }

    stopAutoOrbit();

    const resetDone = window.resetCADCameraView();

    if (!resetDone) {
      setStatus("Camera is not ready. View cannot be reset.");
      return;
    }

    setStatus("Camera orbit view reset.");
  }

  function startAutoOrbit() {
    const controls = getControls();

    if (!controls) {
      setStatus("Camera controls are not ready. Auto orbit cannot start.");
      return;
    }

    autoOrbitEnabled = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;
    controls.update();

    updateAutoOrbitButton();
    setStatus("Auto orbit started.");
  }

  function stopAutoOrbit() {
    const controls = getControls();

    autoOrbitEnabled = false;

    if (controls) {
      controls.autoRotate = false;
      controls.update();
    }

    updateAutoOrbitButton();
  }

  function toggleAutoOrbit() {
    if (autoOrbitEnabled) {
      stopAutoOrbit();
      setStatus("Auto orbit stopped.");
    } else {
      startAutoOrbit();
    }
  }

  function updateAutoOrbitButton() {
    const button = document.getElementById("toggleAutoOrbitBtn");

    if (!button) {
      return;
    }

    if (autoOrbitEnabled) {
      button.textContent = "Stop Auto Orbit";
    } else {
      button.textContent = "Start Auto Orbit";
    }
  }

  function connectButton(buttonId, handler) {
    const button = document.getElementById(buttonId);

    if (!button) {
      return;
    }

    button.addEventListener("click", handler);
  }

  function initOrbitCameraControls() {
    if (orbitCameraInitialized) {
      return;
    }

    orbitCameraInitialized = true;

    connectButton("orbitLeftBtn", orbitLeft);
    connectButton("orbitRightBtn", orbitRight);
    connectButton("orbitUpBtn", orbitUp);
    connectButton("orbitDownBtn", orbitDown);
    connectButton("resetOrbitBtn", resetOrbitCameraView);
    connectButton("toggleAutoOrbitBtn", toggleAutoOrbit);

    updateAutoOrbitButton();
  }

  window.orbitCamera = orbitCamera;
  window.orbitLeft = orbitLeft;
  window.orbitRight = orbitRight;
  window.orbitUp = orbitUp;
  window.orbitDown = orbitDown;
  window.resetOrbitCameraView = resetOrbitCameraView;
  window.toggleAutoOrbit = toggleAutoOrbit;

  document.addEventListener("DOMContentLoaded", initOrbitCameraControls);
})();