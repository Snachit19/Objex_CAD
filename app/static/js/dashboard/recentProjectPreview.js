const dashboardPreviewState = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  objectGroup: null,
  grid: null,
  axes: null,
  selectedHelper: null,
  meshes: [],
  selectedIndex: -1,
  zoom: 1,
  mode: "pan",
  controlsBound: false,
  isAnimating: false,
  raycaster: null,
  pointer: null
};

function setDashboardPreviewText(elementId, text) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = text;
  }
}

function setDashboardPreviewValue(elementId, value) {
  const element = document.getElementById(elementId);

  if (element) {
    element.value = value;
  }
}

function parseProjectDesignData(designData) {
  if (Array.isArray(designData)) {
    return designData;
  }

  if (typeof designData === "string" && designData.trim()) {
    try {
      const parsedDesignData = JSON.parse(designData);
      return Array.isArray(parsedDesignData) ? parsedDesignData : [];
    } catch (error) {
      console.error("Could not parse dashboard preview design data:", error);
    }
  }

  return [];
}

function normaliseDashboardNumber(value, fallback) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function formatDashboardNumber(value, fallback) {
  return normaliseDashboardNumber(value, fallback).toFixed(2);
}

function clampDashboardValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getDashboardObjectColor(savedObject) {
  if (savedObject && typeof savedObject.color === "string" && savedObject.color.trim()) {
    return savedObject.color;
  }

  return "#6366f1";
}

function getDashboardObjectLabel(savedObject) {
  if (!savedObject) {
    return "Inspector Panel";
  }

  if (savedObject.name) {
    return savedObject.name;
  }

  if (savedObject.type) {
    return savedObject.type.charAt(0).toUpperCase() + savedObject.type.slice(1);
  }

  return "Saved Object";
}

