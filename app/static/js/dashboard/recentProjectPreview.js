const dashboardPreviewState = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  canvas: null,
  grid: null,
  objectGroup: null,
  selectionHelper: null,
  objects: [],
  selectedMesh: null,
  zoom: 1,
  mode: "pan",
  controlsBound: false,
  isAnimating: false
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

  if (Number.isFinite(numberValue)) {
    return numberValue;
  }

  return fallback;
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

function createDashboardPreviewEmptyState(message) {
  const emptyState = document.createElement("div");
  emptyState.className = "dashboard-preview-empty";
  emptyState.textContent = message;

  return emptyState;
}

function showDashboardPreviewMessage(message) {
  const previewScene = document.getElementById("dashboardPreviewScene");

  if (!previewScene) {
    return;
  }

  previewScene.querySelectorAll(".dashboard-preview-empty").forEach(function (emptyState) {
    emptyState.remove();
  });

  previewScene.appendChild(createDashboardPreviewEmptyState(message));
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
        window.location.href = "/cad/" + project.id;
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
  const inspectorLabel = savedObject
    ? getDashboardObjectLabel(savedObject) + " selected"
    : "Inspector Panel";

  setDashboardPreviewText("dashboardPreviewInspectorLabel", inspectorLabel);
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
}

function createDashboardPreviewGeometry(type) {
  if (!window.THREE) {
    return null;
  }

  if (type === "cube") {
    return new THREE.BoxGeometry(1.4, 1.4, 1.4);
  }

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

  return new THREE.BoxGeometry(1.2, 1.2, 1.2);
}

function createDashboardPreviewMaterial(savedObject) {
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
      ? 0.45
      : clampDashboardValue(normaliseDashboardNumber(materialData.roughness, 0.45), 0, 1),
    metalness: materialData.metalness === undefined
      ? 0.15
      : clampDashboardValue(normaliseDashboardNumber(materialData.metalness, 0.15), 0, 1),
    opacity: opacity,
    transparent: opacity < 1 || Boolean(materialData.transparent),
    emissive: new THREE.Color(emissiveColor || "#000000"),
    emissiveIntensity: materialData.emissiveIntensity === undefined
      ? (isNeon ? 0.55 : 0)
      : normaliseDashboardNumber(materialData.emissiveIntensity, isNeon ? 0.55 : 0),
    depthWrite: materialData.depthWrite !== undefined ? Boolean(materialData.depthWrite) : true
  });
}

function applyDashboardPreviewTransform(mesh, savedObject) {
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

function disposeDashboardPreviewMaterial(material) {
  if (Array.isArray(material)) {
    material.forEach(disposeDashboardPreviewMaterial);
    return;
  }

  if (material && typeof material.dispose === "function") {
    material.dispose();
  }
}

function clearDashboardThreeObjects() {
  if (!dashboardPreviewState.objectGroup) {
    return;
  }

  if (dashboardPreviewState.selectionHelper) {
    dashboardPreviewState.scene.remove(dashboardPreviewState.selectionHelper);
    dashboardPreviewState.selectionHelper = null;
  }

  dashboardPreviewState.objectGroup.children.slice().forEach(function (object) {
    dashboardPreviewState.objectGroup.remove(object);

    if (object.geometry && typeof object.geometry.dispose === "function") {
      object.geometry.dispose();
    }

    disposeDashboardPreviewMaterial(object.material);
  });

  dashboardPreviewState.objects = [];
  dashboardPreviewState.selectedMesh = null;
}

function resizeDashboardPreviewRenderer() {
  const previewScene = document.getElementById("dashboardPreviewScene");
  const state = dashboardPreviewState;

  if (!previewScene || !state.renderer || !state.camera) {
    return;
  }

  const width = previewScene.clientWidth || 640;
  const height = previewScene.clientHeight || 360;

  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(width, height, false);
}

function animateDashboardPreview() {
  const state = dashboardPreviewState;

  if (!state.renderer || !state.scene || !state.camera) {
    state.isAnimating = false;
    return;
  }

  state.isAnimating = true;
  window.requestAnimationFrame(animateDashboardPreview);

  if (state.controls) {
    state.controls.update();
  }

  if (state.selectionHelper) {
    state.selectionHelper.update();
  }

  state.renderer.render(state.scene, state.camera);
}

function addDashboardPreviewLights() {
  const state = dashboardPreviewState;
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  const fillLight = new THREE.DirectionalLight(0x8ec5ff, 0.55);

  keyLight.position.set(5, 8, 6);
  fillLight.position.set(-4, 5, -5);

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
    previewScene.appendChild(createDashboardPreviewEmptyState("3D preview is not ready"));
    return false;
  }

  if (state.renderer) {
    resizeDashboardPreviewRenderer();
    initDashboardPreviewControls();
    return true;
  }

  previewScene.textContent = "";

  state.canvas = document.createElement("canvas");
  state.canvas.className = "dashboard-preview-canvas";
  state.canvas.setAttribute("aria-label", "Recent project 3D preview");

  previewScene.appendChild(state.canvas);

  state.scene = new THREE.Scene();
  state.objectGroup = new THREE.Group();
  state.scene.add(state.objectGroup);

  state.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
  state.camera.position.set(5, 4, 7);

  state.renderer = new THREE.WebGLRenderer({
    canvas: state.canvas,
    antialias: true,
    alpha: true
  });
  state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  if (typeof THREE.OrbitControls === "function") {
    state.controls = new THREE.OrbitControls(state.camera, state.canvas);
    state.controls.enableDamping = true;
    state.controls.dampingFactor = 0.08;
    state.controls.enableZoom = true;
    state.controls.enablePan = true;
    state.controls.screenSpacePanning = true;
  }

  addDashboardPreviewLights();

  state.grid = new THREE.GridHelper(16, 16, 0x355078, 0x1d263b);
  state.grid.position.y = -0.02;
  state.scene.add(state.grid);

  state.canvas.addEventListener("pointerdown", handleDashboardPreviewPointerDown);
  window.addEventListener("resize", resizeDashboardPreviewRenderer);

  resizeDashboardPreviewRenderer();
  initDashboardPreviewControls();
  setDashboardPreviewMode("pan");

  if (!state.isAnimating) {
    animateDashboardPreview();
  }

  return true;
}

