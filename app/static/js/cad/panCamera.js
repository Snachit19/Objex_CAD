(function () {
  "use strict";

  const DEFAULT_PAN_STEP = 0.5;

  let panCameraInitialized = false;

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

  function getPanStep() {
    const input = document.getElementById("panStepInput");

    if (!input) {
      return DEFAULT_PAN_STEP;
    }

    const value = Number(input.value);

    if (Number.isNaN(value) || value <= 0) {
      return DEFAULT_PAN_STEP;
    }

    return value;
  }

  function getCameraPanVectors(camera) {
    const rightVector = new THREE.Vector3();
    const upVector = new THREE.Vector3();
    const forwardVector = new THREE.Vector3();

    camera.updateMatrixWorld();
    camera.matrixWorld.extractBasis(rightVector, upVector, forwardVector);

    rightVector.normalize();
    upVector.normalize();

    return {
      right: rightVector,
      up: upVector
    };
  }

  function moveCameraAndTarget(moveVector) {
    const camera = getCamera();
    const controls = getControls();

    if (!camera || typeof THREE === "undefined") {
      setStatus("Camera is not ready. Pan cannot be used.");
      return;
    }

    camera.position.add(moveVector);

    if (controls && controls.target) {
      controls.target.add(moveVector);
      controls.update();
    }

    camera.updateProjectionMatrix();
  }

  function panCamera(direction) {
    const camera = getCamera();

    if (!camera || typeof THREE === "undefined") {
      setStatus("Camera is not ready. Pan cannot be used.");
      return;
    }

    const step = getPanStep();
    const vectors = getCameraPanVectors(camera);
    const moveVector = new THREE.Vector3();

    if (direction === "left") {
      moveVector.copy(vectors.right).multiplyScalar(-step);
    } else if (direction === "right") {
      moveVector.copy(vectors.right).multiplyScalar(step);
    } else if (direction === "up") {
      moveVector.copy(vectors.up).multiplyScalar(step);
    } else if (direction === "down") {
      moveVector.copy(vectors.up).multiplyScalar(-step);
    } else {
      setStatus("Invalid pan direction.");
      return;
    }

    moveCameraAndTarget(moveVector);
    setStatus("Camera panned " + direction + ".");
  }

  function resetPanCameraView() {
    if (typeof window.resetCADCameraView !== "function") {
      setStatus("Reset camera function is not available.");
      return;
    }

    const resetDone = window.resetCADCameraView();

    if (!resetDone) {
      setStatus("Camera is not ready. View cannot be reset.");
      return;
    }

    setStatus("Camera view reset.");
  }

  function connectPanButton(buttonId, direction) {
    const button = document.getElementById(buttonId);

    if (!button) {
      return;
    }

    button.addEventListener("click", function () {
      panCamera(direction);
    });
  }

  function initPanCameraControls() {
    if (panCameraInitialized) {
      return;
    }

    panCameraInitialized = true;

    connectPanButton("panLeftBtn", "left");
    connectPanButton("panRightBtn", "right");
    connectPanButton("panUpBtn", "up");
    connectPanButton("panDownBtn", "down");

    const resetPanBtn = document.getElementById("resetPanBtn");

    if (resetPanBtn) {
      resetPanBtn.addEventListener("click", resetPanCameraView);
    }
  }

  window.panCamera = panCamera;
  window.resetPanCameraView = resetPanCameraView;

  document.addEventListener("DOMContentLoaded", initPanCameraControls);
})();