function formatDashboardLabel(value, fallback) {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  return value
    .trim()
    .split(/[\s_-]+/)
    .map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function getDashboardObjectTypeLabel(savedObject) {
  return savedObject && savedObject.type
    ? formatDashboardLabel(savedObject.type, "Saved Object")
    : "-";
}

function getDashboardObjectSource(savedObject) {
  if (!savedObject) {
    return "-";
  }

  if (savedObject.type === "imported") {
    const importFormat = typeof savedObject.importFormat === "string" && savedObject.importFormat.trim()
      ? savedObject.importFormat.trim().toUpperCase()
      : "3D Model";

    return "Imported " + importFormat;
  }

  return "CAD Shape";
}

function getDashboardMaterialValue(savedObject, key, fallback) {
  const materialData = savedObject && savedObject.materialData ? savedObject.materialData : {};

  return formatDashboardNumber(materialData[key], fallback);
}

function getLatestProject(projects) {
  if (!Array.isArray(projects) || projects.length === 0) {
    return null;
  }

  return projects.slice().sort(function (firstProject, secondProject) {
    const firstDate = new Date(firstProject.last_opened_at || firstProject.updated_at || firstProject.created_at || 0).getTime();
    const secondDate = new Date(secondProject.last_opened_at || secondProject.updated_at || secondProject.created_at || 0).getTime();

    return (Number.isFinite(secondDate) ? secondDate : 0) - (Number.isFinite(firstDate) ? firstDate : 0);
  })[0];
}

function getObjectCountLabel(count) {
  return count === 1 ? "1 Object Saved" : count + " Objects Saved";
}

function updateRecentProjectOpenAction(project) {
  const openButton = document.getElementById("openRecentProjectBtn");
  const hasProject = Boolean(project && project.id);

  if (!openButton) {
    return;
  }

  openButton.disabled = !hasProject;
  openButton.textContent = hasProject ? "Open Project" : "No Project";
  openButton.onclick = hasProject
    ? function () {
        window.location.assign("/cad/" + project.id);
      }
    : null;
}

function getPreviewObject(projectDesignData) {
  return projectDesignData.find(function (savedObject) {
    return savedObject && savedObject.type;
  }) || null;
}

function updateDashboardPreviewProperties(savedObject) {
  const position = savedObject && savedObject.position ? savedObject.position : {};
  const rotation = savedObject && savedObject.rotation ? savedObject.rotation : {};
  const scale = savedObject && savedObject.scale ? savedObject.scale : {};
  const materialType = savedObject && savedObject.materialType ? savedObject.materialType : "default";
  const inspectorLabel = savedObject
    ? getDashboardObjectLabel(savedObject) + " selected"
    : "Inspector Panel";

  setDashboardPreviewText("dashboardPreviewInspectorLabel", inspectorLabel);
  setDashboardPreviewValue("dashboardPreviewObjectName", savedObject ? getDashboardObjectLabel(savedObject) : "No object selected");
  setDashboardPreviewValue("dashboardPreviewObjectType", getDashboardObjectTypeLabel(savedObject));
  setDashboardPreviewValue("dashboardPreviewObjectId", savedObject && savedObject.id ? savedObject.id : "-");
  setDashboardPreviewValue("dashboardPreviewObjectSource", getDashboardObjectSource(savedObject));
  setDashboardPreviewValue("dashboardPreviewPositionX", formatDashboardNumber(position.x, 0));
  setDashboardPreviewValue("dashboardPreviewPositionY", formatDashboardNumber(position.y, 0));
  setDashboardPreviewValue("dashboardPreviewPositionZ", formatDashboardNumber(position.z, 0));
  setDashboardPreviewValue("dashboardPreviewRotationX", formatDashboardNumber(rotation.x, 0));
  setDashboardPreviewValue("dashboardPreviewRotationY", formatDashboardNumber(rotation.y, 0));
  setDashboardPreviewValue("dashboardPreviewRotationZ", formatDashboardNumber(rotation.z, 0));
  setDashboardPreviewValue("dashboardPreviewScaleX", formatDashboardNumber(scale.x, 1));
  setDashboardPreviewValue("dashboardPreviewScaleY", formatDashboardNumber(scale.y, 1));
  setDashboardPreviewValue("dashboardPreviewScaleZ", formatDashboardNumber(scale.z, 1));
  setDashboardPreviewValue("dashboardPreviewColor", savedObject && savedObject.color ? savedObject.color : "#6366f1");
  setDashboardPreviewValue(
    "dashboardPreviewMaterial",
    savedObject && savedObject.materialName ? savedObject.materialName : "Default"
  );
  setDashboardPreviewValue("dashboardPreviewMaterialType", savedObject ? formatDashboardLabel(materialType, "Default") : "-");
  setDashboardPreviewValue("dashboardPreviewRoughness", savedObject ? getDashboardMaterialValue(savedObject, "roughness", 0.45) : "0.45");
  setDashboardPreviewValue("dashboardPreviewMetalness", savedObject ? getDashboardMaterialValue(savedObject, "metalness", 0.15) : "0.15");
  setDashboardPreviewValue("dashboardPreviewOpacity", savedObject ? getDashboardMaterialValue(savedObject, "opacity", 1) : "1.00");
}

function createDashboardPreviewEmptyState(message) {
  const emptyState = document.createElement("div");
  emptyState.className = "dashboard-preview-empty";
  emptyState.textContent = message;

  return emptyState;
}

function clearDashboardPreviewMessage() {
  const previewScene = document.getElementById("dashboardPreviewScene");

  if (!previewScene) {
    return;
  }

  previewScene.querySelectorAll(".dashboard-preview-empty").forEach(function (emptyState) {
    emptyState.remove();
  });
}

function showDashboardPreviewMessage(message) {
  const previewScene = document.getElementById("dashboardPreviewScene");

  if (!previewScene) {
    return;
  }

  clearDashboardPreviewMessage();
  previewScene.appendChild(createDashboardPreviewEmptyState(message));
}

function createDashboardGeometry(type) {
  if (type === "sphere") {
    return new THREE.SphereGeometry(0.8, 32, 32);
  }

  if (type === "cylinder") {
    return new THREE.CylinderGeometry(0.7, 0.7, 1.6, 32);
  }

  if (type === "cone") {
    return new THREE.ConeGeometry(0.8, 1.7, 32);
  }

  if (type === "torus") {
    return new THREE.TorusGeometry(0.75, 0.25, 16, 80);
  }

  if (type === "pyramid") {
    return new THREE.ConeGeometry(0.9, 1.6, 4);
  }

  if (type === "plane") {
    return new THREE.BoxGeometry(2.2, 0.08, 1.4);
  }

  return new THREE.BoxGeometry(1.4, 1.4, 1.4);
}

function createDashboardMaterial(savedObject) {
  const materialData = savedObject && savedObject.materialData ? savedObject.materialData : {};
  const objectColor = getDashboardObjectColor(savedObject);
  const opacity = materialData.opacity === undefined
    ? 1
    : clampDashboardValue(normaliseDashboardNumber(materialData.opacity, 1), 0.1, 1);
  const isNeon = savedObject && savedObject.materialType === "neon";
  const emissiveColor = isNeon ? objectColor : (materialData.emissive || "#000000");

  return new THREE.MeshStandardMaterial({
    color: objectColor,
    roughness: materialData.roughness === undefined
      ? 0.42
      : clampDashboardValue(normaliseDashboardNumber(materialData.roughness, 0.42), 0, 1),
    metalness: materialData.metalness === undefined
      ? 0.16
      : clampDashboardValue(normaliseDashboardNumber(materialData.metalness, 0.16), 0, 1),
    opacity: opacity,
    transparent: opacity < 1 || Boolean(materialData.transparent),
    emissive: new THREE.Color(emissiveColor || "#000000"),
    emissiveIntensity: materialData.emissiveIntensity === undefined
      ? (isNeon ? 0.55 : 0)
      : normaliseDashboardNumber(materialData.emissiveIntensity, isNeon ? 0.55 : 0)
  });
}

function applyDashboardMeshTransform(mesh, savedObject) {
  const position = savedObject && savedObject.position ? savedObject.position : {};
  const rotation = savedObject && savedObject.rotation ? savedObject.rotation : {};
  const scale = savedObject && savedObject.scale ? savedObject.scale : {};

  mesh.position.set(
    normaliseDashboardNumber(position.x, 0),
    normaliseDashboardNumber(position.y, 0),
    normaliseDashboardNumber(position.z, 0)
  );
  mesh.rotation.set(
    normaliseDashboardNumber(rotation.x, 0),
    normaliseDashboardNumber(rotation.y, 0),
    normaliseDashboardNumber(rotation.z, 0)
  );
  mesh.scale.set(
    normaliseDashboardNumber(scale.x, 1),
    normaliseDashboardNumber(scale.y, 1),
    normaliseDashboardNumber(scale.z, 1)
  );
}

function disposeDashboardMaterial(material) {
  if (Array.isArray(material)) {
    material.forEach(disposeDashboardMaterial);
    return;
  }

  if (material && typeof material.dispose === "function") {
    material.dispose();
  }
}

function clearDashboardPreviewMeshes() {
  const state = dashboardPreviewState;

  if (!state.objectGroup) {
    return;
  }

  if (state.selectedHelper) {
    state.scene.remove(state.selectedHelper);
    state.selectedHelper = null;
  }

  state.objectGroup.children.slice().forEach(function (mesh) {
    state.objectGroup.remove(mesh);

    if (mesh.geometry && typeof mesh.geometry.dispose === "function") {
      mesh.geometry.dispose();
    }

    disposeDashboardMaterial(mesh.material);
  });

  state.meshes = [];
  state.selectedIndex = -1;
}

function resizeDashboardPreviewRenderer() {
  const previewScene = document.getElementById("dashboardPreviewScene");
  const state = dashboardPreviewState;

  if (!previewScene || !state.renderer || !state.camera) {
    return;
  }

  const width = previewScene.clientWidth || 640;
  const height = previewScene.clientHeight || 360;

  state.renderer.setSize(width, height, false);
  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();
}

function animateDashboardPreview() {
  const state = dashboardPreviewState;

  if (!state.scene || !state.camera || !state.renderer) {
    state.isAnimating = false;
    return;
  }

  state.isAnimating = true;
  window.requestAnimationFrame(animateDashboardPreview);

  if (state.controls) {
    state.controls.update();
  }

  if (state.selectedHelper) {
    state.selectedHelper.update();
  }

  state.renderer.render(state.scene, state.camera);
}

function addDashboardPreviewLights() {
  const state = dashboardPreviewState;
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.68);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.05);
  const fillLight = new THREE.DirectionalLight(0x8ec5ff, 0.55);

  keyLight.position.set(6, 9, 7);
  fillLight.position.set(-5, 4, -6);
  state.scene.add(ambientLight);
  state.scene.add(keyLight);
  state.scene.add(fillLight);
}