function createDashboardPreviewMesh(savedObject, index) {
  const geometry = createDashboardPreviewGeometry(savedObject.type);
  const material = createDashboardPreviewMaterial(savedObject);
  const mesh = new THREE.Mesh(geometry, material);

  mesh.name = getDashboardObjectLabel(savedObject);
  mesh.userData.previewObjectIndex = index;
  mesh.userData.savedObject = savedObject;
  applyDashboardPreviewTransform(mesh, savedObject);

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
    box: box,
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
    state.camera.position.set(5, 4, 7);

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
  const viewDirection = new THREE.Vector3(1.25, 0.85, 1.35).normalize();
  const distance = Math.max(fitDistance * 1.55, 4);

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
  const previewScene = document.getElementById("dashboardPreviewScene");

  if (!previewScene || !ensureDashboardThreePreview()) {
    return;
  }

  clearDashboardPreviewMessage();
  clearDashboardThreeObjects();

  if (!Array.isArray(projectDesignData) || projectDesignData.length === 0) {
    window.dashboardPreviewObjects = [];
    window.dashboardPreviewSelectedObject = null;
    updateDashboardPreviewProperties(null);
    showDashboardPreviewMessage("No saved objects yet");
    fitDashboardPreviewView(null, true);
    updateDashboardPreviewControlAvailability();
    return;
  }

  const savedObjects = projectDesignData.filter(function (savedObject) {
    return savedObject && savedObject.type;
  });

  window.dashboardPreviewObjects = savedObjects;

  if (savedObjects.length === 0) {
    window.dashboardPreviewSelectedObject = null;
    updateDashboardPreviewProperties(null);
    showDashboardPreviewMessage("No previewable objects");
    fitDashboardPreviewView(null, true);
    updateDashboardPreviewControlAvailability();
    return;
  }

  savedObjects.forEach(function (savedObject, index) {
    const mesh = createDashboardPreviewMesh(savedObject, index);

    dashboardPreviewState.objects.push(mesh);
    dashboardPreviewState.objectGroup.add(mesh);
  });

  fitDashboardPreviewView(null, true);
  selectDashboardPreviewObject(0);
  updateDashboardPreviewControlAvailability();
}

function selectDashboardPreviewObject(index) {
  const state = dashboardPreviewState;

  if (!Array.isArray(window.dashboardPreviewObjects)) {
    return;
  }

  const selectedObject = window.dashboardPreviewObjects[index] || null;
  const selectedMesh = state.objects.find(function (mesh) {
    return mesh.userData.previewObjectIndex === index;
  }) || null;

  if (state.selectionHelper) {
    state.scene.remove(state.selectionHelper);
    state.selectionHelper = null;
  }

  if (selectedMesh) {
    state.selectionHelper = new THREE.BoxHelper(selectedMesh, 0x60a5fa);
    state.scene.add(state.selectionHelper);
  }

  state.selectedMesh = selectedMesh;
  window.dashboardPreviewSelectedObject = selectedObject;
  updateDashboardPreviewProperties(selectedObject);

  window.dispatchEvent(new CustomEvent("dashboard:preview-object-selected", {
    detail: {
      selectedObject: selectedObject,
      selectedIndex: index
    }
  }));
}

function handleDashboardPreviewPointerDown(event) {
  const state = dashboardPreviewState;

  if (!state.camera || !state.canvas || state.objects.length === 0) {
    return;
  }

  const rect = state.canvas.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -(((event.clientY - rect.top) / rect.height) * 2 - 1)
  );
  const raycaster = new THREE.Raycaster();

  raycaster.setFromCamera(pointer, state.camera);

  const selectedIntersection = raycaster.intersectObjects(state.objects, false)[0];

  if (selectedIntersection && selectedIntersection.object) {
    selectDashboardPreviewObject(selectedIntersection.object.userData.previewObjectIndex);
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
      state.controls.mouseButtons.LEFT = mode === "pan" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    }
  }

  if (panButton) {
    panButton.classList.toggle("active-preview-control", mode === "pan");
  }

  if (orbitButton) {
    orbitButton.classList.toggle("active-preview-control", mode === "orbit");
  }
}

function focusDashboardPreviewType(type) {
  const savedObjects = window.dashboardPreviewObjects || [];
  const objectIndex = savedObjects.findIndex(function (savedObject) {
    return savedObject && savedObject.type === type;
  });

  if (objectIndex === -1) {
    fitDashboardPreviewView(null, false);
    return;
  }

  selectDashboardPreviewObject(objectIndex);
  fitDashboardPreviewView(dashboardPreviewState.selectedMesh, false);
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
      gridButton.classList.toggle("active-preview-control", dashboardPreviewState.grid.visible);
    });
  }

  if (fitButton) {
    fitButton.addEventListener("click", function () {
      fitDashboardPreviewView(dashboardPreviewState.selectedMesh || null, false);
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