function ensureDashboardThreePreview() {
  const previewScene = document.getElementById("dashboardPreviewScene");
  const state = dashboardPreviewState;

  if (!previewScene) {
    return false;
  }

  if (typeof THREE === "undefined" || typeof THREE.WebGLRenderer !== "function") {
    previewScene.textContent = "";
    previewScene.appendChild(createDashboardPreviewEmptyState("3D preview library is loading"));
    return false;
  }

  if (state.renderer) {
    resizeDashboardPreviewRenderer();
    initDashboardPreviewControls();
    return true;
  }

  previewScene.textContent = "";

  const canvas = document.createElement("canvas");
  canvas.className = "dashboard-preview-canvas";
  canvas.setAttribute("aria-label", "Recent project 3D preview");
  previewScene.appendChild(canvas);

  state.scene = new THREE.Scene();
  state.scene.background = null;
  state.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 1000);
  state.camera.position.set(6, 5, 8);
  state.renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
  });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  state.objectGroup = new THREE.Group();
  state.scene.add(state.objectGroup);

  state.grid = new THREE.GridHelper(40, 40, 0x3b82f6, 0x25304a);
  state.grid.material.opacity = 0.58;
  state.grid.material.transparent = true;
  state.scene.add(state.grid);

  state.axes = new THREE.AxesHelper(4.8);
  state.scene.add(state.axes);

  state.raycaster = new THREE.Raycaster();
  state.pointer = new THREE.Vector2();

  if (typeof THREE.OrbitControls === "function") {
    state.controls = new THREE.OrbitControls(state.camera, state.renderer.domElement);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.08;
    state.controls.enablePan = true;
    state.controls.enableRotate = false;
    state.controls.enableZoom = true;
    state.controls.screenSpacePanning = true;
  }

  addDashboardPreviewLights();
  resizeDashboardPreviewRenderer();
  initDashboardPreviewControls();
  setDashboardPreviewMode("pan");

  state.renderer.domElement.addEventListener("pointerdown", handleDashboardPreviewPointerDown);
  window.addEventListener("resize", resizeDashboardPreviewRenderer);

  if (!state.isAnimating) {
    animateDashboardPreview();
  }

  return true;
}

function createDashboardPreviewMesh(savedObject, index) {
  const mesh = new THREE.Mesh(
    createDashboardGeometry(savedObject.type),
    createDashboardMaterial(savedObject)
  );

  mesh.name = getDashboardObjectLabel(savedObject);
  mesh.userData.previewObjectIndex = index;
  mesh.userData.savedObject = savedObject;
  applyDashboardMeshTransform(mesh, savedObject);

  return mesh;
}

function getDashboardPreviewBounds(targetObject) {
  const box = new THREE.Box3().setFromObject(targetObject);

  if (box.isEmpty()) {
    return null;
  }

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  box.getCenter(center);
  box.getSize(size);

  return {
    center: center,
    size: size,
    maxSize: Math.max(size.x, size.y, size.z, 1)
  };
}

function updateDashboardPreviewZoomLabel() {
  const zoomLabel = document.getElementById("previewZoomValue");

  if (zoomLabel) {
    zoomLabel.textContent = Math.round(dashboardPreviewState.zoom * 100) + "%";
  }
}

function setDashboardPreviewZoom(zoom) {
  const state = dashboardPreviewState;

  state.zoom = clampDashboardValue(zoom, 0.35, 2.8);

  if (state.camera) {
    state.camera.zoom = state.zoom;
    state.camera.updateProjectionMatrix();
  }

  updateDashboardPreviewZoomLabel();
}

function fitDashboardPreviewView(targetObject, resetZoom) {
  const state = dashboardPreviewState;

  if (!state.camera || !state.objectGroup) {
    return;
  }

  const objectToFit = targetObject || state.objectGroup;
  const bounds = getDashboardPreviewBounds(objectToFit);

  if (!bounds) {
    state.camera.position.set(6, 5, 8);

    if (state.controls) {
      state.controls.target.set(0, 0, 0);
      state.controls.update();
    }

    if (resetZoom) {
      setDashboardPreviewZoom(1);
    }

    return;
  }

  const fitDistance = bounds.maxSize / (2 * Math.tan((state.camera.fov * Math.PI) / 360));
  const viewDirection = new THREE.Vector3(1.35, 0.9, 1.45).normalize();
  const distance = Math.max(fitDistance * 1.7, 5);

  state.camera.position.copy(bounds.center).addScaledVector(viewDirection, distance);
  state.camera.near = Math.max(distance / 100, 0.01);
  state.camera.far = Math.max(distance * 100, 1000);

  if (resetZoom) {
    setDashboardPreviewZoom(1);
  }

  state.camera.updateProjectionMatrix();

  if (state.controls) {
    state.controls.target.copy(bounds.center);
    state.controls.update();
  }
}

function renderDashboardPreviewObjects(projectDesignData) {
  if (!ensureDashboardThreePreview()) {
    return;
  }

  clearDashboardPreviewMessage();
  clearDashboardPreviewMeshes();

  const savedObjects = Array.isArray(projectDesignData)
    ? projectDesignData.filter(function (savedObject) {
        return savedObject && savedObject.type;
      })
    : [];

  window.dashboardPreviewObjects = savedObjects;

  if (savedObjects.length === 0) {
    window.dashboardPreviewSelectedObject = null;
    updateDashboardPreviewProperties(null);
    showDashboardPreviewMessage("No saved objects yet");
    updateDashboardPreviewControlAvailability();
    return;
  }

  savedObjects.forEach(function (savedObject, index) {
    const mesh = createDashboardPreviewMesh(savedObject, index);

    dashboardPreviewState.meshes.push(mesh);
    dashboardPreviewState.objectGroup.add(mesh);
  });

  fitDashboardPreviewView(null, true);
  selectDashboardPreviewObject(0);
  updateDashboardPreviewControlAvailability();
}

function selectDashboardPreviewObject(index) {
  const state = dashboardPreviewState;
  const selectedMesh = state.meshes[index] || null;
  const selectedObject = selectedMesh ? selectedMesh.userData.savedObject : null;

  if (state.selectedHelper) {
    state.scene.remove(state.selectedHelper);
    state.selectedHelper = null;
  }

  if (selectedMesh) {
    state.selectedHelper = new THREE.BoxHelper(selectedMesh, 0x93c5fd);
    state.scene.add(state.selectedHelper);
  }

  state.selectedIndex = selectedMesh ? index : -1;
  window.dashboardPreviewSelectedObject = selectedObject;
  updateDashboardPreviewProperties(selectedObject);

  window.dispatchEvent(new CustomEvent("dashboard:preview-object-selected", {
    detail: {
      selectedObject: selectedObject,
      selectedIndex: state.selectedIndex
    }
  }));
}

function handleDashboardPreviewPointerDown(event) {
  const state = dashboardPreviewState;

  if (!state.renderer || !state.camera || !state.raycaster || !state.pointer || state.meshes.length === 0) {
    return;
  }

  const rect = state.renderer.domElement.getBoundingClientRect();
  state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  state.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  state.raycaster.setFromCamera(state.pointer, state.camera);

  const intersection = state.raycaster.intersectObjects(state.meshes, false)[0];

  if (intersection && intersection.object) {
    selectDashboardPreviewObject(intersection.object.userData.previewObjectIndex);
  }
}

function setDashboardPreviewMode(mode) {
  const state = dashboardPreviewState;
  const panButton = document.getElementById("previewPanBtn");
  const orbitButton = document.getElementById("previewOrbitBtn");

  state.mode = mode;

  if (state.controls && window.THREE) {
    state.controls.enableRotate = mode === "orbit";
    state.controls.enablePan = true;

    if (state.controls.mouseButtons && THREE.MOUSE) {
      state.controls.mouseButtons.LEFT = mode === "orbit" ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
    }

    state.controls.update();
  }

  if (panButton) {
    panButton.classList.toggle("active-preview-control", mode === "pan");
  }

  if (orbitButton) {
    orbitButton.classList.toggle("active-preview-control", mode === "orbit");
  }
}

function focusDashboardPreviewType(type) {
  const mesh = dashboardPreviewState.meshes.find(function (previewMesh) {
    return previewMesh.userData.savedObject && previewMesh.userData.savedObject.type === type;
  });

  if (!mesh) {
    fitDashboardPreviewView(null, false);
    return;
  }

  selectDashboardPreviewObject(mesh.userData.previewObjectIndex);
  fitDashboardPreviewView(mesh, false);
}

function updateDashboardPreviewControlAvailability() {
  const savedObjects = window.dashboardPreviewObjects || [];
  const hasObjects = savedObjects.length > 0;
  const hasSphere = savedObjects.some(function (savedObject) {
    return savedObject && savedObject.type === "sphere";
  });
  const hasCube = savedObjects.some(function (savedObject) {
    return savedObject && savedObject.type === "cube";
  });
  const controlAvailability = {
    previewFocusAllBtn: hasObjects,
    previewFocusSphereBtn: hasSphere,
    previewFocusCubeBtn: hasCube,
    previewFitViewBtn: hasObjects,
    previewZoomInBtn: Boolean(dashboardPreviewState.camera),
    previewZoomOutBtn: Boolean(dashboardPreviewState.camera),
    previewGridToggleBtn: Boolean(dashboardPreviewState.grid),
    previewPanBtn: Boolean(dashboardPreviewState.controls),
    previewOrbitBtn: Boolean(dashboardPreviewState.controls),
    previewResetViewBtn: Boolean(dashboardPreviewState.camera)
  };

  Object.keys(controlAvailability).forEach(function (buttonId) {
    const button = document.getElementById(buttonId);

    if (button) {
      button.disabled = !controlAvailability[buttonId];
    }
  });
}

function initDashboardPreviewControls() {
  if (dashboardPreviewState.controlsBound) {
    updateDashboardPreviewControlAvailability();
    return;
  }

  const panButton = document.getElementById("previewPanBtn");
  const orbitButton = document.getElementById("previewOrbitBtn");
  const resetButton = document.getElementById("previewResetViewBtn");
  const focusAllButton = document.getElementById("previewFocusAllBtn");
  const focusSphereButton = document.getElementById("previewFocusSphereBtn");
  const focusCubeButton = document.getElementById("previewFocusCubeBtn");
  const zoomOutButton = document.getElementById("previewZoomOutBtn");
  const zoomInButton = document.getElementById("previewZoomInBtn");
  const gridButton = document.getElementById("previewGridToggleBtn");
  const fitButton = document.getElementById("previewFitViewBtn");

  if (panButton) {
    panButton.addEventListener("click", function () {
      setDashboardPreviewMode("pan");
    });
  }

  if (orbitButton) {
    orbitButton.addEventListener("click", function () {
      setDashboardPreviewMode("orbit");
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", function () {
      setDashboardPreviewMode("pan");
      fitDashboardPreviewView(null, true);
    });
  }

  if (focusAllButton) {
    focusAllButton.addEventListener("click", function () {
      fitDashboardPreviewView(null, false);
    });
  }

  if (focusSphereButton) {
    focusSphereButton.addEventListener("click", function () {
      focusDashboardPreviewType("sphere");
    });
  }

  if (focusCubeButton) {
    focusCubeButton.addEventListener("click", function () {
      focusDashboardPreviewType("cube");
    });
  }

  if (zoomOutButton) {
    zoomOutButton.addEventListener("click", function () {
      setDashboardPreviewZoom(dashboardPreviewState.zoom / 1.15);
    });
  }

  if (zoomInButton) {
    zoomInButton.addEventListener("click", function () {
      setDashboardPreviewZoom(dashboardPreviewState.zoom * 1.15);
    });
  }

  if (gridButton) {
    gridButton.addEventListener("click", function () {
      if (!dashboardPreviewState.grid) {
        return;
      }

      dashboardPreviewState.grid.visible = !dashboardPreviewState.grid.visible;
      if (dashboardPreviewState.axes) {
        dashboardPreviewState.axes.visible = dashboardPreviewState.grid.visible;
      }
      gridButton.classList.toggle("active-preview-control", dashboardPreviewState.grid.visible);
    });
  }

  if (fitButton) {
    fitButton.addEventListener("click", function () {
      const selectedMesh = dashboardPreviewState.meshes[dashboardPreviewState.selectedIndex] || null;
      fitDashboardPreviewView(selectedMesh, false);
    });
  }

  dashboardPreviewState.controlsBound = true;
  updateDashboardPreviewZoomLabel();
  updateDashboardPreviewControlAvailability();
}

function showEmptyDashboardPreview() {
  setDashboardPreviewText("recentPreviewTitle", "Perspective View");
  setDashboardPreviewText("recentPreviewProjectName", "No recent project");
  setDashboardPreviewText("recentPreviewProjectDescription", "Create a project to preview it here.");
  setDashboardPreviewText("recentPreviewObjectCount", "0 Objects Saved");
  updateRecentProjectOpenAction(null);
  window.dashboardPreviewObjects = [];
  window.dashboardPreviewSelectedObject = null;
  updateDashboardPreviewProperties(null);
  renderDashboardPreviewObjects([]);
}

function updateDashboardPreview(project) {
  if (!project) {
    showEmptyDashboardPreview();
    return;
  }

  const projectDesignData = parseProjectDesignData(project.design_data);
  const previewObject = getPreviewObject(projectDesignData);

  setDashboardPreviewText("recentPreviewTitle", project.name || "Perspective View");
  setDashboardPreviewText("recentPreviewProjectName", project.name || "Untitled Project");
  setDashboardPreviewText(
    "recentPreviewProjectDescription",
    project.description || "No description added."
  );
  setDashboardPreviewText("recentPreviewObjectCount", getObjectCountLabel(projectDesignData.length));
  updateRecentProjectOpenAction(project);
  renderDashboardPreviewObjects(projectDesignData);

  if (!window.dashboardPreviewSelectedObject) {
    updateDashboardPreviewProperties(previewObject);
  }

  window.dispatchEvent(new CustomEvent("dashboard:recent-project-preview", {
    detail: {
      project: project,
      designData: projectDesignData,
      previewObject: previewObject
    }
  }));
}

async function loadRecentProjectPreview(projects) {
  const latestProject = getLatestProject(projects);

  if (!latestProject || !latestProject.id) {
    showEmptyDashboardPreview();
    return;
  }

  try {
    const response = await fetch("/api/projects/" + latestProject.id);
    const data = await response.json();

    if (!response.ok || !data.success) {
      updateDashboardPreview(latestProject);
      return;
    }

    updateDashboardPreview(data.project || latestProject);
  } catch (error) {
    console.error("Could not load recent project preview:", error);
    updateDashboardPreview(latestProject);
  }
}

initDashboardPreviewControls();

window.loadRecentProjectPreview = loadRecentProjectPreview;
window.updateDashboardPreview = updateDashboardPreview;
window.selectDashboardPreviewObject = selectDashboardPreviewObject;
